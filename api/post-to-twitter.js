// Twitter投稿API - api/post-to-twitter.js
export default async function handler(req, res) {
  // CORS対応
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
    const { text, apiKey, apiSecret, accessToken, accessTokenSecret } = req.body;

    // 入力検証
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        error: '投稿テキストが必要です',
        code: 'MISSING_TEXT'
      });
    }

    if (text.length > 280) {
      return res.status(400).json({
        error: '投稿テキストが長すぎます（280文字以内）',
        code: 'TEXT_TOO_LONG'
      });
    }

    // 認証確認
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: '認証が必要です',
        code: 'UNAUTHORIZED'
      });
    }

    const token = authHeader.substring(7);

    // プレミアムプランチェック
    const userPlan = await getUserPlan(token);
    if (userPlan !== 'premium') {
      return res.status(403).json({
        error: 'プレミアムプラン限定機能です',
        upgrade_required: true,
        code: 'PREMIUM_REQUIRED',
        message: 'Twitter投稿機能はプレミアムプランでご利用いただけます。今すぐアップグレードして無制限でSNS投稿を活用しましょう！'
      });
    }

    // Twitter API設定検証
    if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
      return res.status(400).json({
        error: 'Twitter API設定が不完全です',
        code: 'INCOMPLETE_TWITTER_CONFIG',
        message: 'すべてのTwitter API認証情報を設定してください',
        required: ['apiKey', 'apiSecret', 'accessToken', 'accessTokenSecret'],
        help_url: '/settings#twitter-api'
      });
    }

    // Twitter投稿実行
    const result = await postToTwitter({
      text: text.trim(),
      apiKey,
      apiSecret,
      accessToken,
      accessTokenSecret
    });

    // 投稿統計記録
    await recordPostStats('twitter', token);

    return res.status(200).json({
      success: true,
      message: 'Twitterに投稿しました！',
      tweet_id: result.tweet_id,
      tweet_url: `https://twitter.com/i/web/status/${result.tweet_id}`,
      posted_at: new Date().toISOString(),
      platform: 'twitter'
    });

  } catch (error) {
    console.error('Twitter post error:', error);

    // エラー種別に応じた適切なレスポンス
    if (error.code === 'TWITTER_API_ERROR') {
      return res.status(400).json({
        error: 'Twitter API エラー',
        message: error.message,
        code: 'TWITTER_API_ERROR',
        details: error.details,
        suggestion: 'Twitter API設定を確認してください'
      });
    }

    if (error.code === 'NETWORK_ERROR') {
      return res.status(503).json({
        error: 'ネットワークエラーが発生しました',
        message: 'インターネット接続を確認し、しばらく待ってから再試行してください',
        code: 'NETWORK_ERROR',
        retry_after: 30
      });
    }

    if (error.code === 'RATE_LIMIT_ERROR') {
      return res.status(429).json({
        error: 'Twitter API制限に達しました',
        message: 'しばらく待ってから再試行してください',
        code: 'RATE_LIMIT_ERROR',
        retry_after: 900 // 15分
      });
    }

    if (error.code === 'DUPLICATE_CONTENT') {
      return res.status(400).json({
        error: '重複する投稿です',
        message: 'この内容は既に投稿されています。内容を変更してください。',
        code: 'DUPLICATE_CONTENT'
      });
    }

    return res.status(500).json({
      error: '投稿処理でエラーが発生しました',
      message: 'しばらく待ってから再試行してください',
      code: 'INTERNAL_ERROR'
    });
  }
}

// プラン確認関数
async function getUserPlan(token) {
  try {
    // テスト用トークン
    if (token === 'test-premium-token' || token === 'premium-user-token') {
      return 'premium';
    }

    // 実際のプラン確認ロジック
    // 内部API呼び出しまたは直接DB確認
    const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/check-user-plan`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      return data.plan;
    }

    return 'free';
  } catch (error) {
    console.error('Plan check error:', error);
    return 'free'; // エラー時は安全側に倒す
  }
}

// Twitter投稿実行関数
async function postToTwitter({ text, apiKey, apiSecret, accessToken, accessTokenSecret }) {
  try {
    // Twitter API v2を使用した投稿
    const { TwitterApi } = require('twitter-api-v2');

    const client = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken: accessToken,
      accessSecret: accessTokenSecret,
    });

    // API接続テスト
    try {
      await client.v2.me();
    } catch (authError) {
      const error = new Error('Twitter API認証に失敗しました。API設定を確認してください。');
      error.code = 'TWITTER_API_ERROR';
      error.details = 'Authentication failed';
      throw error;
    }

    // ツイート投稿
    const tweet = await client.v2.tweet(text);

    return {
      tweet_id: tweet.data.id,
      success: true
    };

  } catch (error) {
    console.error('Twitter API call error:', error);

    // Twitter API特有のエラーハンドリング
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      const networkError = new Error('ネットワーク接続に失敗しました');
      networkError.code = 'NETWORK_ERROR';
      throw networkError;
    }

    // Twitter APIレスポンスエラー
    if (error.data && error.data.errors) {
      const twitterErrors = error.data.errors;
      const firstError = twitterErrors[0];

      // 重複投稿エラー
      if (firstError.code === 187) {
        const duplicateError = new Error('重複する投稿です');
        duplicateError.code = 'DUPLICATE_CONTENT';
        throw duplicateError;
      }

      // レート制限エラー
      if (firstError.code === 88 || firstError.code === 420) {
        const rateLimitError = new Error('Twitter API制限に達しました');
        rateLimitError.code = 'RATE_LIMIT_ERROR';
        throw rateLimitError;
      }

      // 一般的なTwitter APIエラー
      const twitterError = new Error(firstError.message || 'Twitter APIエラーが発生しました');
      twitterError.code = 'TWITTER_API_ERROR';
      twitterError.details = twitterErrors;
      throw twitterError;
    }

    // 認証エラー
    if (error.code === 401 || error.message.includes('Unauthorized')) {
      const authError = new Error('Twitter API認証エラー');
      authError.code = 'TWITTER_API_ERROR';
      authError.details = 'Invalid credentials';
      throw authError;
    }

    // 一般的なAPIエラー
    const apiError = new Error(`Twitter API呼び出しに失敗しました: ${error.message}`);
    apiError.code = 'TWITTER_API_ERROR';
    apiError.details = error.message;
    throw apiError;
  }
}

// 投稿統計記録
async function recordPostStats(platform, userToken) {
  try {
    // 統計記録のロジック
    // KVストレージまたはデータベースに記録
    const today = new Date().toISOString().split('T')[0];
    const statsKey = `post_stats:${platform}:${today}`;

    // 簡易統計記録（実装に応じて調整）
    console.log(`Post recorded: ${platform} at ${new Date().toISOString()}`);
  } catch (error) {
    console.error('Stats recording error:', error);
    // 統計記録失敗は投稿成功に影響させない
  }
}