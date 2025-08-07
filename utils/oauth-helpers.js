// OAuth共通ヘルパー関数

// ユーザーIDを生成（簡易版）
export function generateUserId() {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// OAuth認証開始
export async function startOAuthFlow(platform, userId) {
  try {
    const response = await fetch(`/api/auth/${platform}/authorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId })
    });

    if (!response.ok) {
      throw new Error(`OAuth start failed: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`${platform} OAuth start error:`, error);
    throw error;
  }
}

// OAuth接続状態の確認
export async function checkOAuthConnection(platform, userId) {
  try {
    const response = await fetch(`/api/auth/${platform}/status?userId=${userId}`);

    if (!response.ok) {
      if (response.status === 404) {
        return { connected: false, message: `${platform}アカウントが接続されていません` };
      }
      throw new Error(`Connection check failed: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`${platform} connection check error:`, error);
    return { connected: false, error: error.message };
  }
}

// SNS投稿実行
export async function postToSNS(platform, content, userId) {
  try {
    const response = await fetch(`/api/post-to-${platform}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: content,
        text: content, // Threads互換性のため
        userId: userId
      })
    });

    const data = await response.json();

    if (!response.ok) {
      // エラーコードに応じた処理
      if (data.code === 'PREMIUM_REQUIRED') {
        throw new Error('プレミアムプラン限定機能です');
      }

      if (data.code === 'TWITTER_NOT_CONNECTED' || data.code === 'THREADS_NOT_CONNECTED') {
        throw new Error(`${platform}アカウントの接続が必要です`);
      }

      if (data.code === 'TOKEN_EXPIRED' || data.code === 'TWITTER_AUTH_ERROR' || data.code === 'THREADS_AUTH_ERROR') {
        throw new Error(`${platform}の再認証が必要です`);
      }

      throw new Error(data.error || `${platform}投稿に失敗しました`);
    }

    return data;
  } catch (error) {
    console.error(`${platform} post error:`, error);
    throw error;
  }
}

// OAuth認証ウィンドウを開く
export function openOAuthWindow(authUrl, onSuccess, onError) {
  const popup = window.open(
    authUrl,
    'oauth',
    'width=600,height=700,scrollbars=yes,resizable=yes'
  );

  // ポップアップの監視
  const checkClosed = setInterval(() => {
    if (popup.closed) {
      clearInterval(checkClosed);

      // URLパラメータから成功/エラーを判定
      const urlParams = new URLSearchParams(window.location.search);

      if (urlParams.get('twitter_connected') === 'success' || urlParams.get('threads_connected') === 'success') {
        const username = urlParams.get('username');
        onSuccess && onSuccess(username);

        // URLパラメータをクリーンアップ
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (urlParams.get('error')) {
        const error = urlParams.get('error');
        onError && onError(error);

        // URLパラメータをクリーンアップ
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, 1000);

  // タイムアウト（5分）
  setTimeout(() => {
    if (!popup.closed) {
      popup.close();
      clearInterval(checkClosed);
      onError && onError('Authentication timeout');
    }
  }, 300000);
}

// ローカルストレージにユーザーIDを保存
export function saveUserId(userId) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('sns_automation_user_id', userId);
  }
}

// ローカルストレージからユーザーIDを取得
export function getUserId() {
  if (typeof window !== 'undefined') {
    let userId = localStorage.getItem('sns_automation_user_id');
    if (!userId) {
      userId = generateUserId();
      saveUserId(userId);
    }
    return userId;
  }
  return null;
}

// OAuth接続状態をまとめて確認
export async function checkAllConnections(userId) {
  const results = {
    twitter: { connected: false },
    threads: { connected: false }
  };

  try {
    const [twitterStatus, threadsStatus] = await Promise.allSettled([
      checkOAuthConnection('twitter', userId),
      checkOAuthConnection('threads', userId)
    ]);

    if (twitterStatus.status === 'fulfilled') {
      results.twitter = twitterStatus.value;
    }

    if (threadsStatus.status === 'fulfilled') {
      results.threads = threadsStatus.value;
    }

    return results;
  } catch (error) {
    console.error('Connection check error:', error);
    return results;
  }
}