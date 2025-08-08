// api/auth/twitter/callback.js
async function getKVValue(key) {
  const resp = await fetch(`${process.env.KV_REST_API_URL}/get/${key}`, {
    headers: { 'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}` }
  });
  if (!resp.ok) return null;
  return resp.json();
}

async function setKVValue(key, value, ttl = 86400 * 30) {
  const resp = await fetch(process.env.KV_REST_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(['SETEX', key, ttl, JSON.stringify(value)]),
  });
  if (!resp.ok) throw new Error(`KV set error: ${resp.status}`);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { code, state } = req.query;
    if (!code || !state) return res.status(400).json({ error: 'code/state が不足' });

    const session = await getKVValue(`oauth_session:${state}`);
    if (!session?.userId) return res.status(400).json({ error: '無効な state' });

    // アクセストークン交換
    const tokenResp = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.TWITTER_CLIENT_ID,
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.VERCEL_ENV === 'production'
          ? `https://${process.env.VERCEL_URL}`
          : 'https://sns-automation-pwa.vercel.app'
          }/api/auth/twitter/callback`,
        code_verifier: session.codeVerifier
      })
    });

    const tokenData = await tokenResp.json();
    if (!tokenResp.ok) throw new Error(tokenData.error || 'Token exchange failed');

    // KV保存（userIdキーで永続化）
    await setKVValue(`twitter_tokens:${session.userId}`, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      obtainedAt: Date.now()
    });

    res.status(200).send('Twitter アカウント連携が完了しました。画面を閉じてください。');

  } catch (e) {
    console.error('Twitter OAuth callback error:', e);
    res.status(500).json({ error: 'OAuth コールバック失敗', details: e.message });
  }
}
