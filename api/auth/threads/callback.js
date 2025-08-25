// Threads OAuth認証完了API
export default async function handler(req, res) {
  const { code, state } = req.query;

  if (!code || !state) {
    return res.status(400).json({ error: '認証コードまたは状態が無効です' });
  }

  try {
    const userId = state;

    // PKCEデータの取得
    const sessionKey = `threads_oauth_pkce:${userId}`;
    const authDataStr = await getKVValue(sessionKey);

    if (!authDataStr) {
      console.error('Threads PKCE session not found:', sessionKey);
      return res.status(400).json({
        error: 'セッションが見つかりません。再度認証を開始してください。',
        sessionKey
      });
    }

    const authData = JSON.parse(authDataStr);
    console.log('Threads PKCE session found:', { userId, sessionKey });

    // デバッグ：環境変数を確認
    console.log('Callback THREADS_APP_ID debug:', {
      raw: process.env.THREADS_APP_ID,
      type: typeof process.env.THREADS_APP_ID,
      length: process.env.THREADS_APP_ID?.length,
      trimmed: process.env.THREADS_APP_ID?.trim(),
      exists: !!process.env.THREADS_APP_ID
    });

    // アクセストークンの取得
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

    if (!tokenResponse.ok) {
      console.error('Threads token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        tokenData,
        requestDetails: {
          client_id: process.env.THREADS_APP_ID?.trim(),
          has_secret: !!process.env.THREADS_APP_SECRET,
          redirect_uri: `https://postpilot.panolabollc.com/api/auth/threads/callback`,
          code_length: code?.length
        }
      });
      return res.status(400).json({
        error: 'トークンの取得に失敗しました',
        details: tokenData.error_description || tokenData.error || 'Unknown error',
        status: tokenResponse.status,
        debug_info: tokenData
      });
    }

    // ユーザー情報の取得
    const userResponse = await fetch(`https://graph.threads.net/v1.0/me?fields=id,username&access_token=${tokenData.access_token}`);
    const userData = await userResponse.json();

    if (!userResponse.ok) {
      console.error('Threads user info failed:', userData);
      return res.status(400).json({
        error: 'ユーザー情報の取得に失敗しました'
      });
    }

    // トークンの保存（30日間）
    const tokenKey = `threads_token:${userId}`;
    await setKVValue(tokenKey, tokenData.access_token, 86400 * 30);

    // ユーザー情報の保存
    const userInfoKey = `threads_user:${userId}`;
    await setKVValue(userInfoKey, JSON.stringify({
      threadsId: userData.id,
      username: userData.username,
      connectedAt: new Date().toISOString()
    }), 86400 * 30);

    // PKCEセッションの削除
    await deleteKVValue(sessionKey);

    console.log('Threads OAuth completed:', { userId, username: userData.username });

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
            <p>これでThreadsに自動投稿できるようになりました。</p>
            <button class="button" onclick="goBackToApp();">
                アプリに戻る
            </button>
        </div>
        <script>
            // 親ウィンドウにメッセージを送信
            if (window.opener) {
                // 親ウィンドウのlocalStorageに接続情報を保存
                try {
                    window.opener.localStorage.setItem('threads_token', 'connected');
                    window.opener.localStorage.setItem('threads_username', '${userData.username}');
                    window.opener.localStorage.setItem('threads_user_id', '${userId}');
                    window.opener.localStorage.setItem('threads_connected', 'true');
                } catch (e) {
                    console.log('Could not set localStorage:', e);
                }
                
                window.opener.postMessage({
                    type: 'THREADS_AUTH_SUCCESS',
                    username: '${userData.username}',
                    userId: '${userId}'
                }, '*');
                
                // 成功メッセージを送信後、少し待ってからリロード
                setTimeout(() => {
                    try {
                        window.opener.location.reload();
                    } catch (e) {
                        console.log('Could not reload parent window:', e);
                    }
                }, 500);
            }
            
            // 3秒後に自動でウィンドウを閉じる（または親ウィンドウに戻る）
            setTimeout(() => {
                try {
                    if (window.opener) {
                        window.close();
                    } else {
                        // popup ではない場合はアプリに戻る
                        window.location.href = 'https://postpilot.panolabollc.com/';
                    }
                } catch (e) {
                    // エラーが発生した場合はアプリに戻る
                    window.location.href = 'https://postpilot.panolabollc.com/';
                }
            }, 3000);
            
            // ボタンクリック時の処理も改善
            function goBackToApp() {
                try {
                    if (window.opener) {
                        window.opener.location.reload();
                        window.close();
                    } else {
                        window.location.href = 'https://postpilot.panolabollc.com/';
                    }
                } catch (e) {
                    window.location.href = 'https://postpilot.panolabollc.com/';
                }
            }
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
}

async function setKVValue(key, value, ttl = null) {
  const command = ttl
    ? ['SETEX', key, ttl, value.toString()]
    : ['SET', key, value.toString()];

  await fetch(`${process.env.KV_REST_API_URL}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
}

async function deleteKVValue(key) {
  await fetch(`${process.env.KV_REST_API_URL}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(['DEL', key]),
  });
}