// Threads OAuth認証完了API（State-only修正版）
export default async function handler(req, res) {
  console.log('=== Threads OAuth Callback START (FIXED) ===');
  console.log('Method:', req.method);
  console.log('Query:', req.query);

  const { code, state, error } = req.query;

  // デバッグモード確認
  if (req.query.debug === 'version') {
    return res.json({
      version: 'Threads OAuth Callback v2.0 - State-only修正版',
      timestamp: new Date().toISOString(),
      fixApplied: 'Simplified PKCE search using state-only key',
      environment: {
        hasThreadsAppId: !!process.env.THREADS_APP_ID,
        hasThreadsAppSecret: !!process.env.THREADS_APP_SECRET,
        hasKvUrl: !!process.env.KV_REST_API_URL,
        hasKvToken: !!process.env.KV_REST_API_TOKEN
      }
    });
  }

  // OAuth認証エラーのチェック
  if (error) {
    console.error('Threads OAuth error received:', error);
    return res.status(400).json({
      error: 'Threads OAuth認証でエラーが発生しました',
      details: error,
      debug: 'OAuth provider returned error'
    });
  }

  if (!code || !state) {
    console.error('Missing required parameters:', { code: !!code, state: !!state });
    return res.status(400).json({
      error: '認証コードまたは状態が無効です',
      received: { code: !!code, state: !!state },
      debug: 'Required OAuth parameters missing'
    });
  }

  console.log('Threads OAuth callback received:', { code: code.substring(0, 20) + '...', state });

  try {
    // 🔧 修正: シンプルなPKCEデータ検索（stateのみ使用）
    console.log('=== PKCE Data Search START (SIMPLIFIED) ===');

    const sessionKey = `threads_oauth_pkce:${state}`;
    console.log(`Searching with simplified key: ${sessionKey}`);

    const authDataStr = await getKVValue(sessionKey);
    let authData = null;

    if (authDataStr) {
      console.log(`✅ PKCE data found with state-only key`);
      authData = JSON.parse(authDataStr);
    } else {
      console.log(`❌ No PKCE data found for state: ${state}`);
    }

    console.log('=== PKCE Data Search END ===');

    if (!authData) {
      console.error('PKCE session not found with simplified search');

      // KV接続テスト
      const testKey = 'callback_test_' + Date.now();
      const testValue = 'test_data';
      const saveResult = await setKVValue(testKey, testValue, 60);
      const readResult = await getKVValue(testKey);

      return res.status(400).json({
        error: 'セッションが見つかりません。再度認証を開始してください。',
        state: state,
        debug: 'PKCE data not found - simplified search used',
        searchMethod: 'state-only key',
        sessionKey: sessionKey,
        kvConnectionTest: {
          save: saveResult,
          read: readResult === testValue
        },
        fixApplied: true,
        timestamp: new Date().toISOString()
      });
    }

    console.log('Found PKCE data:', {
      sessionKey,
      userId: authData.userId,
      codeVerifier: authData.codeVerifier?.substring(0, 10) + '...',
      timestamp: authData.timestamp
    });

    // アクセストークンの取得
    console.log('=== Token Exchange START ===');

    const tokenResponse = await fetch('https://graph.threads.net/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.THREADS_APP_ID,
        client_secret: process.env.THREADS_APP_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: `https://sns-automation-pwa.vercel.app/api/auth/threads/callback`,
        code: code,
        code_verifier: authData.codeVerifier
      })
    });

    const tokenData = await tokenResponse.json();

    console.log('Token response:', {
      status: tokenResponse.status,
      hasAccessToken: !!tokenData.access_token,
      error: tokenData.error
    });

    if (!tokenResponse.ok) {
      console.error('Threads token exchange failed:', tokenData);
      return res.status(400).json({
        error: 'トークンの取得に失敗しました',
        details: tokenData.error_description || tokenData.error,
        debug: 'Threads token exchange failed'
      });
    }

    // ユーザー情報の取得
    console.log('=== User Info Fetch START ===');

    const userResponse = await fetch(`https://graph.threads.net/v1.0/me?fields=id,username&access_token=${tokenData.access_token}`);
    const userData = await userResponse.json();

    console.log('User data response:', {
      status: userResponse.status,
      hasData: !!userData.id,
      username: userData.username,
      error: userData.error
    });

    if (!userResponse.ok) {
      console.error('Threads user info failed:', userData);
      return res.status(400).json({
        error: 'ユーザー情報の取得に失敗しました',
        details: userData.error,
        debug: 'Threads user info fetch failed'
      });
    }

    // トークンの保存（30日間）
    console.log('=== Token Storage START ===');

    const tokenKey = `threads_token:${authData.userId}`;
    await setKVValue(tokenKey, tokenData.access_token, 86400 * 30);

    // ユーザー情報の保存
    const userInfoKey = `threads_user:${authData.userId}`;
    await setKVValue(userInfoKey, JSON.stringify({
      threadsId: userData.id,
      username: userData.username,
      connectedAt: new Date().toISOString()
    }), 86400 * 30);

    console.log('Token saved:', { key: tokenKey, userInfoKey, success: true });

    // PKCEセッションの削除
    try {
      await deleteKVValue(sessionKey);
      console.log('PKCE data cleaned up:', sessionKey);
    } catch (error) {
      console.log('PKCE cleanup failed (non-critical):', error);
    }

    console.log('=== Threads OAuth Callback SUCCESS (FIXED) ===');

    // 成功ページのHTML
    const successHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Threads接続完了</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .container { max-width: 400px; margin: 50px auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
            .success { color: #16a34a; font-size: 48px; margin-bottom: 20px; }
            .fix-info { background: rgba(0,255,0,0.1); padding: 15px; border-radius: 5px; margin: 15px 0; font-size: 14px; }
            h1 { color: #333; margin-bottom: 10px; }
            p { color: #666; margin-bottom: 20px; }
            .username { background: #f3f4f6; padding: 10px; border-radius: 5px; font-family: monospace; color: #333; }
            .button { background: #8b5cf6; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; cursor: pointer; margin-top: 20px; }
            .button:hover { background: #7c3aed; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="success">🧵</div>
            <h1>Threads接続完了！</h1>
            <p><strong>@${userData.username}</strong> として接続されました</p>
            <div class="username">@${userData.username}</div>
            <div class="fix-info">✅ State-only修正済み - 安定動作中</div>
            <p>これでThreadsに自動投稿できるようになりました。</p>
            <button class="button" onclick="closeWindow()">
                アプリに戻る
            </button>
        </div>
        <script>
            function closeWindow() {
              try {
                if (window.opener && !window.opener.closed) {
                  window.opener.postMessage({
                    type: 'THREADS_AUTH_SUCCESS',
                    username: '${userData.username}',
                    userId: '${authData.userId}',
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
                  window.location.href = 'https://sns-automation-pwa.vercel.app?threads_auth=success&username=${userData.username}&fixed=true';
                }
              }
            }

            // 親ウィンドウにメッセージを送信
            if (window.opener) {
                try {
                    window.opener.postMessage({
                        type: 'THREADS_AUTH_SUCCESS',
                        username: '${userData.username}',
                        userId: '${authData.userId}',
                        fixed: true
                    }, '*');
                } catch (e) {
                    console.log('Parent window notification failed:', e);
                }
            }
            
            // 10秒後に自動でウィンドウを閉じる
            setTimeout(() => {
                closeWindow();
            }, 10000);
        </script>
    </body>
    </html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(successHtml);

  } catch (error) {
    console.error('Threads OAuth callback error:', error);

    const errorHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Threads接続エラー</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .container { max-width: 400px; margin: 50px auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
            .error { color: #dc2626; font-size: 48px; margin-bottom: 20px; }
            h1 { color: #333; margin-bottom: 10px; }
            p { color: #666; margin-bottom: 20px; }
            .button { background: #6b7280; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; cursor: pointer; }
            .button:hover { background: #4b5563; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="error">❌</div>
            <h1>Threads接続エラー</h1>
            <p>認証に失敗しました。再度お試しください。</p>
            <p>修正版適用済み - State-only search</p>
            <button class="button" onclick="window.close();">
                閉じる
            </button>
        </div>
    </body>
    </html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(500).send(errorHtml);
  }
}

// KVストレージヘルパー関数
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
    console.log(`KV GET response for ${key}:`, { status: response.status, result });

    if (!response.ok) {
      return null;
    }

    return result.result;
  } catch (error) {
    console.error(`KV GET error for ${key}:`, error);
    return null;
  }
}

async function setKVValue(key, value, ttl = null) {
  try {
    const command = ttl
      ? ['SETEX', key, ttl, value.toString()]
      : ['SET', key, value.toString()];

    const response = await fetch(`${process.env.KV_REST_API_URL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });

    const result = await response.json();
    console.log(`KV SET response for ${key}:`, { status: response.status, result });

    return response.ok;
  } catch (error) {
    console.error(`KV SET error for ${key}:`, error);
    return false;
  }
}

async function deleteKVValue(key) {
  try {
    await fetch(`${process.env.KV_REST_API_URL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['DEL', key]),
    });
    return true;
  } catch (error) {
    console.error(`KV DELETE error for ${key}:`, error);
    return false;
  }
}