// Threads OAuth - 認証完了コールバック

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
    const tokenParams = new URLSearchParams({
      client_id: process.env.THREADS_APP_ID,
      client_secret: process.env.THREADS_APP_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: `${process.env.VERCEL_URL || 'https://sns-automation-pwa.vercel.app'}/api/auth/threads/callback`,
      code: code
    });

    const tokenResponse = await fetch('https://graph.threads.net/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenParams.toString()
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange error:', errorData);
      return res.redirect(`${process.env.VERCEL_URL || 'https://sns-automation-pwa.vercel.app'}/?error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();

    // 長期アクセストークンを取得（短期トークンを長期トークンに交換）
    const longTokenParams = new URLSearchParams({
      grant_type: 'th_exchange_token',
      client_secret: process.env.THREADS_APP_SECRET,
      access_token: tokenData.access_token
    });

    const longTokenResponse = await fetch('https://graph.threads.net/access_token', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    let finalToken = tokenData.access_token;
    let expiresIn = tokenData.expires_in || 3600; // デフォルト1時間

    if (longTokenResponse.ok) {
      const longTokenData = await longTokenResponse.json();
      finalToken = longTokenData.access_token;
      expiresIn = longTokenData.expires_in || 5184000; // 60日
    }

    // ユーザー情報を取得
    const userResponse = await fetch(`https://graph.threads.net/me?fields=id,username,threads_profile_picture_url&access_token=${finalToken}`);

    if (!userResponse.ok) {
      console.error('User info fetch error:', userResponse.status);
      return res.redirect(`${process.env.VERCEL_URL || 'https://sns-automation-pwa.vercel.app'}/?error=user_fetch_failed`);
    }

    const userData = await userResponse.json();

    // トークン情報をKVに保存
    const tokenInfo = {
      accessToken: finalToken,
      expiresAt: new Date(Date.now() + (expiresIn * 1000)).toISOString(),
      tokenType: 'Bearer',
      threadsUserId: userData.id,
      threadsUsername: userData.username,
      profilePictureUrl: userData.threads_profile_picture_url,
      connectedAt: new Date().toISOString()
    };

    // ユーザーのThreadsトークンを保存
    await setKVValue(`threads_token:${sessionData.userId}`, tokenInfo);

    // セッション情報を削除
    await deleteKVValue(`oauth_session:${state}`);

    // 成功ページにリダイレクト
    const successUrl = `${process.env.VERCEL_URL || 'https://sns-automation-pwa.vercel.app'}/?threads_connected=success&username=${userData.username}`;

    return res.redirect(successUrl);

  } catch (error) {
    console.error('Threads OAuth callback error:', error);
    return res.redirect(`${process.env.VERCEL_URL || 'https://sns-automation-pwa.vercel.app'}/?error=oauth_callback_failed`);
  }
}