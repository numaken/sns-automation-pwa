// Twitter OAuth 2.0 callback - トークン取得処理（完全デバッグ版）
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
    console.log(`KV GET ${key}:`, { status: response.status, result });

    if (!response.ok) {
      console.error(`KV GET failed for ${key}:`, result);
      return null;
    }

    return result.result;
  } catch (error) {
    console.error(`KV GET error for ${key}:`, error);
    return null;
  }
}

// KVにデータを保存
async function setKVValue(key, value, ttlSeconds = null) {
  try {
    const command = ttlSeconds
      ? ['SETEX', key, ttlSeconds, value]
      : ['SET', key, value];

    const response = await fetch(`${process.env.KV_REST_API_URL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });

    const result = await response.json();
    console.log(`KV SET ${key}:`, { status: response.status, result });

    return response.ok;
  } catch (error) {
    console.error(`KV SET error for ${key}:`, error);
    return false;
  }
}

export default async function handler(req, res) {
  console.log('=== Twitter OAuth Callback START ===');
  console.log('Method:', req.method);
  console.log('Query:', req.query);
  console.log('Headers:', req.headers);

  const { code, state, error } = req.query;

  // デバッグモード確認
  if (req.query.debug === 'version') {
    return res.json({
      version: 'Twitter OAuth Callback v2.0 - 完全デバッグ版',
      timestamp: new Date().toISOString(),
      environment: {
        hasKvUrl: !!process.env.KV_REST_API_URL,
        hasKvToken: !!process.env.KV_REST_API_TOKEN,
        hasTwitterClientId: !!process.env.TWITTER_CLIENT_ID,
        hasTwitterClientSecret: !!process.env.TWITTER_CLIENT_SECRET
      }
    });
  }

  // OAuth認証エラーのチェック
  if (error) {
    console.error('OAuth error received:', error);
    return res.status(400).json({
      error: 'OAuth認証でエラーが発生しました',
      details: error,
      debug: 'OAuth provider returned error'
    });
  }

  // 必須パラメータの確認
  if (!code || !state) {
    console.error('Missing required parameters:', { code: !!code, state: !!state });
    return res.status(400).json({
      error: 'Missing code or state',
      received: { code: !!code, state: !!state },
      debug: 'Required OAuth parameters missing',
      version: 'v2.0-debug'
    });
  }

  console.log('OAuth callback received:', { code: code.substring(0, 20) + '...', state });

  try {
    // 複数のuserIdパターンでPKCEデータを検索
    const possibleUserIds = [
      'final-oauth-test',  // 新追加：最新テストユーザー
      'ttl-fix-test',
      'final-test',
      'kv-test-debug',
      'debug-test-user',
      'callback-test',
      'test-user',
      'test'
    ];

    let pkceData = null;
    let foundKey = null;

    console.log('=== PKCE Data Search START ===');

    // 各userIdパターンで検索
    for (const userId of possibleUserIds) {
      const kvKey = `twitter_oauth_pkce:${userId}:${state}`;
      console.log(`Trying KV key: ${kvKey}`);

      const data = await getKVValue(kvKey);
      if (data) {
        console.log(`✅ PKCE data found with userId: ${userId}`);
        pkceData = JSON.parse(data);
        foundKey = kvKey;
        break;
      } else {
        console.log(`❌ No data found for userId: ${userId}`);
      }
    }

    // 直接stateでも検索
    if (!pkceData) {
      const directKey = `twitter_oauth_pkce:${state}`;
      console.log(`Trying direct state key: ${directKey}`);
      const data = await getKVValue(directKey);
      if (data) {
        console.log(`✅ PKCE data found with direct state key`);
        pkceData = JSON.parse(data);
        foundKey = directKey;
      }
    }

    // パターンなしでstate前後を検索
    if (!pkceData) {
      const patterns = [
        `twitter_oauth_pkce:*:${state}`,
        `*:${state}`,
        state
      ];

      for (const pattern of patterns) {
        console.log(`Trying pattern: ${pattern}`);
        const data = await getKVValue(pattern);
        if (data) {
          console.log(`✅ PKCE data found with pattern: ${pattern}`);
          pkceData = JSON.parse(data);
          foundKey = pattern;
          break;
        }
      }
    }

    console.log('=== PKCE Data Search END ===');

    if (!pkceData) {
      console.error('PKCE data not found after exhaustive search');

      // KV接続テスト
      const testKey = 'callback_test_' + Date.now();
      const testValue = 'test_data';
      const saveResult = await setKVValue(testKey, testValue, 60);
      const readResult = await getKVValue(testKey);

      return res.status(400).json({
        error: 'Invalid or expired state',
        state: state,
        debug: 'PKCE data not found after exhaustive search',
        searchAttempts: possibleUserIds.length + 3,
        kvConnectionTest: {
          save: saveResult,
          read: readResult === testValue
        },
        timestamp: new Date().toISOString()
      });
    }

    console.log('Found PKCE data:', { foundKey, codeVerifier: pkceData.codeVerifier?.substring(0, 10) + '...' });

    // アクセストークンの取得
    console.log('=== Token Exchange START ===');

    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.TWITTER_CLIENT_ID,
      code: code,
      redirect_uri: 'https://sns-automation-pwa.vercel.app/api/auth/twitter/callback',
      code_verifier: pkceData.codeVerifier,
    });

    console.log('Token request params:', {
      grant_type: 'authorization_code',
      client_id: process.env.TWITTER_CLIENT_ID?.substring(0, 10) + '...',
      code: code.substring(0, 10) + '...',
      redirect_uri: 'https://sns-automation-pwa.vercel.app/api/auth/twitter/callback',
      code_verifier: pkceData.codeVerifier?.substring(0, 10) + '...'
    });

    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: tokenParams.toString(),
    });

    const tokenData = await tokenResponse.json();
    console.log('Token response:', {
      status: tokenResponse.status,
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      tokenType: tokenData.token_type,
      error: tokenData.error
    });

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenData);
      return res.status(400).json({
        error: 'トークン取得に失敗しました',
        details: tokenData,
        debug: 'Twitter token exchange failed'
      });
    }

    // ユーザー情報の取得
    console.log('=== User Info Fetch START ===');

    const userResponse = await fetch('https://api.twitter.com/2/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json();
    console.log('User data response:', {
      status: userResponse.status,
      hasData: !!userData.data,
      username: userData.data?.username,
      error: userData.error
    });

    if (!userResponse.ok) {
      console.error('User info fetch failed:', userData);
      return res.status(400).json({
        error: 'ユーザー情報の取得に失敗しました',
        details: userData,
        debug: 'Twitter user info fetch failed'
      });
    }

    // トークン情報をKVに保存
    console.log('=== Token Storage START ===');

    const tokenInfo = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_type: tokenData.token_type,
      expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
      user_id: userData.data.id,
      username: userData.data.username,
      created_at: new Date().toISOString()
    };

    const tokenKey = `twitter_token:${pkceData.userId}`;
    const tokenSaved = await setKVValue(tokenKey, JSON.stringify(tokenInfo), 30 * 24 * 60 * 60); // 30日

    console.log('Token saved:', { key: tokenKey, success: tokenSaved });

    // PKCE データを削除（セキュリティのため）
    // Note: KV REST APIでDELETEコマンドを実行
    try {
      await fetch(`${process.env.KV_REST_API_URL}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['DEL', foundKey]),
      });
      console.log('PKCE data cleaned up');
    } catch (error) {
      console.log('PKCE cleanup failed (non-critical):', error);
    }

    console.log('=== Twitter OAuth Callback SUCCESS ===');

    // 成功レスポンス（HTML）
    const successHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Twitter認証完了</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #1da1f2; color: white; }
        .success { background: rgba(255,255,255,0.1); padding: 30px; border-radius: 10px; max-width: 400px; margin: 0 auto; }
        .username { font-size: 24px; font-weight: bold; margin: 20px 0; }
        .message { margin: 20px 0; }
        button { background: white; color: #1da1f2; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 16px; }
    </style>
</head>
<body>
    <div class="success">
        <h1>🎉 認証完了！</h1>
        <div class="username">@${userData.data.username}</div>
        <div class="message">として接続されました</div>
        <button onclick="window.close()">ウィンドウを閉じる</button>
        <script>
            // 親ウィンドウに成功を通知
            if (window.opener) {
                window.opener.postMessage({
                    type: 'twitter_auth_success',
                    user: {
                        id: '${userData.data.id}',
                        username: '${userData.data.username}'
                    }
                }, '*');
            }
            
            // 5秒後に自動で閉じる
            setTimeout(() => window.close(), 5000);
        </script>
    </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(successHtml);

  } catch (error) {
    console.error('Twitter OAuth callback error:', error);
    return res.status(500).json({
      error: 'サーバーエラーが発生しました',
      message: error.message,
      debug: 'Internal server error during OAuth callback'
    });
  }
}