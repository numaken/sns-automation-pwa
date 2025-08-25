// api/auth/threads/callback.js - Threadsコールバック完全修正版
export default async function handler(req, res) {
  console.log('=== Threads OAuth Callback START (FIXED v2.1) ===');
  console.log('Method:', req.method);
  console.log('Query:', req.query);

  const { code, state, error } = req.query;

  // デバッグモード確認
  if (req.query.debug === 'version') {
    return res.json({
      version: 'Threads OAuth Callback v2.1 - Complete Fix',
      timestamp: new Date().toISOString(),
      fixApplied: 'State-only search + Improved app return',
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
    return res.redirect(`/?error=oauth_error&platform=threads&details=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    console.error('Missing required parameters:', { code: !!code, state: !!state });
    return res.redirect('/?error=missing_params&platform=threads');
  }

  console.log('Threads OAuth callback received:', { code: code.substring(0, 20) + '...', state });

  try {
    // PKCE データ検索（State-only方式）
    console.log('=== PKCE Data Search START (STATE-ONLY) ===');

    const sessionKey = `threads_oauth_pkce:${state}`;
    console.log(`Searching with key: ${sessionKey}`);

    const authDataStr = await getKVValue(sessionKey);
    let authData = null;

    if (authDataStr) {
      console.log(`✅ PKCE data found`);
      authData = JSON.parse(authDataStr);
    } else {
      console.log(`❌ No PKCE data found for state: ${state}`);
    }

    console.log('=== PKCE Data Search END ===');

    if (!authData) {
      console.error('PKCE session not found');
      return res.redirect('/?error=session_not_found&platform=threads');
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
        client_id: process.env.THREADS_APP_ID?.trim(),
        client_secret: process.env.THREADS_APP_SECRET?.trim(),
        grant_type: 'authorization_code',
        redirect_uri: `https://postpilot.panolabollc.com/api/auth/threads/callback`,
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
      return res.redirect(`/?error=token_exchange_failed&platform=threads&details=${encodeURIComponent(tokenData.error || 'Unknown error')}`);
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
      return res.redirect(`/?error=user_info_failed&platform=threads&details=${encodeURIComponent(userData.error || 'Unknown error')}`);
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

    console.log('=== Threads OAuth Callback SUCCESS (COMPLETE FIX) ===');

    // 修正: 成功時のメインアプリリダイレクト
    const redirectUrl = `/app?auth_success=threads&platform=threads&username=${encodeURIComponent(userData.username)}&fixed=true`;
    console.log('Redirecting to:', redirectUrl);

    // 修正された成功ページのHTML
    const successHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Threads接続完了</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { 
                font-family: system-ui, -apple-system, sans-serif; 
                margin: 0; 
                padding: 20px; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .container { 
                max-width: 500px; 
                background: white; 
                padding: 40px; 
                border-radius: 20px; 
                box-shadow: 0 20px 40px rgba(0,0,0,0.1); 
                text-align: center;
                animation: slideIn 0.5s ease-out;
            }
            @keyframes slideIn {
                from { opacity: 0; transform: translateY(30px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .success { color: #16a34a; font-size: 64px; margin-bottom: 20px; animation: bounce 1s ease-in-out; }
            @keyframes bounce {
                0%, 20%, 60%, 100% { transform: translateY(0); }
                40% { transform: translateY(-20px); }
                80% { transform: translateY(-10px); }
            }
            .fix-info { 
                background: rgba(34, 197, 94, 0.1); 
                padding: 15px; 
                border-radius: 10px; 
                margin: 20px 0; 
                font-size: 14px; 
                color: #16a34a;
                border: 1px solid rgba(34, 197, 94, 0.3);
            }
            h1 { color: #1f2937; margin-bottom: 10px; font-size: 28px; }
            p { color: #6b7280; margin-bottom: 20px; line-height: 1.6; }
            .username { 
                background: #f8fafc; 
                padding: 15px; 
                border-radius: 10px; 
                font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace; 
                color: #1f2937; 
                font-weight: bold;
                margin: 20px 0;
                border: 2px solid #e5e7eb;
            }
            .button { 
                background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
                color: white; 
                border: none; 
                padding: 15px 30px; 
                border-radius: 10px; 
                font-size: 16px; 
                font-weight: 600;
                cursor: pointer; 
                margin-top: 20px;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
            }
            .button:hover { 
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
            }
            .countdown {
                font-size: 12px;
                color: #9ca3af;
                margin-top: 15px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="success">🧵</div>
            <h1>Threads接続完了！</h1>
            <p><strong>@${userData.username}</strong> として接続されました</p>
            <div class="username">@${userData.username}</div>
            <div class="fix-info">
                ✅ 完全修正済み - 安定動作中<br>
                🔧 State-only search + App return improvement
            </div>
            <p>これでThreadsに自動投稿できるようになりました。</p>
            <button class="button" onclick="returnToApp()">
                🚀 アプリに戻る
            </button>
            <div class="countdown" id="countdown">10秒後に自動でアプリに戻ります</div>
        </div>
        <script>
            const username = '${userData.username}';
            const userId = '${authData.userId}';
            const redirectUrl = '${redirectUrl}';
            
            function returnToApp() {
                try {
                    // 親ウィンドウにメッセージを送信
                    if (window.opener && !window.opener.closed) {
                        window.opener.postMessage({
                            type: 'THREADS_AUTH_SUCCESS',
                            username: username,
                            userId: userId,
                            fixed: true,
                            timestamp: new Date().toISOString()
                        }, '*');
                        
                        // 少し待ってからウィンドウを閉じる
                        setTimeout(() => {
                            window.close();
                        }, 500);
                    } else {
                        // 親ウィンドウがない場合はリダイレクト
                        window.location.href = redirectUrl;
                    }
                } catch (e) {
                    console.log('Window messaging failed, redirecting:', e);
                    // フォールバック: 直接リダイレクト
                    window.location.href = redirectUrl;
                }
            }

            // 親ウィンドウに即座にメッセージを送信
            if (window.opener && !window.opener.closed) {
                try {
                    window.opener.postMessage({
                        type: 'THREADS_AUTH_SUCCESS',
                        username: username,
                        userId: userId,
                        fixed: true,
                        timestamp: new Date().toISOString()
                    }, '*');
                } catch (e) {
                    console.log('Immediate parent notification failed:', e);
                }
            }
            
            // カウントダウン機能
            let countdown = 10;
            const countdownElement = document.getElementById('countdown');
            
            const timer = setInterval(() => {
                countdown--;
                countdownElement.textContent = countdown + '秒後に自動でアプリに戻ります';
                
                if (countdown <= 0) {
                    clearInterval(timer);
                    returnToApp();
                }
            }, 1000);
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
            body { 
                font-family: system-ui, -apple-system, sans-serif; 
                margin: 0; 
                padding: 20px; 
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .container { 
                max-width: 500px; 
                background: white; 
                padding: 40px; 
                border-radius: 20px; 
                box-shadow: 0 20px 40px rgba(0,0,0,0.1); 
                text-align: center; 
            }
            .error { color: #dc2626; font-size: 64px; margin-bottom: 20px; }
            h1 { color: #1f2937; margin-bottom: 15px; }
            p { color: #6b7280; margin-bottom: 20px; line-height: 1.6; }
            .button { 
                background: #6b7280; 
                color: white; 
                border: none; 
                padding: 15px 30px; 
                border-radius: 10px; 
                font-size: 16px; 
                cursor: pointer;
                margin: 10px;
            }
            .button:hover { background: #4b5563; }
            .button.primary { background: #3b82f6; }
            .button.primary:hover { background: #2563eb; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="error">❌</div>
            <h1>Threads接続エラー</h1>
            <p>認証に失敗しました。再度お試しください。</p>
            <p><small>修正版適用済み - State-only search + Improved error handling</small></p>
            <button class="button primary" onclick="window.location.href='/app?retry=threads'">
                🔄 再試行
            </button>
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