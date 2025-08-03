// 開発者APIキー使用版の投稿生成API
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN,
});

const DAILY_LIMIT = 3;
const COST_LIMIT = parseFloat(process.env.DAILY_COST_LIMIT) || 10;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, tone, userType = 'free' } = req.body;
    const clientIP = getClientIP(req);

    // 無料プランの制限チェック
    if (userType === 'free') {
      const allowed = await checkDailyLimit(clientIP);
      if (!allowed) {
        return res.status(429).json({
          error: '1日の無料生成回数を超えました',
          upgrade_required: true,
          remaining: 0
        });
      }
    }

    // 全体コスト制限チェック
    const costOk = await checkCostLimit();
    if (!costOk) {
      return res.status(503).json({
        error: 'システム負荷のため一時的に利用できません',
        retry_after: '1 hour'
      });
    }

    // OpenAI API呼び出し（開発者キー使用）
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
            content: `SNS投稿文を日本語で生成してください。トーン: ${tone}`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    const generatedPost = data.choices[0].message.content.trim();

    // 使用量・コスト記録
    if (userType === 'free') {
      await incrementDailyUsage(clientIP);
    }
    await trackCost(data.usage);

    // 品質評価（既存関数）
    const quality = evaluatePostQuality(generatedPost);

    return res.status(200).json({
      post: generatedPost,
      quality: quality,
      usage: userType === 'free' ? await getRemainingUsage(clientIP) : { remaining: 'unlimited' },
      shared_api: true
    });

  } catch (error) {
    console.error('Shared API error:', error);
    return res.status(500).json({
      error: '投稿生成に失敗しました',
      fallback_message: '個人APIキーの設定をお試しください'
    });
  }
}

// ヘルパー関数
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] ||
    req.headers['x-real-ip'] ||
    req.connection.remoteAddress;
}

async function checkDailyLimit(clientIP) {
  const today = new Date().toISOString().split('T')[0];
  const key = `daily_usage:${clientIP}:${today}`;
  const usage = await redis.get(key) || 0;
  return parseInt(usage) < DAILY_LIMIT;
}

async function incrementDailyUsage(clientIP) {
  const today = new Date().toISOString().split('T')[0];
  const key = `daily_usage:${clientIP}:${today}`;
  await redis.incr(key);
  await redis.expire(key, 86400); // 24時間で自動削除
}

async function getRemainingUsage(clientIP) {
  const today = new Date().toISOString().split('T')[0];
  const key = `daily_usage:${clientIP}:${today}`;
  const usage = await redis.get(key) || 0;
  return { remaining: Math.max(0, DAILY_LIMIT - parseInt(usage)) };
}

async function checkCostLimit() {
  const today = new Date().toISOString().split('T')[0];
  const key = `daily_cost:${today}`;
  const cost = await redis.get(key) || 0;
  return parseFloat(cost) < COST_LIMIT;
}

async function trackCost(usage) {
  const today = new Date().toISOString().split('T')[0];
  const key = `daily_cost:${today}`;

  // GPT-3.5-turbo料金計算
  const inputCost = (usage.prompt_tokens / 1000) * 0.0015;
  const outputCost = (usage.completion_tokens / 1000) * 0.002;
  const totalCost = inputCost + outputCost;

  await redis.incrbyfloat(key, totalCost);
  await redis.expire(key, 86400);
}


function evaluatePostQuality(post) {
  let score = 75; // 基本スコア
  let grade = 'B';

  if (post.length > 50 && post.length < 280) score += 10;
  if (post.includes('？') || post.includes('！')) score += 10;
  if (post.includes('#')) score += 5;

  if (score >= 90) grade = 'A';
  else if (score >= 75) grade = 'B';
  else if (score >= 60) grade = 'C';
  else grade = 'D';

  return {
    grade,
    score,
    feedback: `品質スコア: ${score}点`
  };
}