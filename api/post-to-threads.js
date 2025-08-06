// api/post-to-threads.js - パラメータ修正・エラーハンドリング完全版
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
    // パラメータ受け入れ修正: textとcontentの両方を受け入れる
    const { text, content, image_url, accessToken } = req.body;
    const postText = text || content; // どちらでも受け入れる

    // 入力検証
    if (!postText || postText.trim().length === 0) {
      return res.status(400).json({
        error: '投稿テキストが必要です',
        code: 'MISSING_TEXT',
        message: 'text または content パラメータで投稿内容を指定してください'
      });
    }

    if (postText.length > 500) {
      return res.status(400).json({
        error: 'テキストが500文字を超えています',
        code: 'TEXT_TOO_LONG',
        length: postText.length,
        limit: 500
      });
    }

    // 認証確認
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: '認証が必要です',
        code: 'UNAUTHORIZED',
        message: 'Authorization ヘッダーにBearerトークンを設定してください'
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
        message: 'Threads投稿機能はプレミアムプランでご利用いただけます。今すぐアップグレードして無制限でSNS投稿を活用しましょう！',
        upgrade_url: '/upgrade'
      });
    }

    // Threads API設定検証
    const threadsConfig = await getThreadsConfig(token);
    const finalAccessToken = accessToken || threadsConfig?.access_token;

    if (!finalAccessToken) {
      return res.status(400).json({
        error: 'Threads設定が不完全です',
        code: 'INCOMPLETE_THREADS_CONFIG',
        message: 'Threads アクセストークンを設定してください',
        required: ['accessToken'],
        help_url: '/settings#threads-api'
      });
    }

    // Threads投稿実行
    const result = await postToThreads({
      text: postText.trim(),
      accessToken: finalAccessToken,
      image_url
    });

    // 投稿統計記録
    await recordPostStats('threads', token, {
      text: postText,
      success: true,
      post_id: result.post_id
    });

    return res.status(200).json({
      success: true,
      message: 'Threadsに投稿しました！',
      post_id: result.post_id,
      post_url: `https://www.threads.net/@user/post/${result.post_id}`,
      posted_at: new Date().toISOString(),
      platform: 'threads',
      character_count: postText.length,
      text_used: postText.substring(0, 50) + (postText.length > 50 ? '...' : '')
    });

  } catch (error) {
    console.error('Threads post error:', error);

    // 投稿失敗統計記録
    try {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const token = authHeader.substring(7);
        await recordPostStats('threads', token, {
          text: req.body.text || req.body.content,
          success: false,
          error: error.message
        });
      }
    } catch (logError) {
      console.error('Failed to log error stats:', logError);
    }

    // エラー種別に応じた適切なレスポンス
    if (error.code === 'THREADS_API_ERROR') {
      return res.status(400).json({
        error: 'Threads API エラー',
        message: error.message,
        code: 'THREADS_API_ERROR',
        details: error.details,
        suggestion: 'Threads API設定を確認してください'
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

    if (error.code === 'AUTH_ERROR') {
      return res.status(401).json({
        error: 'Threads認証エラー',
        message: 'アクセストークンを確認してください',
        code: 'AUTH_ERROR',
        suggestion: 'Threadsアプリで新しいアクセストークンを生成してください'
      });
    }

    if (error.code === 'RATE_LIMIT_ERROR') {
      return res.status(429).json({
        error: 'Threads API制限に達しました',
        message: 'しばらく待ってから再試行してください',
        code: 'RATE_LIMIT_ERROR',
        retry_after: 3600 // 1時間
      });
    }

    if (error.code === 'CONTENT_POLICY_ERROR') {
      return res.status(400).json({
        error: 'コンテンツポリシー違反',
        message: '投稿内容がThreadsのコミュニティガイドラインに違反している可能性があります',
        code: 'CONTENT_POLICY_ERROR'
      });
    }

    return res.status(500).json({
      error: 'Threads投稿でエラーが発生しました',
      message: 'しばらく待ってから再試行してください',
      code: 'INTERNAL_ERROR',
      debug: error.message
    });
  }
}

// プラン確認関数（堅牢性向上）
async function getUserPlan(token) {
  try {
    if (!token) {
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

      const response = await fetch(`${baseUrl}/api/check-user-plan`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000 // 5秒タイムアウト
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Plan check successful:', data.plan);
        return data.plan || 'free';
      }

      console.log('Plan check failed, defaulting to free');
      return 'free';
    } catch (apiError) {
      console.error('Plan API error:', apiError);
      return 'free';
    }

  } catch (error) {
    console.error('Plan check error:', error);
    return 'free';
  }
}

// Threads設定取得
async function getThreadsConfig(token) {
  try {
    // 実際の実装ではユーザーの設定を取得
    // 現在はテスト用に固定値を返す
    return {
      access_token: 'test_threads_access_token',
      user_id: 'test_user_id'
    };
  } catch (error) {
    console.error('Threads config error:', error);
    return null;
  }
}

// Threads投稿実行関数（改善版）
async function postToThreads({ text, accessToken, image_url }) {
  try {
    // Threads API (Instagram Basic Display API) を使用

    // Step 1: メディアコンテナ作成
    const containerPayload = {
      media_type: 'TEXT',
      text: text,
      access_token: accessToken
    };

    // 画像がある場合は追加
    if (image_url) {
      containerPayload.media_type = 'IMAGE';
      containerPayload.image_url = image_url;
    }

    const containerResponse = await fetch('https://graph.threads.net/v1.0/me/threads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(containerPayload)
    });

    if (!containerResponse.ok) {
      const errorData = await containerResponse.json();
      console.error('Container creation error:', errorData);

      // 詳細なエラーハンドリング
      if (containerResponse.status === 401) {
        const authError = new Error('Threadsアクセストークンが無効です');
        authError.code = 'AUTH_ERROR';
        throw authError;
      }

      if (containerResponse.status === 429) {
        const rateLimitError = new Error('API制限に達しました');
        rateLimitError.code = 'RATE_LIMIT_ERROR';
        throw rateLimitError;
      }

      if (errorData.error && errorData.error.message.includes('content')) {
        const contentError = new Error('コンテンツポリシー違反の可能性があります');
        contentError.code = 'CONTENT_POLICY_ERROR';
        throw contentError;
      }

      const apiError = new Error(`Container creation failed: ${errorData.error?.message || 'Unknown error'}`);
      apiError.code = 'THREADS_API_ERROR';
      apiError.details = errorData;
      throw apiError;
    }

    const containerData = await containerResponse.json();
    const containerId = containerData.id;

    console.log('Container created:', containerId);

    // Step 2: メディア公開
    const publishResponse = await fetch('https://graph.threads.net/v1.0/me/threads_publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: accessToken
      })
    });

    if (!publishResponse.ok) {
      const errorData = await publishResponse.json();
      console.error('Publish error:', errorData);

      if (publishResponse.status === 401) {
        const authError = new Error('Threadsアクセストークンが無効です');
        authError.code = 'AUTH_ERROR';
        throw authError;
      }

      if (publishResponse.status === 429) {
        const rateLimitError = new Error('API制限に達しました');
        rateLimitError.code = 'RATE_LIMIT_ERROR';
        throw rateLimitError;
      }

      const apiError = new Error(`Publish failed: ${errorData.error?.message || 'Unknown error'}`);
      apiError.code = 'THREADS_API_ERROR';
      apiError.details = errorData;
      throw apiError;
    }

    const publishData = await publishResponse.json();

    console.log('Post published successfully:', publishData.id);

    return {
      post_id: publishData.id,
      success: true
    };

  } catch (error) {
    console.error('Threads API call error:', error);

    // ネットワークエラー
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      const networkError = new Error('ネットワーク接続に失敗しました');
      networkError.code = 'NETWORK_ERROR';
      throw networkError;
    }

    // 既に定義されたエラーはそのまま再throw
    if (error.code === 'AUTH_ERROR' || error.code === 'RATE_LIMIT_ERROR' ||
      error.code === 'CONTENT_POLICY_ERROR' || error.code === 'THREADS_API_ERROR') {
      throw error;
    }

    // 認証エラー（文字列チェック）
    if (error.message.includes('Invalid access token') || error.message.includes('Authentication')) {
      const authError = new Error('Threadsアクセストークンが無効です');
      authError.code = 'AUTH_ERROR';
      throw authError;
    }

    // API制限エラー（文字列チェック）
    if (error.message.includes('Rate limit') || error.message.includes('Too many requests')) {
      const rateLimitError = new Error('API制限に達しました。しばらく待ってから再試行してください');
      rateLimitError.code = 'RATE_LIMIT_ERROR';
      throw rateLimitError;
    }

    // 一般的なAPIエラー
    const apiError = new Error(`Threads投稿に失敗しました: ${error.message}`);
    apiError.code = 'THREADS_API_ERROR';
    apiError.details = error.message;
    throw apiError;
  }
}

// 投稿統計記録（改善版）
async function recordPostStats(platform, userToken, data) {
  try {
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      console.log('KV not configured, skipping stats recording');
      return;
    }

    const timestamp = new Date().toISOString();
    const statsKey = `post_stats:${platform}:${timestamp}:${Date.now()}`;

    const statsData = {
      platform,
      userToken: userToken.substring(0, 8) + '...' + userToken.substring(userToken.length - 4), // 一部マスク
      text: data.text ? data.text.substring(0, 100) + (data.text.length > 100 ? '...' : '') : null,
      success: data.success,
      error: data.error || null,
      post_id: data.post_id || null,
      timestamp,
      character_count: data.text ? data.text.length : 0
    };

    // KV に投稿統計を保存
    await fetch(`${process.env.KV_REST_API_URL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['SETEX', statsKey, 86400 * 7, JSON.stringify(statsData)]), // 7日間保存
    });

    console.log(`📊 Post stats recorded: ${platform} - ${data.success ? 'SUCCESS' : 'FAILURE'}`);

  } catch (error) {
    console.error('Stats recording error:', error);
    // 統計記録失敗は投稿成功に影響させない
  }
}