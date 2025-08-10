// /api/generate-post-shared.js (修正版)
// Vercel Pro Plan対応・制限システム修正

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, tone, userType = 'free' } = req.body;

    // 入力検証
    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'プロンプトが必要です' });
    }

    // クライアントIP取得（修正版）
    const clientIP = getClientIP(req);
    console.log('🔍 Client IP:', clientIP);

    // 無料プランの制限チェック（修正版）
    if (userType === 'free') {
      const limitResult = await checkAndIncrementLimit(clientIP);

      if (!limitResult.allowed) {
        return res.status(429).json({
          error: '1日の無料生成回数（3回）を超えました',
          upgrade_required: true,
          usage: { remaining: 0 },
          next_reset: limitResult.nextReset
        });
      }

      console.log('🔍 Limit check passed:', limitResult);
    }

    // 全体コスト制限チェック
    const costOk = await checkCostLimit();
    if (!costOk) {
      return res.status(503).json({
        error: 'システム負荷のため一時的に利用できません',
        retry_after: '1 hour'
      });
    }

    // OpenAI API呼び出し
    console.log('🤖 Generating post with prompt:', prompt);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY_SHARED}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `あなたはSNS投稿のプロフェッショナルです。以下の条件で魅力的な投稿文を作成してください：

- トーン: ${tone}
- 文字数: 100-200文字程度
- 日本語で自然な表現
- 適切な絵文字を含める
- 関連するハッシュタグを2-3個追加
- エンゲージメントを高める内容`
          },
          {
            role: 'user',
            content: `テーマ: ${prompt}`
          }
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid OpenAI response format');
    }

    const generatedPost = data.choices[0].message.content.trim();

    // コスト追跡
    if (data.usage) {
      await trackCost(data.usage);
    }

    // 品質評価
    const quality = evaluatePostQuality(generatedPost);

    // 使用量情報取得（修正版）
    const usageInfo = userType === 'free'
      ? await getRemainingUsage(clientIP)
      : { remaining: 'unlimited' };

    console.log('✅ Generation successful:', {
      quality,
      usage: usageInfo,
      length: generatedPost.length
    });

    return res.status(200).json({
      post: generatedPost,
      quality: quality,
      usage: usageInfo,
      shared_api: true,
      generation_time: Date.now() - req.startTime || 0
    });

  } catch (error) {
    console.error('❌ Generation error:', error);
    return res.status(500).json({
      error: '投稿生成に失敗しました',
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// 修正版：IP取得関数
function getClientIP(req) {
  // Vercel Pro Planでの最適化されたIP取得
  const forwardedFor = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  const cfConnectingIp = req.headers['cf-connecting-ip'];

  let clientIP = 'unknown';

  if (forwardedFor) {
    // X-Forwarded-Forから最初の（実際の）IPを取得
    clientIP = forwardedFor.split(',')[0].trim();
  } else if (realIp) {
    clientIP = realIp.trim();
  } else if (cfConnectingIp) {
    clientIP = cfConnectingIp.trim();
  } else if (req.connection && req.connection.remoteAddress) {
    clientIP = req.connection.remoteAddress;
  }

  // IPv6のローカルアドレスを正規化
  if (clientIP === '::1' || clientIP === '::ffff:127.0.0.1') {
    clientIP = '127.0.0.1';
  }

  return clientIP;
}

// 修正版：制限チェック＆増加（アトミック操作）
async function checkAndIncrementLimit(clientIP) {
  const DAILY_LIMIT = 3;
  const today = new Date().toISOString().split('T')[0];
  const key = `daily_usage:${clientIP}:${today}`;

  try {
    // 現在の使用量取得
    const currentUsage = await getKVValue(key) || 0;
    const usageCount = parseInt(currentUsage);

    console.log('🔍 Current usage check:', {
      key,
      currentUsage,
      usageCount,
      limit: DAILY_LIMIT
    });

    // 制限チェック
    if (usageCount >= DAILY_LIMIT) {
      return {
        allowed: false,
        remaining: 0,
        nextReset: getNextResetTime()
      };
    }

    // 使用量増加（アトミック操作）
    const newUsage = await incrementKVValue(key, 1, 86400); // 24時間TTL

    console.log('📊 Usage incremented:', {
      key,
      oldUsage: usageCount,
      newUsage,
      remaining: Math.max(0, DAILY_LIMIT - newUsage)
    });

    return {
      allowed: true,
      remaining: Math.max(0, DAILY_LIMIT - newUsage),
      nextReset: getNextResetTime()
    };

  } catch (error) {
    console.error('❌ Limit check error:', error);
    // エラー時は安全側に倒して許可（ただしログに記録）
    return {
      allowed: true,
      remaining: 'unknown',
      error: error.message
    };
  }
}

// 修正版：残使用量取得
async function getRemainingUsage(clientIP) {
  const DAILY_LIMIT = 3;
  const today = new Date().toISOString().split('T')[0];
  const key = `daily_usage:${clientIP}:${today}`;

  try {
    const usage = await getKVValue(key) || 0;
    const usageCount = parseInt(usage);
    const remaining = Math.max(0, DAILY_LIMIT - usageCount);

    return {
      remaining,
      used: usageCount,
      limit: DAILY_LIMIT,
      resetTime: getNextResetTime()
    };
  } catch (error) {
    console.error('❌ Usage check error:', error);
    return {
      remaining: 'unknown',
      error: error.message
    };
  }
}

// KV操作関数（修正版）
async function getKVValue(key) {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    throw new Error('KV environment variables not configured');
  }

  const response = await fetch(process.env.KV_REST_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(['GET', key]),
  });

  if (!response.ok) {
    throw new Error(`KV GET failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  return result.result;
}

// 修正版：アトミックな増加操作
async function incrementKVValue(key, increment = 1, ttl = null) {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    throw new Error('KV environment variables not configured');
  }

  // INCR操作を使用してアトミックに増加
  const response = await fetch(process.env.KV_REST_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(['INCRBY', key, increment]),
  });

  if (!response.ok) {
    throw new Error(`KV INCR failed: ${response.status}`);
  }

  const result = await response.json();
  const newValue = result.result;

  // TTL設定（初回のみ）
  if (ttl && newValue === increment) {
    await fetch(process.env.KV_REST_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['EXPIRE', key, ttl]),
    });
  }

  return newValue;
}

// コスト制限チェック
async function checkCostLimit() {
  const COST_LIMIT = parseFloat(process.env.DAILY_COST_LIMIT) || 10;
  const today = new Date().toISOString().split('T')[0];
  const key = `daily_cost:${today}`;

  try {
    const cost = await getKVValue(key) || 0;
    return parseFloat(cost) < COST_LIMIT;
  } catch (error) {
    console.error('Cost check error:', error);
    return true; // エラー時は許可
  }
}

// コスト追跡
async function trackCost(usage) {
  const today = new Date().toISOString().split('T')[0];
  const key = `daily_cost:${today}`;

  try {
    // GPT-3.5-turbo料金計算
    const inputCost = (usage.prompt_tokens / 1000) * 0.0015;
    const outputCost = (usage.completion_tokens / 1000) * 0.002;
    const totalCost = inputCost + outputCost;

    await incrementKVValueFloat(key, totalCost, 86400);

    console.log('💰 Cost tracked:', {
      tokens: usage,
      cost: totalCost.toFixed(6)
    });
  } catch (error) {
    console.error('Cost tracking error:', error);
  }
}

// 浮動小数点数の増加
async function incrementKVValueFloat(key, increment, ttl = null) {
  const response = await fetch(process.env.KV_REST_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(['INCRBYFLOAT', key, increment]),
  });

  if (!response.ok) {
    throw new Error(`KV INCRBYFLOAT failed: ${response.status}`);
  }

  const result = await response.json();

  // TTL設定
  if (ttl) {
    await fetch(process.env.KV_REST_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['EXPIRE', key, ttl]),
    });
  }

  return result.result;
}

// 品質評価関数
function evaluatePostQuality(post) {
  let score = 50; // ベーススコア

  // 文字数チェック
  if (post.length >= 50 && post.length <= 280) score += 20;

  // 絵文字チェック
  if (/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(post)) {
    score += 10;
  }

  // ハッシュタグチェック
  const hashtagCount = (post.match(/#\w+/g) || []).length;
  if (hashtagCount >= 1 && hashtagCount <= 3) score += 15;

  // 日本語チェック
  if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(post)) score += 5;

  return Math.min(100, score);
}

// 次回リセット時間
function getNextResetTime() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}