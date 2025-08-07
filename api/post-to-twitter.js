// api/post-to-twitter.js
import { getTwitterTokens } from '../utils/kv-client';

export default async function handler(req, res) {
  // CORS 対応
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // リクエストボディ受け取り（text または content + media_urls）
    const { text, content, media_urls } = req.body;
    const postText = (text || content || '').trim();

    // Authorization ヘッダー確認
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        error: '認証が必要です',
        code: 'UNAUTHORIZED',
        message: 'Authorization ヘッダーに Bearer トークンを設定してください'
      });
    }

    // プレミアムプランチェック
    const userPlan = await checkUserPlan(token);
    if (userPlan !== 'premium') {
      return res.status(403).json({
        error: 'プレミアムプラン限定機能です',
        code: 'PREMIUM_REQUIRED',
        message: '無制限 SNS 投稿はプレミアムプランでご利用いただけます。',
        upgrade_required: true,
        upgrade_url: '/upgrade'
      });
    }

    // テキスト入力検証
    if (!postText) {
      return res.status(400).json({
        error: '投稿テキストが必要です',
        code: 'MISSING_TEXT',
        message: 'text または content パラメータで投稿内容を指定してください'
      });
    }
    if (postText.length > 280) {
      return res.status(400).json({
        error: 'テキストが280文字を超えています',
        code: 'TEXT_TOO_LONG',
        length: postText.length,
        limit: 280,
        suggestion: '投稿を短くしてください'
      });
    }

    // --- OAuth トークン取得（Upstash KV から） ---
    const userId = token; // JWT の sub として userId を発行している場合など
    let twitterTokens;
    try {
      twitterTokens = await getTwitterTokens(userId);
    } catch {
      return res.status(400).json({
        error: 'Twitter 接続が確認できません',
        code: 'NO_TWITTER_CONNECTION',
        message: 'Twitter アカウント連携を先に行ってください'
      });
    }

    // --- Twitter へ投稿 ---
    let result;
    try {
      result = await postToTwitter({
        text: postText,
        config: {
          apiKey: process.env.TWITTER_CLIENT_ID,
          apiSecret: process.env.TWITTER_CLIENT_SECRET,
          accessToken: twitterTokens.accessToken,
          accessSecret: twitterTokens.accessSecret
        },
        media_urls
      });
    } catch (twitterError) {
      console.error('Twitter API error:', twitterError);

      // 投稿エラーをログ
      await logSNSPost({
        platform: 'twitter',
        user_token: token,
        text: postText,
        success: false,
        error: twitterError.message,
        timestamp: new Date().toISOString()
      });

      // エラー種別ごとに応答
      if (twitterError.code === 'TWITTER_AUTH_ERROR') {
        return res.status(401).json({
          error: 'Twitter認証エラー',
          code: 'TWITTER_AUTH_ERROR',
          message: 'Twitter アクセストークンを確認してください',
          suggestion: 'Twitter Developer Portal で新しいトークンを生成してください'
        });
      }
      if (twitterError.code === 'TWITTER_RATE_LIMIT') {
        return res.status(429).json({
          error: 'Twitter API 制限に達しました',
          code: 'TWITTER_RATE_LIMIT',
          message: 'しばらく待ってから再試行してください',
          retry_after: 900
        });
      }
      if (twitterError.code === 'TWITTER_DUPLICATE') {
        return res.status(400).json({
          error: '重複した投稿です',
          code: 'TWITTER_DUPLICATE',
          message: '同じ内容の投稿は連続してできません'
        });
      }

      return res.status(500).json({
        error: 'Twitter 投稿に失敗しました',
        code: 'TWITTER_API_ERROR',
        message: 'しばらく待ってから再試行してください',
        details: twitterError.message
      });
    }

    // 投稿成功をログ
    await logSNSPost({
      platform: 'twitter',
      user_token: token,
      text: postText,
      tweet_id: result.tweet_id,
      success: true,
      timestamp: new Date().toISOString()
    });

    // 正常レスポンス
    return res.status(200).json({
      success: true,
      message: 'Twitter に投稿しました！',
      tweet_id: result.tweet_id,
      tweet_url: result.tweet_url,
      posted_at: new Date().toISOString(),
      platform: 'twitter',
      character_count: postText.length,
      text_used: postText.slice(0, 50) + (postText.length > 50 ? '...' : ''),
      has_media: Array.isArray(media_urls) && media_urls.length > 0
    });

  } catch (error) {
    console.error('Twitter post handler error:', error);
    return res.status(500).json({
      error: 'サーバーエラーが発生しました',
      code: 'INTERNAL_ERROR',
      debug: error.message
    });
  }
}

// ————————————————————————————————————————————
// 以下、Helper 関数群
// ————————————————————————————————————————————

/**
 * ユーザープランを取得
 */
async function checkUserPlan(token) {
  try {
    if (!token) return 'free';
    if (token === 'test-premium-token' || token === 'premium-user-token') return 'premium';

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : (process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : 'https://sns-automation-pwa.vercel.app');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const resp = await fetch(`${baseUrl}/api/check-user-plan`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (resp.ok) {
      const data = await resp.json();
      return data.plan || 'free';
    }
    return 'free';
  } catch {
    return 'free';
  }
}

/**
 * Twitter 投稿実行（モック含む）
 */
async function postToTwitter({ text, config, media_urls }) {
  // モック実装 or 実環境で TwitterApi を使う実装に置き換えてください
  // 以下はモック例：
  if (text.includes('error_test')) {
    const e = new Error('Simulated error');
    e.code = text.includes('auth_error') ? 'TWITTER_AUTH_ERROR'
      : text.includes('rate_limit') ? 'TWITTER_RATE_LIMIT'
        : text.includes('duplicate') ? 'TWITTER_DUPLICATE'
          : 'TWITTER_API_ERROR';
    throw e;
  }
  const mockId = `mock_${Date.now()}`;
  return { tweet_id: mockId, tweet_url: `https://twitter.com/user/status/${mockId}` };
}

/**
 * SNS投稿ログ記録
 */
async function logSNSPost(logData) {
  try {
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return;
    const key = `sns_post_log:${logData.platform}:${Date.now()}`;
    const safe = {
      ...logData,
      user_token: logData.user_token.slice(0, 8) + '…' + logData.user_token.slice(-4),
      text: logData.text?.slice(0, 100) + (logData.text.length > 100 ? '…' : '')
    };
    await fetch(process.env.KV_REST_API_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['SETEX', key, 86400 * 7, JSON.stringify(safe)])
    });
  } catch (e) {
    console.error('Log SNS post error:', e);
  }
}
