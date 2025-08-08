// Threads OAuth - 認証開始（環境変数対応版）
import crypto from 'crypto';

// KVにデータを保存
async function setKVValue(key, value, ttl = 3600) {
  const response = await fetch(`${process.env.KV_REST_API_URL}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(['SETEX', key, ttl, value]),
  });
  return response.ok;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Threads App ID確認
    const clientId = process.env.THREADS_APP_ID;
    if (!clientId || clientId === 'your_threads_app_id') {
      return res.status(500).json({
        error: 'Threads App ID not configured',
        code: 'MISSING_APP_ID'
      });
    }

    // redirect_uri設定（環境変数優先）
    const redirectUri = process.env.THREADS_REDIRECT_URI ||
      `https://${req.headers.host}/api/auth/threads/callback`;

    console.log('Using redirect_uri:', redirectUri); // デバッグログ

    // state生成（CSRF対策）
    const state = crypto.randomBytes(16).toString('hex');

    // OAuth認証URLパラメータ
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'threads_basic,threads_content_publish',
      response_type: 'code',
      state: state
    });

    // 認証URL構築
    const authUrl = `https://threads.net/oauth/authorize?${params.toString()}`;

    // state情報をKVに保存（セキュリティ用）
    const stateKey = `threads_oauth_state:${userId}:${state}`;
    const stateData = JSON.stringify({
      userId,
      redirectUri,
      timestamp: Date.now()
    });

    await setKVValue(stateKey, stateData, 3600); // 1時間有効

    return res.status(200).json({
      success: true,
      authUrl,
      state,
      message: 'Threads認証を開始してください'
    });

  } catch (error) {
    console.error('Threads OAuth authorize error:', error);
    return res.status(500).json({
      error: 'OAuth認証の開始に失敗しました',
      code: 'OAUTH_START_ERROR'
    });
  }
}