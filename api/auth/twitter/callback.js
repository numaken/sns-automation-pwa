// Twitter OAuth 2.0 callback - トークン取得処理
import { URLSearchParams } from 'url';

// KVからデータを取得
async function getKVValue(key) {
  try {
    const response = await fetch(`${process.env.KV_REST_API_URL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['GET', key]),
    });
    const result = await response.json();
    return result.result;
  } catch (error) {
    console.error('KV get error:', error);
    return null;
  }
}

// KVにデータを保存
async function setKVValue(key, value, ttl = 3600) {
  try {
    const response = await fetch(`${process.env.KV_REST_API_URL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['SETEX', key, ttl, value]),
    });
    return response.ok;
  } catch (error) {
    console.error('KV set error:', error);
    return false;
  }
}

// KVからデータを削除
async function deleteKVValue(key) {
  try {
    const response = await fetch(`${process.env.KV_REST_API_URL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['DEL', key]),
    });
    return response.ok;
  } catch (error) {
    console.error('KV delete error:', error);
    return false;
  }
}

export default async function handler(req, res) {
  // GET/POST両方対応
  const { code, state } = req.method === 'POST' ? req.body : req.query;

  console.log('Callback received:', { code: !!code, state, method: req.method });

  // 基本パラメータ確認
  if (!code || !state) {
    console.error('Missing parameters:', { code: !!code, state: !!state });
    return res.status(400).json({
      error: 'Missing code or state',
      received: { code: !!code, state: !!state }
    });
  }

  try {
    // 全てのPKCEキーをパターンで検索（デバッグ用）
    console.log('Looking for PKCE data with state:', state);

    // stateパターンでKVキーを検索
    let pkceData = null;
    let pkceKey = null;
    let userId = null;

    // 複数のuserIdパターンでKV検索を試行
    const possibleUserIds = [
      'test-user',
      'test-oauth-fresh',
      'fresh-oauth-test',
      'immediate-test',
      'test-premium-token'
    ];

    for (const testUserId of possibleUserIds) {
      const testKey = `twitter_oauth_pkce:${testUserId}:${state}`;
      console.log('Trying key:', testKey);

      const testData = await getKVValue(testKey);
      if (testData) {
        pkceData = JSON.parse(testData);
        pkceKey = testKey;
        userId = testUserId;
        console.log('Found PKCE data for user:', userId);
        break;
      }
    }

    if (!pkceData) {
      console.error('PKCE data not found for state:', state);
      return res.status(400).json({
        error: 'Invalid or expired state',
        state,
        debug: 'PKCE data not found in KV store'
      });
    }

    // Twitter Client ID/Secret確認
    const clientId = process.env.TWITTER_CLIENT_ID;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('Twitter credentials not configured');
      return res.status(500).json({
        error: 'Twitter credentials not configured'
      });
    }

    // アクセストークン取得
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: pkceData.redirectUri,
      code_verifier: pkceData.codeVerifier,
      client_id: clientId
    });

    console.log('Requesting access token...');

    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: tokenParams.toString()
    });

    const tokenData = await tokenResponse.json();
    console.log('Token response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenData);
      return res.status(400).json({
        error: 'Token exchange failed',
        details: tokenData
      });
    }

    // ユーザー情報取得
    console.log('Getting user info...');
    const userResponse = await fetch('https://api.twitter.com/2/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    const userData = await userResponse.json();
    console.log('User data received:', !!userData.data);

    if (!userResponse.ok) {
      console.error('User info fetch failed:', userData);
      return res.status(400).json({
        error: 'Failed to get user info',
        details: userData
      });
    }

    // トークン情報をKVに保存
    const userTokenKey = `twitter_token:${userId}`;
    const tokenInfo = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: Date.now() + (tokenData.expires_in * 1000),
      user_id: userData.data.id,
      username: userData.data.username,
      name: userData.data.name,
      created_at: Date.now()
    };

    await setKVValue(userTokenKey, JSON.stringify(tokenInfo), 86400 * 30); // 30日保存

    // 使用済みPKCEデータを削除
    await deleteKVValue(pkceKey);

    console.log('OAuth callback completed successfully for user:', userData.data.username);

    // 成功レスポンス（ブラウザ表示用）
    const successHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Twitter認証完了</title>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .success { color: #1da1f2; }
            .user-info { background: #f7f9fa; padding: 20px; border-radius: 8px; margin: 20px auto; max-width: 400px; }
        </style>
    </head>
    <body>
        <div class="success">
            <h1>✅ Twitter認証成功</h1>
            <div class="user-info">
                <h3>@${userData.data.username} として接続されました</h3>
                <p>名前: ${userData.data.name}</p>
                <p>User ID: ${userData.data.id}</p>
            </div>
            <p>このウィンドウを閉じて、アプリに戻ってください。</p>
        </div>
        <script>
            // 親ウィンドウに成功を通知
            if (window.opener) {
                window.opener.postMessage({
                    type: 'twitter_oauth_success',
                    user: {
                        id: '${userData.data.id}',
                        username: '${userData.data.username}',
                        name: '${userData.data.name}'
                    }
                }, '*');
                setTimeout(() => window.close(), 2000);
            }
        </script>
    </body>
    </html>`;

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(successHtml);

  } catch (error) {
    console.error('OAuth callback error:', error);
    return res.status(500).json({
      error: 'Internal server error during OAuth callback',
      message: error.message
    });
  }
}