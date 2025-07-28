// Upstash Redis connection using environment variables
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Simple rate limiting using Upstash Redis
const DAILY_LIMIT = 3;

async function checkRateLimit(clientIP) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const key = `rate_limit:${clientIP}:${today}`;
    
    const response = await fetch(`${REDIS_URL}/get/${key}`, {
      headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
    });
    
    const currentUsage = response.ok ? parseInt((await response.json()).result) || 0 : 0;
    
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

async function updateRateLimit(clientIP) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const key = `rate_limit:${clientIP}:${today}`;
    
    const response = await fetch(`${REDIS_URL}/incr/${key}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      const newUsage = data.result;
      
      // Set TTL for first usage (expire at end of day)
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
    }
  } catch (error) {
    console.error('Rate limit update error:', error);
  }
  return { usage: 1, remaining: DAILY_LIMIT - 1 };
}

export default async function handler(req, res) {
  // CORS対応
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, tone, platform, userType = 'free' } = req.body;

    // フリープランのレート制限チェック
    if (userType === 'free') {
      const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      const rateLimitCheck = await checkRateLimit(clientIP);
      
      if (!rateLimitCheck.allowed) {
        return res.status(429).json({
          error: 'Daily limit exceeded',
          message: '無料プランは1日3回まで生成可能です。プレミアムプランで無制限生成を！',
          remainingUses: 0,
          resetTime: getNextResetTime()
        });
      }
    }

    // OpenAI API呼び出し
    const systemPrompt = `あなたは${platform}向けの優秀なSNS投稿生成AIです。

以下の条件で投稿を生成してください：
- トーン: ${tone}
- プラットフォーム: ${platform}
- 文字数制限: ${platform === 'Twitter' ? '280文字以内' : '適切な長さ'}
- エンゲージメントを最大化する内容
- ハッシュタグを適切に含める
- 自然で人間らしい文章

投稿内容のみを返してください。説明文は不要です。`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedPost = data.choices[0].message.content.trim();

    // 品質評価（簡易版）
    const quality = evaluatePostQuality(generatedPost, platform);

    // レート制限更新（フリープランのみ）
    let updatedUsage = null;
    if (userType === 'free') {
      const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      updatedUsage = await updateRateLimit(clientIP);
    }

    // レスポンス返却
    const result = {
      post: generatedPost,
      quality: quality,
      usage: userType === 'free' ? {
        remaining: updatedUsage ? updatedUsage.remaining : 'unlimited'
      } : { remaining: 'unlimited' },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(result);

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: '投稿生成中にエラーが発生しました。しばらく待ってから再試行してください。'
    });
  }
}

// 投稿品質評価関数
function evaluatePostQuality(post, platform) {
  let score = 0;
  let grade = 'D';

  // 文字数チェック
  if (platform === 'Twitter' && post.length <= 280) score += 25;
  else if (platform !== 'Twitter' && post.length > 10) score += 25;

  // ハッシュタグ存在チェック
  if (post.includes('#')) score += 25;

  // エンゲージメント要素チェック
  const engagementWords = ['？', '！', 'どう思う', 'みなさん', 'シェア', 'RT', 'いいね'];
  if (engagementWords.some(word => post.includes(word))) score += 25;

  // 自然さチェック（簡易）
  if (!post.includes('AI') && !post.includes('bot')) score += 25;

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
  if (score >= 90) return '完璧な投稿です！エンゲージメントが期待できます。';
  if (score >= 75) return '良い投稿です。若干の調整でさらに良くなります。';
  if (score >= 60) return '標準的な投稿です。ハッシュタグや呼びかけを追加してみてください。';
  return '改善の余地があります。プレミアムプランでより高品質な生成を！';
}

// ヘルパー関数：次のリセット時間を計算
function getNextResetTime() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}
