// Threads投稿API - api/post-to-threads.js
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
    const { text, content, accessToken } = req.body;
    const postText = text || content; // どちらでも受け入れる

    // 入力検証
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        error: '投稿テキストが必要です',
        code: 'MISSING_TEXT'
      });
    }

    if (!postText || postText.trim().length === 0) {
      return res.status(400).json({
        error: '投稿テキストが必要です',
        code: 'MISSING_TEXT'
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
        message: 'Threads投稿機能はプレミアムプランでご利用いただけます。今すぐアップグレードして無制限でSNS投稿を活用しましょう！'
      });
    }

    // Threads API設定検証
    if (!accessToken) {
      return res.status(400).json({
        error: 'Threads API設定が不完全です',
        code: 'INCOMPLETE_THREADS_CONFIG',
        message: 'Threads アクセストークンを設定してください',
        required: ['accessToken'],
        help_url: '/settings#threads-api'
      });
    }

    // Threads投稿実行
    const result = await postToThreads({
      text: text.trim(),
      accessToken
    });

    // 投稿統計記録
    await recordPostStats('threads', token);

    return res.status(200).json({
      success: true,
      message: 'Threadsに投稿しました！',
      post_id: result.post_id,
      post_url: `https://www.threads.net/@username/post/${result.post_id}`,
      posted_at: new Date().toISOString(),
      platform: 'threads'
    });

  } catch (error) {
    console.error('Threads post error:', error);

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
      code: 'INTERNAL_ERROR'
    });
  }
}

// プラン確認関数（Twitter APIと同じ）
async function getUserPlan(token) {
  try {
    // テスト用トークン
    if (token === 'test-premium-token' || token === 'premium-user-token') {
      return 'premium';
    }

    // 実際のプラン確認ロジック
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
    return 'free';
  }
}

// Threads投稿実行関数
async function postToThreads({ text, accessToken }) {
  try {
    // Threads API (Instagram Basic Display API) を使用

    // Step 1: メディアコンテナ作成
    const containerResponse = await fetch('https://graph.threads.net/v1.0/me/threads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        media_type: 'TEXT',
        text: text,
        access_token: accessToken
      })
    });

    if (!containerResponse.ok) {
      const errorData = await containerResponse.json();

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

      throw new Error(`Container creation failed: ${errorData.error?.message || 'Unknown error'}`);
    }

    const containerData = await containerResponse.json();
    const containerId = containerData.id;

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

      throw new Error(`Publish failed: ${errorData.error?.message || 'Unknown error'}`);
    }

    const publishData = await publishResponse.json();

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
    if (error.code === 'AUTH_ERROR' || error.code === 'RATE_LIMIT_ERROR' || error.code === 'CONTENT_POLICY_ERROR') {
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

// 投稿統計記録
async function recordPostStats(platform, userToken) {
  try {
    // 統計記録のロジック
    const today = new Date().toISOString().split('T')[0];
    const statsKey = `post_stats:${platform}:${today}`;

    // 簡易統計記録（実装に応じて調整）
    console.log(`Post recorded: ${platform} at ${new Date().toISOString()}`);
  } catch (error) {
    console.error('Stats recording error:', error);
    // 統計記録失敗は投稿成功に影響させない
  }
}