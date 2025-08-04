// api/generate-post.js - Phase 2完全版（高速化・プレミアム統合）

// Upstash Redis REST API connection
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

// プレミアム用高速設定
const PREMIUM_CONFIG = {
  model: 'gpt-3.5-turbo',
  max_tokens: 300,
  temperature: 0.7,
  timeout: 8000, // 8秒タイムアウト
  retry_attempts: 2
};

// 無料版用設定
const FREE_CONFIG = {
  model: 'gpt-3.5-turbo',
  max_tokens: 250,
  temperature: 0.8,
  timeout: 15000, // 15秒タイムアウト
  retry_attempts: 1
};

const DAILY_LIMIT = 3;

// KVクライアント関数群
async function getKVValue(key) {
  try {
    const response = await fetch(`${REDIS_URL}/get/${key}`, {
      headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
    });
    return response.ok ? (await response.json()).result : null;
  } catch (error) {
    console.error('KV GET error:', error);
    return null;
  }
}

async function setKVValue(key, value, ttl = null) {
  try {
    const url = ttl ? `${REDIS_URL}/setex/${key}/${ttl}` : `${REDIS_URL}/set/${key}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ value: value.toString() })
    });
    return response.ok;
  } catch (error) {
    console.error('KV SET error:', error);
    return false;
  }
}

async function incrKVValue(key) {
  try {
    const response = await fetch(`${REDIS_URL}/incr/${key}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
    });
    return response.ok ? (await response.json()).result : null;
  } catch (error) {
    console.error('KV INCR error:', error);
    return null;
  }
}

async function incrByFloatKVValue(key, increment) {
  try {
    const response = await fetch(`${REDIS_URL}/incrbyfloat/${key}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ increment })
    });
    return response.ok ? parseFloat((await response.json()).result) : null;
  } catch (error) {
    console.error('KV INCRBYFLOAT error:', error);
    return null;
  }
}

// レート制限チェック（無料プラン用）
async function checkRateLimit(clientIP) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const key = `rate_limit:${clientIP}:${today}`;

    const currentUsage = parseInt(await getKVValue(key)) || 0;

    return {
      allowed: currentUsage < DAILY_LIMIT,
      remaining: Math.max(0, DAILY_LIMIT - currentUsage),
      currentUsage: currentUsage
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    return { allowed: true, remaining: DAILY_LIMIT, currentUsage: 0 };
  }
}

// レート制限更新（無料プラン用）
async function updateRateLimit(clientIP) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const key = `rate_limit:${clientIP}:${today}`;

    const newUsage = await incrKVValue(key);

    if (newUsage === 1) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const ttlSeconds = Math.floor((tomorrow.getTime() - Date.now()) / 1000);

      await fetch(`${REDIS_URL}/expire/${key}/${ttlSeconds}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
      });
    }

    return { usage: newUsage, remaining: Math.max(0, DAILY_LIMIT - newUsage) };
  } catch (error) {
    console.error('Rate limit update error:', error);
    return { usage: 1, remaining: DAILY_LIMIT - 1 };
  }
}

// ユーザーID取得（認証から）
function getUserId(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  try {
    const token = authHeader.split(' ')[1];
    // 簡易実装：実際はJWT decode
    return 'user_' + Math.random().toString(36).substr(2, 9);
  } catch {
    return null;
  }
}

// ユーザープラン取得
async function getUserPlan(userId) {
  if (!userId) return 'free';

  try {
    const plan = await getKVValue(`user_plan:${userId}`);
    return plan || 'free';
  } catch {
    return 'free';
  }
}

// 最適化された生成関数
async function generateWithOptimization(prompt, tone, platform, config, isPremium) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeout);

  try {
    // プレミアム用の最適化されたプロンプト
    const systemPrompt = isPremium
      ? `あなたは最高品質の${platform}向けSNS投稿生成AIです。以下の要件で投稿を生成してください：
         - トーン: ${tone}
         - プラットフォーム: ${platform}
         - 魅力的で engagement の高い内容
         - 適切な絵文字とハッシュタグ
         - ${platform === 'Twitter' ? '280文字以内' : '150-300文字の最適な長さ'}
         - 日本語での自然で人間らしい表現
         - エンゲージメント最大化要素を含む`
      : `あなたは${platform}向けの優秀なSNS投稿生成AIです。
         重要：必ず日本語で投稿を生成してください。英語は使用しないでください。
         
         以下の条件で投稿を生成してください：
         - トーン: ${tone}
         - プラットフォーム: ${platform}
         - 文字数制限: ${platform === 'Twitter' ? '280文字以内' : '適切な長さ'}
         - エンゲージメントを最大化する内容
         - ハッシュタグを適切に含める
         - 自然で人間らしい文章
         
         投稿内容のみを返してください。説明文は不要です。`;

    for (let attempt = 0; attempt < config.retry_attempts; attempt++) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: config.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt }
            ],
            max_tokens: config.max_tokens,
            temperature: config.temperature,
            ...(isPremium && {
              presence_penalty: 0.1,
              frequency_penalty: 0.1,
              top_p: 0.9
            })
          }),
          signal: controller.signal
        });

        if (!response.ok) {
          if (attempt < config.retry_attempts - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            continue;
          }
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.choices || !data.choices[0]) {
          throw new Error('Invalid OpenAI API response');
        }

        return data.choices[0].message.content.trim();

      } catch (error) {
        if (error.name === 'AbortError') {
          throw new Error('TimeoutError');
        }

        if (attempt < config.retry_attempts - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
          continue;
        }

        throw error;
      }
    }

  } finally {
    clearTimeout(timeoutId);
  }
}

// プレミアム使用統計記録
async function recordPremiumUsage(userId, generationTime, quality) {
  const today = new Date().toISOString().split('T')[0];
  const usageKey = `premium_usage:${userId}:${today}`;

  try {
    const currentUsage = await getKVValue(usageKey);
    const usage = currentUsage ? JSON.parse(currentUsage) : { count: 0, total_time: 0, avg_quality: 0 };

    const newCount = usage.count + 1;
    const newTotalTime = usage.total_time + generationTime;
    const newAvgQuality = ((usage.avg_quality * usage.count) + quality) / newCount;

    const updatedUsage = {
      count: newCount,
      total_time: newTotalTime,
      avg_quality: Math.round(newAvgQuality),
      last_generation: new Date().toISOString()
    };

    await setKVValue(usageKey, JSON.stringify(updatedUsage), 86400);
    return updatedUsage;
  } catch (error) {
    console.error('Premium usage recording error:', error);
    return null;
  }
}

// 投稿品質評価関数（拡張版）
function evaluatePostQuality(post, platform) {
  let score = 0;
  let grade = 'D';

  // 文字数チェック
  const length = post.length;
  if (platform === 'Twitter' && length <= 280 && length >= 50) score += 25;
  else if (platform !== 'Twitter' && length >= 50 && length <= 350) score += 25;
  else if (length > 10) score += 10;

  // ハッシュタグ存在チェック
  if (post.includes('#')) score += 20;

  // 絵文字の存在
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  if (emojiRegex.test(post)) score += 15;

  // エンゲージメント要素チェック
  const engagementWords = ['？', '！', 'どう思う', 'みなさん', 'シェア', 'RT', 'いいね', 'コメント'];
  if (engagementWords.some(word => post.includes(word))) score += 20;

  // 自然さチェック（改良版）
  if (!post.includes('AI') && !post.includes('bot') && /[。！？\.\!\?]/.test(post)) score += 15;

  // 改行による読みやすさ
  if (post.includes('\n') && post.split('\n').length > 1) score += 5;

  // グレード決定
  if (score >= 90) grade = 'A';
  else if (score >= 75) grade = 'B';
  else if (score >= 60) grade = 'C';

  return {
    grade,
    score,
    feedback: generateQualityFeedback(score, platform)
  };
}

function generateQualityFeedback(score, platform) {
  if (score >= 90) return '🏆 完璧な投稿です！高いエンゲージメントが期待できます。';
  if (score >= 75) return '✨ 良い投稿です。若干の調整でさらに良くなります。';
  if (score >= 60) return '📝 標準的な投稿です。ハッシュタグや呼びかけを追加してみてください。';
  return '🔧 改善の余地があります。プレミアムプランでより高品質な生成を！';
}

function getNextResetTime() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

export default async function handler(req, res) {
  // CORS対応
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, tone, platform = 'Twitter', userType = 'free', priority = 'normal' } = req.body;
    const userId = getUserId(req);
    const startTime = Date.now();

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'プロンプトが必要です' });
    }

    // プレミアムプラン確認
    const userPlan = await getUserPlan(userId);
    const isPremium = userPlan === 'premium' || userType === 'premium';

    // フリープランのレート制限チェック
    if (!isPremium) {
      const clientIP = req.headers['x-forwarded-for']?.split(',')[0] ||
        req.headers['x-real-ip'] ||
        req.connection.remoteAddress;

      const rateLimitCheck = await checkRateLimit(clientIP);

      if (!rateLimitCheck.allowed) {
        return res.status(429).json({
          error: 'Daily limit exceeded',
          message: '無料プランは1日3回まで生成可能です。プレミアムプランで無制限生成を！',
          remainingUses: 0,
          resetTime: getNextResetTime(),
          upgrade_required: true
        });
      }
    }

    // 設定選択
    const config = isPremium ? PREMIUM_CONFIG : FREE_CONFIG;

    // OpenAI API呼び出し（最適化版）
    const generatedPost = await generateWithOptimization(prompt, tone, platform, config, isPremium);

    const endTime = Date.now();
    const generationTime = endTime - startTime;

    // 品質評価
    const quality = evaluatePostQuality(generatedPost, platform);

    // 使用量更新・統計記録
    let updatedUsage = null;
    let premiumStats = null;

    if (isPremium && userId) {
      premiumStats = await recordPremiumUsage(userId, generationTime, quality.score);
    } else {
      const clientIP = req.headers['x-forwarded-for']?.split(',')[0] ||
        req.headers['x-real-ip'] ||
        req.connection.remoteAddress;
      updatedUsage = await updateRateLimit(clientIP);
    }

    // レスポンス返却
    const result = {
      post: generatedPost,
      quality: quality.score,
      qualityGrade: quality.grade,
      qualityFeedback: quality.feedback,
      usage: isPremium ?
        { remaining: 'unlimited' } :
        { remaining: updatedUsage ? updatedUsage.remaining : 0 },
      timestamp: new Date().toISOString(),
      plan: isPremium ? 'premium' : 'free',
      generation_time: generationTime,
      optimized: isPremium,
      ...(isPremium && {
        stats: {
          response_time: `${generationTime}ms`,
          priority: priority === 'high' ? '高速処理' : '通常処理',
          daily_count: premiumStats ? premiumStats.count : 1
        }
      })
    };

    res.status(200).json(result);

  } catch (error) {
    console.error('API Error:', error);

    // エラー種別による適切な応答
    if (error.message === 'TimeoutError') {
      return res.status(408).json({
        error: 'Request timeout',
        message: 'リクエストがタイムアウトしました。しばらく待ってから再試行してください。',
        retry_suggested: true
      });
    }

    if (error.message.includes('API error: 429')) {
      return res.status(429).json({
        error: 'API rate limit',
        message: 'API制限に達しました。しばらく待ってから再試行してください。',
        retry_after: 60
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: '投稿生成中にエラーが発生しました。しばらく待ってから再試行してください。',
      fallback_message: isPremium ? 'プレミアムサポートにお問い合わせください' : '個人APIキーの設定をお試しください'
    });
  }
}
