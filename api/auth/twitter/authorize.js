// api/auth/twitter/authorize.js
import crypto from 'crypto';

// PKCE用のコードベリファイアとチャレンジを生成
function generateCodeChallenge() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  return { codeVerifier, codeChallenge };
}

// KVにデータを保存
async function setKVValue(key, value, ttl = 3600) {
  const response = await fetch(`${process.env.KV_REST_API_URL}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(['SETEX', key, ttl, JSON.stringify(value)]),
  });
  if (!response.ok) {
    throw new Error(`KV set error: ${response.status}`);
  }
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

    // PKCEコード生成
    const { codeVerifier, codeChallenge } = generateCodeChallenge();
    const state = crypto.randomBytes(16).toString('hex');

    // セッション情報をKVに保存（1時間有効）
    const sessionData = { userId, codeVerifier, state, platform: 'twitter', createdAt: new Date().toISOString() };
    await setKVValue(`oauth_session:${state}`, sessionData, 3600);

    // VERCEL_ENV が production なら本番ドメイン、それ以外は常に本番ドメインを使う
    // どの環境でも本番ドメインを使う
    const origin = 'https://sns-automation-pwa.vercel.app';

    const redirectUri = `${origin}/api/auth/twitter/callback`;

    // Twitter OAuth 2.0認証URL生成
    const authParams = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.TWITTER_CLIENT_ID,
      redirect_uri: redirectUri,
      scope: 'tweet.read tweet.write users.read offline.access',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });
    const authUrl = `https://twitter.com/i/oauth2/authorize?${authParams.toString()}`;

    return res.status(200).json({ success: true, authUrl, state, message: 'Twitter 認証を開始してください' });
  } catch (error) {
    console.error('Twitter OAuth authorize error:', error);
    return res.status(500).json({ error: 'OAuth 認証の開始に失敗しました', details: error.message });
  }
}
