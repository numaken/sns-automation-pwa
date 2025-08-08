// api/auth/twitter/callback.js

// KVから値取得
async function getKVValue(key) {
  const response = await fetch(process.env.KV_REST_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(['GET', key]),
  });
  if (!response.ok) throw new Error(`KV get error: ${response.status}`);
  const data = await response.json();
  return data.result ? JSON.parse(data.result) : null;
}

// KVに保存
async function setKVValue(key, value, ttl = 3600) {
  await fetch(process.env.KV_REST_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(['SETEX', key, ttl, JSON.stringify(value)]),
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { code, state } = req.query;
    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state' });
    }

    // セッション取得
    const sessionData = await getKVValue(`oauth_session:${state}`);
    if (!sessionData) {
      return res.status(400).json({ error: '無効な state', code: 'INVALID_STATE' });
    }

    // アクセストークン取得
    const tokenResp = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.TWITTER_CLIENT_ID,
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'https://sns-automation-pwa.vercel.app/api/auth/twitter/callback',
        code_verifier: sessionData.codeVerifier
      })
    });

    const tokenData = await tokenResp.json();
    if (!tokenResp.ok) {
      console.error('Twitter token error:', tokenData);
      return res.status(500).json({ error: 'Twitter トークン取得失敗', details: tokenData });
    }

    // トークン保存（userId紐付け）
    await setKVValue(`twitter_tokens:${sessionData.userId}`, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      obtainedAt: Date.now()
    }, 86400 * 30);

    return res.status(200).json({
      success: true,
      message: 'Twitter アカウント連携が完了しました',
      userId: sessionData.userId
    });

  } catch (error) {
    console.error('Twitter OAuth callback error:', error);
    return res.status(500).json({ error: 'OAuthコールバック処理に失敗しました', details: error.message });
  }
}
