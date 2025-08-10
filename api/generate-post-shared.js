// /api/generate-post-shared.js (完全修正版 v2)
// 制限システムの根本的な修正

export default async function handler(req, res) {
  console.log('🚀 Generate post shared API called');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, tone, userType = 'free' } = req.body;

    console.log('📝 Request:', { prompt, tone, userType });

    // 入力検証
    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'プロンプトが必要です' });
    }

    // クライアントIP取得
    const clientIP = getClientIP(req);
    console.log('🌐 Client IP detected:', clientIP);

    // 無料プランの制限チェック
    if (userType === 'free') {
      const limitCheck = await checkDailyLimitSafe(clientIP);
      console.log('🔍 Limit check result:', limitCheck);

      if (!limitCheck.allowed) {
        console.log('⛔ Daily limit exceeded');
        return res.status(429).json({
          error: '1日の無料生成回数（3回）を超えました',
          upgrade_required: true,
          usage: { remaining: 0 },
          next_reset: getNextResetTime()
        });
      }
    }

    // OpenAI API呼び出し
    console.log('🤖 Calling OpenAI API...');

    const startTime = Date.now();

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
- エンゲージメントを高める内容

重要：テーマに沿った内容で、読者が興味を持つような投稿を作成してください。`
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

    const generationTime = Date.now() - startTime;
    console.log(`🤖 OpenAI API response received in ${generationTime}ms`);

    if (!response.ok) {
      console.error('❌ OpenAI API error:', response.status, response.statusText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('📊 OpenAI usage:', data.usage);

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid OpenAI response format');
    }

    const generatedPost = data.choices[0].message.content.trim();
    console.log('✅ Post generated successfully');

    // 無料プランの場合は使用量を増加
    if (userType === 'free') {
      await incrementDailyUsageSafe(clientIP);
      console.log('📊 Usage incremented for IP:', clientIP);
    }

    // コスト追跡
    if (data.usage) {
      await trackCostSafe(data.usage);
    }

    // 品質評価
    const quality = evaluatePostQuality(generatedPost);

    // 最終的な使用量情報
    const usageInfo = userType === 'free'
      ? await getRemainingUsageSafe(clientIP)
      : { remaining: 'unlimited' };

    console.log('🎉 Request completed successfully:', {
      quality,
      usage: usageInfo,
      generationTime
    });

    return res.status(200).json({
      post: generatedPost,
      quality: quality,
      usage: usageInfo,
      shared_api: true,
      generation_time: generationTime
    });

  } catch (error) {
    console.error('❌ Generation error:', error);
    return res.status(500).json({
      error: '投稿生成に失敗しました',
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// 安全なIP取得
function getClientIP(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  const cfConnectingIp = req.headers['cf-connecting-ip'];

  let clientIP = 'unknown';

  if (forwardedFor) {
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

// 安全な制限チェック
async function checkDailyLimitSafe(clientIP) {
  const DAILY_LIMIT = 3;
  const today = new Date().toISOString().split('T')[0];
  const key = `daily_usage:${clientIP}:${today}`;

  try {
    const currentUsage = await getKVValueSafe(key);
    const usageCount = parseInt(currentUsage) || 0;

    console.log('🔍 Daily limit check:', {
      key,
      currentUsage,
      usageCount,
      limit: DAILY_LIMIT,
      allowed: usageCount < DAILY_LIMIT
    });

    return {
      allowed: usageCount < DAILY_LIMIT,
      current: usageCount,
      limit: DAILY_LIMIT,
      remaining: Math.max(0, DAILY_LIMIT - usageCount)
    };
  } catch (error) {
    console.error('❌ Limit check error:', error);
    // エラー時は安全側で許可
    return { allowed: true, error: error.message };
  }
}

// 安全な使用量増加
async function incrementDailyUsageSafe(clientIP) {
  const today = new Date().toISOString().split('T')[0];
  const key = `daily_usage:${clientIP}:${today}`;

  try {
    console.log('📊 Incrementing usage for key:', key);

    // 現在の値を取得
    const currentValue = await getKVValueSafe(key);
    const newValue = (parseInt(currentValue) || 0) + 1;

    // 新しい値を設定（TTL付き）
    await setKVValueSafe(key, newValue.toString(), 86400);

    console.log('📊 Usage incremented:', {
      key,
      oldValue: currentValue,
      newValue
    });

    return newValue;
  } catch (error) {
    console.error('❌ Usage increment error:', error);
    throw error;
  }
}

// 安全な残量取得
async function getRemainingUsageSafe(clientIP) {
  const DAILY_LIMIT = 3;
  const today = new Date().toISOString().split('T')[0];
  const key = `daily_usage:${clientIP}:${today}`;

  try {
    const usage = await getKVValueSafe(key);
    const usageCount = parseInt(usage) || 0;
    const remaining = Math.max(0, DAILY_LIMIT - usageCount);

    console.log('📊 Remaining usage:', {
      key,
      usage: usageCount,
      remaining
    });

    return {
      remaining,
      used: usageCount,
      limit: DAILY_LIMIT
    };
  } catch (error) {
    console.error('❌ Remaining usage error:', error);
    return { remaining: 'unknown', error: error.message };
  }
}

// 安全なKV取得
async function getKVValueSafe(key) {
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

// 安全なKV設定
async function setKVValueSafe(key, value, ttl = null) {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    throw new Error('KV environment variables not configured');
  }

  const command = ttl
    ? ['SETEX', key, ttl, value.toString()]
    : ['SET', key, value.toString()];

  const response = await fetch(process.env.KV_REST_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    throw new Error(`KV SET failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  return result.result;
}

// 安全なコスト追跡
async function trackCostSafe(usage) {
  const today = new Date().toISOString().split('T')[0];
  const key = `daily_cost:${today}`;

  try {
    // GPT-3.5-turbo料金計算
    const inputCost = (usage.prompt_tokens / 1000) * 0.0015;
    const outputCost = (usage.completion_tokens / 1000) * 0.002;
    const totalCost = inputCost + outputCost;

    // 現在のコストを取得
    const currentCost = await getKVValueSafe(key);
    const newCost = (parseFloat(currentCost) || 0) + totalCost;

    // 新しいコストを設定
    await setKVValueSafe(key, newCost.toString(), 86400);

    console.log('💰 Cost tracked:', {
      tokens: usage,
      cost: totalCost.toFixed(6),
      totalDailyCost: newCost.toFixed(6)
    });
  } catch (error) {
    console.error('❌ Cost tracking error:', error);
  }
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