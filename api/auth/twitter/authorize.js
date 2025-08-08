// api/auth/twitter/authorize.js
import crypto from 'crypto';

// PKCEコード生成
function generateCodeChallenge() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  return { codeVerifier, codeChallenge };
}

// KV保存
async function setKVValue(key, value, ttl = 3600) {
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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'User ID is required' });

    const { codeVerifier, codeChallenge } = generateCodeChallenge();
    const state = crypto.randomBytes(16).toString('hex');

    // 認証セッション保存
    await setKVValue(`oauth_session:${state}`, {
      userId,
      codeVerifier,
      state,
      platform: 'twitter',
      createdAt: new Date().toISOString()
    }, 3600);

    const origin =
      process.env.VERCEL_ENV === 'production'
        ? `https://${process.env.VERCEL_URL}`
        : 'https://sns-automation-pwa.vercel.app';
    const redirectUri = `${origin}/api/auth/twitter/callback`;

    const authParams = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.TWITTER_CLIENT_ID,
      redirect_uri: redirectUri,
      scope: 'tweet.read tweet.write users.read offline.access',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    res.status(200).json({
      success: true,
      authUrl: `https://twitter.com/i/oauth2/authorize?${authParams.toString()}`,
      state,
      message: 'Twitter 認証を開始してください'
    });

  } catch (e) {
    console.error('Twitter OAuth authorize error:', e);
    res.status(500).json({ error: 'OAuth 認証開始に失敗', details: e.message });
  }
}
