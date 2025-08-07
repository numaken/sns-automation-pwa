// Twitter OAuth 2.0 with PKCE - 認証完了コールバック

// KVからデータを取得
async function getKVValue(key) {
  const response = await fetch(`${process.env.KV_REST_API_URL}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(['GET', key]),
  });

  if (!response.ok) {
    throw new Error(`KV get error: ${response.status}`);
  }

  const data = await response.json();
  return data.result ? JSON.parse(data.result) : null;
}

// KVにデータを保存
async function setKVValue(key, value, ttl = null) {
  const command = ttl
    ? ['SETEX', key, ttl, JSON.stringify(value)]
    : ['SET', key, JSON.stringify(value)];

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

// KVからキーを削除
async function deleteKVValue(key) {
  const response = await fetch(`${process.env.KV_REST_API_URL}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(['DEL', key]),
  });

  if (!response.ok) {
    throw new Error(`KV delete error: ${response.status}`);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, state, error: oauthError } = req.query;

    // OAuth エラーチェック
    if (oauthError) {
      console.error('OAuth error:', oauthError);
      return res.redirect(`${process.env.VERCEL_URL || 'https://sns-automation-pwa.vercel.app'}/?error=oauth_denied`);
    }

    if (!code || !state) {
      return res.status(400).json({ error: 'Authorization code and state are required' });
    }

    // セッション情報を取得
    const sessionData = await getKVValue(`oauth_session:${state}`);
    if (!sessionData) {
      return res.status(400).json({ error: 'Invalid or expired OAuth session' });
    }

    // アクセストークンを取得
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(
          `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
        ).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: `${process.env.VERCEL_URL || 'https://sns-automation-pwa.vercel.app'}/api/auth/twitter/callback`,
        code_verifier: sessionData.codeVerifier
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange error:', errorData);
      return res.redirect(`${process.env.VERCEL_URL || 'https://sns-automation-pwa.vercel.app'}/?error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();

    // ユーザー情報を取得
    const userResponse = await fetch('https://api.twitter.com/2/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    if (!userResponse.ok) {
      console.error('User info fetch error:', userResponse.status);
      return res.redirect(`${process.env.VERCEL_URL || 'https://sns-automation-pwa.vercel.app'}/?error=user_fetch_failed`);
    }

    const userData = await userResponse.json();

    // トークン情報をKVに保存（永続化 - refresh_tokenがある場合は長期保存）
    const tokenInfo = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
      tokenType: tokenData.token_type,
      scope: tokenData.scope,
      twitterUserId: userData.data.id,
      twitterUsername: userData.data.username,
      connectedAt: new Date().toISOString()
    };

    // ユーザーのTwitterトークンを保存
    await setKVValue(`twitter_token:${sessionData.userId}`, tokenInfo);

    // セッション情報を削除
    await deleteKVValue(`oauth_session:${state}`);

    // 成功ページにリダイレクト
    const successUrl = `${process.env.VERCEL_URL || 'https://sns-automation-pwa.vercel.app'}/?twitter_connected=success&username=${userData.data.username}`;

    return res.redirect(successUrl);

  } catch (error) {
    console.error('Twitter OAuth callback error:', error);
    return res.redirect(`${process.env.VERCEL_URL || 'https://sns-automation-pwa.vercel.app'}/?error=oauth_callback_failed`);
  }
}