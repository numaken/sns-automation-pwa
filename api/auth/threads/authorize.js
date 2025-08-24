// Threads OAuth認証開始API
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'ユーザーIDが必要です' });
    }

    // PKCEパラメータの生成
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    // 認証セッションデータ
    const authData = {
      userId,
      codeVerifier,
      codeChallenge,
      timestamp: Date.now()
    };

    // KVストレージに保存（30分TTL）
    const sessionKey = `threads_oauth_pkce:${userId}`;
    await setKVValue(sessionKey, JSON.stringify(authData), 1800); // 30分

    // Threads OAuth認証URL
    const threadsClientId = process.env.THREADS_APP_ID;
    const redirectUri = `https://postpilot.panolabollc.com/api/auth/threads/callback`;

    const authParams = new URLSearchParams({
      client_id: threadsClientId,
      redirect_uri: redirectUri,
      scope: 'threads_basic,threads_content_publish',
      response_type: 'code',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state: userId
    });

    const authUrl = `https://threads.net/oauth/authorize?${authParams.toString()}`;

    console.log('Threads OAuth session created:', { userId, sessionKey });

    return res.status(200).json({
      authUrl,
      sessionKey,
      message: 'Threads認証URLを生成しました'
    });

  } catch (error) {
    console.error('Threads OAuth authorize error:', error);
    return res.status(500).json({
      error: 'Threads認証の開始に失敗しました',
      details: error.message
    });
  }
}

// KVストレージヘルパー関数
async function setKVValue(key, value, ttl = null) {
  const command = ttl
    ? ['SETEX', key, ttl, value.toString()]
    : ['SET', key, value.toString()];

  const response = await fetch(`${process.env.KV_REST_API_URL}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    throw new Error(`KV set error: ${response.status}`);
  }
}