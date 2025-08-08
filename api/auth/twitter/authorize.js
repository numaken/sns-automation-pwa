// Twitter OAuth 2.0 with PKCE - 認証開始
import crypto from 'crypto';

// PKCE用のコードベリファイアとチャレンジを生成
function generateCodeChallenge() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256')
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

    // Twitter Client ID確認
    const clientId = process.env.TWITTER_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({
        error: 'Twitter Client ID not configured',
        code: 'MISSING_CLIENT_ID'
      });
    }

    // redirect_uri設定
    const redirectUri = `https://${req.headers.host}/api/auth/twitter/callback`;

    // PKCE生成
    const { codeVerifier, codeChallenge } = generateCodeChallenge();

    // state生成（CSRF対策）
    const state = crypto.randomBytes(16).toString('hex');

    // OAuth認証URLパラメータ
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'tweet.read tweet.write users.read offline.access',
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    // 認証URL構築
    const authUrl = `https://twitter.com/i/oauth2/authorize?${params.toString()}`;

    // PKCE情報をKVに保存
    const pkceKey = `twitter_oauth_pkce:${userId}:${state}`;
    const pkceData = JSON.stringify({
      codeVerifier,
      userId,
      redirectUri,
      timestamp: Date.now()
    });

    await setKVValue(pkceKey, pkceData, 3600); // 1時間有効

    return res.status(200).json({
      success: true,
      authUrl,
      state,
      message: 'Twitter認証を開始してください'
    });

  } catch (error) {
    console.error('Twitter OAuth authorize error:', error);
    return res.status(500).json({
      error: 'OAuth認証の開始に失敗しました',
      code: 'OAUTH_START_ERROR'
    });
  }
}