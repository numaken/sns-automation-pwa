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
  console.log('=== Twitter OAuth Callback START (FIXED) ===');
  console.log('Method:', req.method);
  console.log('Query:', req.query);

  const { code, state, error } = req.query;

  // デバッグモード確認
  if (req.query.debug === 'version') {
    return res.json({
      version: 'Twitter OAuth Callback v3.0 - UserID問題修正版',
      timestamp: new Date().toISOString(),
      fixApplied: 'Simplified PKCE search using state-only key',
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

    if (error === 'access_denied') {
      console.log('User cancelled Twitter OAuth');
      return res.redirect('/?error=twitter_cancelled&message=' + encodeURIComponent('Twitter認証がキャンセルされました'));
    }

    return res.status(400).json({
      error: 'OAuth認証でエラーが発生しました',
      details: error,
      debug: 'OAuth provider returned error',
      error_type: error
    });
  }

  // 必須パラメータの確認
  if (!code || !state) {
    console.error('Missing required parameters:', { code: !!code, state: !!state });
    return res.status(400).json({
      error: 'Missing code or state',
      received: { code: !!code, state: !!state },
      debug: 'Required OAuth parameters missing',
      version: 'v3.0-fixed'
    });
  }

  try {
    // 🔧 修正: シンプルなPKCEデータ検索（stateのみ使用）
    console.log('=== PKCE Data Search START (SIMPLIFIED) ===');

    const kvKey = `twitter_oauth_pkce:${state}`;
    console.log(`Searching with simplified key: ${kvKey}`);

    const data = await getKVValue(kvKey);
    let pkceData = null;

    if (data) {
      console.log(`✅ PKCE data found with state-only key`);
      pkceData = JSON.parse(data);
    } else {
      console.log(`❌ No PKCE data found for state: ${state}`);
    }

    console.log('=== PKCE Data Search END ===');

    if (!pkceData) {
      console.error('PKCE data not found with simplified search');

      // KV接続テスト
      const testKey = 'callback_test_' + Date.now();
      const testValue = 'test_data';
      const saveResult = await setKVValue(testKey, testValue, 60);
      const readResult = await getKVValue(testKey);

      return res.status(400).json({
        error: 'Invalid or expired state',
        state: state,
        debug: 'PKCE data not found - simplified search used',
        searchMethod: 'state-only key',
        kvKey: kvKey,
        kvConnectionTest: {
          save: saveResult,
          read: readResult === testValue
        },
        fixApplied: true,
        timestamp: new Date().toISOString()
      });
    }

    console.log('Found PKCE data:', {
      kvKey,
      userId: pkceData.userId,
      codeVerifier: pkceData.codeVerifier?.substring(0, 10) + '...',
      timestamp: pkceData.timestamp
    });

    // アクセストークンの取得
    console.log('=== Token Exchange START ===');

    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.TWITTER_CLIENT_ID,
      code: code,
      redirect_uri: process.env.TWITTER_CALLBACK_URL || 'https://postpilot.panolabollc.com/api/auth/twitter/callback',
      code_verifier: pkceData.codeVerifier,
    });

    console.log('Token request params:', {
      grant_type: 'authorization_code',
      client_id: process.env.TWITTER_CLIENT_ID?.substring(0, 10) + '...',
      code: code.substring(0, 10) + '...',
      redirect_uri: process.env.TWITTER_CALLBACK_URL || 'https://postpilot.panolabollc.com/api/auth/twitter/callback',
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
    try {
      await fetch(`${process.env.KV_REST_API_URL}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['DEL', kvKey]),
      });
      console.log('PKCE data cleaned up:', kvKey);
    } catch (error) {
      console.log('PKCE cleanup failed (non-critical):', error);
    }

    console.log('=== Twitter OAuth Callback SUCCESS (FIXED) ===');


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
        .fix-info { background: rgba(0,255,0,0.1); padding: 15px; border-radius: 5px; margin: 15px 0; font-size: 14px; }
        button { background: white; color: #1da1f2; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 16px; margin: 5px; }
        .auto-close { font-size: 12px; opacity: 0.8; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="success">
        <h1>🎉 認証完了！</h1>
        <div class="username">@${userData.data.username}</div>
        <div class="message">として接続されました</div>
        <div class="fix-info">✅ UserID問題修正済み - 安定動作中</div>
        <button onclick="closeWindow()">ウィンドウを閉じる</button>
        <button onclick="window.location.href='https://postpilot.panolabollc.com'">メインページに戻る</button>
        <div class="auto-close">このウィンドウは10秒後に自動で閉じます</div>
        <script>
            function closeWindow() {
              try {
                if (window.opener && !window.opener.closed) {
                  window.opener.postMessage({
                    type: 'twitter_auth_complete',
                    success: true,
                    username: '${userData.data.username}',
                    fixed: true
                  }, '*');
                }
                window.close();
              } catch (e) {
                try {
                  window.opener = null;
                  window.open('', '_self');
                  window.close();
                } catch (e2) {
                  window.location.href = 'https://postpilot.panolabollc.com?twitter_auth=success&username=${userData.data.username}&fixed=true';
                }
              }
            }            
            
            // 親ウィンドウに成功を通知
            if (window.opener) {
                try {
                    window.opener.postMessage({
                        type: 'twitter_auth_success',
                        user: {
                            id: '${userData.data.id}',
                            username: '${userData.data.username}'
                        },
                        fixed: true
                    }, '*');
                } catch (e) {
                    console.log('Parent window notification failed:', e);
                }
            }
            
            // 10秒後に自動で閉じる
            setTimeout(() => {
                closeWindow();
            }, 10000);
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
      debug: 'Internal server error during OAuth callback',
      version: 'v3.0-fixed'
    });
  }
}