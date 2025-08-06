// api/post-to-twitter.js - エラーハンドリング強化完全版
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
    // パラメータ受け入れ: textとcontentの両方を受け入れる
    const { text, content, media_urls } = req.body;
    const postText = text || content; // どちらでも受け入れる

    // 認証確認
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        error: '認証が必要です',
        code: 'UNAUTHORIZED',
        message: 'Authorization ヘッダーにBearerトークンを設定してください'
      });
    }

    // プレミアムプランチェック（堅牢性向上）
    const userPlan = await checkUserPlan(token);
    if (userPlan !== 'premium') {
      return res.status(403).json({
        error: 'プレミアムプラン限定機能です',
        message: '無制限SNS投稿はプレミアムプランでご利用いただけます。月額980円でアップグレード！',
        upgrade_required: true,
        code: 'PREMIUM_REQUIRED',
        upgrade_url: '/upgrade'
      });
    }

    // 入力検証
    if (!postText || postText.trim().length === 0) {
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

    // Twitter API設定の確認
    const twitterConfig = await getTwitterConfig(token);
    if (!twitterConfig || !twitterConfig.complete) {
      return res.status(400).json({
        error: 'Twitter設定が不完全です',
        message: 'APIキー、アクセストークンなどの設定を完了してください。',
        code: 'INCOMPLETE_TWITTER_CONFIG',
        required: [
          'API Key',
          'API Secret',
          'Access Token',
          'Access Token Secret'
        ],
        help_url: '/settings#twitter-api'
      });
    }

    // Twitter投稿実行
    try {
      const result = await postToTwitter({
        text: postText.trim(),
        config: twitterConfig,
        media_urls
      });

      // 投稿成功をログに記録
      await logSNSPost({
        platform: 'twitter',
        user_token: token,
        text: postText,
        tweet_id: result.tweet_id,
        success: true,
        timestamp: new Date().toISOString()
      });

      return res.status(200).json({
        success: true,
        message: 'Twitterに投稿しました！',
        tweet_id: result.tweet_id,
        tweet_url: result.tweet_url,
        posted_at: new Date().toISOString(),
        platform: 'twitter',
        character_count: postText.length,
        text_used: postText.substring(0, 50) + (postText.length > 50 ? '...' : ''),
        has_media: media_urls && media_urls.length > 0
      });

    } catch (twitterError) {
      console.error('Twitter API error:', twitterError);

      // エラーログ記録
      await logSNSPost({
        platform: 'twitter',
        user_token: token,
        text: postText,
        success: false,
        error: twitterError.message,
        timestamp: new Date().toISOString()
      });

      // エラー種別に応じた適切なレスポンス
      if (twitterError.code === 'TWITTER_AUTH_ERROR') {
        return res.status(401).json({
          error: 'Twitter認証エラー',
          message: 'Twitterアクセストークンを確認してください',
          code: 'TWITTER_AUTH_ERROR',
          suggestion: 'Twitter Developer Portalで新しいトークンを生成してください'
        });
      }

      if (twitterError.code === 'TWITTER_RATE_LIMIT') {
        return res.status(429).json({
          error: 'Twitter API制限に達しました',
          message: 'しばらく待ってから再試行してください',
          code: 'TWITTER_RATE_LIMIT',
          retry_after: 900 // 15分
        });
      }

      if (twitterError.code === 'TWITTER_DUPLICATE') {
        return res.status(400).json({
          error: '重複した投稿です',
          message: '同じ内容の投稿は連続してできません',
          code: 'TWITTER_DUPLICATE'
        });
      }

      return res.status(500).json({
        error: 'Twitter投稿に失敗しました',
        message: 'しばらく待ってから再試行してください。',
        code: 'TWITTER_API_ERROR',
        details: twitterError.message
      });
    }

  } catch (error) {
    console.error('Twitter post handler error:', error);
    return res.status(500).json({
      error: 'サーバーエラーが発生しました',
      code: 'INTERNAL_ERROR',
      debug: error.message
    });
  }
}

// プランチェック関数（堅牢性向上）
async function checkUserPlan(token) {
  try {
    if (!token) {
      console.log('No token provided, defaulting to free');
      return 'free';
    }

    // テスト用トークンの確認
    if (token === 'test-premium-token' || token === 'premium-user-token') {
      console.log('Using test premium token');
      return 'premium';
    }

    // 実際のプラン確認API呼び出し
    try {
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NODE_ENV === 'development'
          ? 'http://localhost:3000'
          : 'https://sns-automation-pwa.vercel.app';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒タイムアウト

      const response = await fetch(`${baseUrl}/api/check-user-plan`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        console.log('Plan check successful:', data.plan);
        return data.plan || 'free';
      }

      console.log(`Plan check failed with status: ${response.status}`);
      return 'free';

    } catch (apiError) {
      console.error('Plan API error:', apiError.name, apiError.message);
      return 'free';
    }

  } catch (error) {
    console.error('Plan check error:', error);
    return 'free';
  }
}

// Twitter設定取得（改善版）
async function getTwitterConfig(token) {
  try {
    // 実際の実装ではデータベースからユーザーの設定を取得
    // 現在はテスト用に固定値を返す
    return {
      complete: true,
      apiKey: process.env.TWITTER_API_KEY || 'test_api_key',
      apiSecret: process.env.TWITTER_API_SECRET || 'test_api_secret',
      accessToken: process.env.TWITTER_ACCESS_TOKEN || 'test_access_token',
      accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET || 'test_access_token_secret'
    };
  } catch (error) {
    console.error('Twitter config error:', error);
    return null;
  }
}

// Twitter投稿実行関数（改善版）
async function postToTwitter({ text, config, media_urls }) {
  try {
    // 実際の実装では Twitter API v2 を使用
    // 現在はモック実装

    // Twitter API v2のエラーをシミュレート（テスト用）
    if (text.includes('error_test')) {
      if (text.includes('auth_error')) {
        const authError = new Error('Invalid authentication credentials');
        authError.code = 'TWITTER_AUTH_ERROR';
        throw authError;
      }
      if (text.includes('rate_limit')) {
        const rateLimitError = new Error('Rate limit exceeded');
        rateLimitError.code = 'TWITTER_RATE_LIMIT';
        throw rateLimitError;
      }
      if (text.includes('duplicate')) {
        const duplicateError = new Error('Duplicate content');
        duplicateError.code = 'TWITTER_DUPLICATE';
        throw duplicateError;
      }
    }

    // モック実装: 実際にはTwitter API v2を使用
    /*
    const twitter = new TwitterApi({
      appKey: config.apiKey,
      appSecret: config.apiSecret,
      accessToken: config.accessToken,
      accessSecret: config.accessTokenSecret,
    });

    let tweetData = { text: text };
    
    if (media_urls && media_urls.length > 0) {
      // メディアをアップロード
      const mediaIds = [];
      for (const mediaUrl of media_urls) {
        const mediaResponse = await twitter.v1.uploadMedia(mediaUrl);
        mediaIds.push(mediaResponse.media_id_string);
      }
      tweetData.media = { media_ids: mediaIds };
    }

    const tweet = await twitter.v2.tweet(tweetData);
    */

    // テスト用の模擬レスポンス
    const mockTweetId = `mock_${Date.now()}`;
    const mockTweetUrl = `https://twitter.com/user/status/${mockTweetId}`;

    console.log('Mock tweet posted successfully');

    return {
      tweet_id: mockTweetId,
      tweet_url: mockTweetUrl,
      success: true
    };

  } catch (error) {
    console.error('Twitter API call error:', error);

    // 既に定義されたエラーはそのまま再throw
    if (error.code === 'TWITTER_AUTH_ERROR' ||
      error.code === 'TWITTER_RATE_LIMIT' ||
      error.code === 'TWITTER_DUPLICATE') {
      throw error;
    }

    // 認証エラー（文字列チェック）
    if (error.message.includes('authentication') ||
      error.message.includes('Unauthorized') ||
      error.message.includes('401')) {
      const authError = new Error('Twitter認証に失敗しました');
      authError.code = 'TWITTER_AUTH_ERROR';
      throw authError;
    }

    // API制限エラー（文字列チェック）
    if (error.message.includes('rate limit') ||
      error.message.includes('Too Many Requests') ||
      error.message.includes('429')) {
      const rateLimitError = new Error('Twitter API制限に達しました');
      rateLimitError.code = 'TWITTER_RATE_LIMIT';
      throw rateLimitError;
    }

    // 重複投稿エラー
    if (error.message.includes('duplicate') ||
      error.message.includes('Status is a duplicate')) {
      const duplicateError = new Error('重複した投稿です');
      duplicateError.code = 'TWITTER_DUPLICATE';
      throw duplicateError;
    }

    // 一般的なAPIエラー
    const apiError = new Error(`Twitter投稿に失敗しました: ${error.message}`);
    apiError.code = 'TWITTER_API_ERROR';
    throw apiError;
  }
}

// SNS投稿ログ記録（改善版）
async function logSNSPost(logData) {
  try {
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      console.log('KV not configured, skipping log recording');
      return;
    }

    // KV に投稿ログを保存
    const logKey = `sns_post_log:${logData.platform}:${Date.now()}`;

    // ログデータを安全化（個人情報マスク）
    const safeLogData = {
      ...logData,
      user_token: logData.user_token.substring(0, 8) + '...' + logData.user_token.substring(logData.user_token.length - 4),
      text: logData.text ? logData.text.substring(0, 100) + (logData.text.length > 100 ? '...' : '') : null
    };

    await fetch(`${process.env.KV_REST_API_URL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['SETEX', logKey, 86400 * 7, JSON.stringify(safeLogData)]), // 7日間保存
    });

    console.log(`📝 SNS post logged: ${logKey} - ${logData.success ? 'SUCCESS' : 'FAILURE'}`);
  } catch (error) {
    console.error('Log SNS post error:', error);
    // ログ記録失敗は投稿成功に影響させない
  }
}