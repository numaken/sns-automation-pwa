// SNS接続状態管理カスタムフック
import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://sns-automation-pwa.vercel.app'
  : '';

export const useSnsConnection = (userId) => {
  // 接続状態管理
  const [connections, setConnections] = useState({
    twitter: {
      connected: false,
      username: null,
      loading: false,
      error: null
    },
    threads: {
      connected: false,
      username: null,
      loading: false,
      error: null
    }
  });

  // 全体のローディング状態
  const [isLoading, setIsLoading] = useState(false);

  // 接続状態をチェック
  const checkConnectionStatus = useCallback(async (platform) => {
    if (!userId) return;

    setConnections(prev => ({
      ...prev,
      [platform]: { ...prev[platform], loading: true, error: null }
    }));

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/${platform}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      });

      const data = await response.json();

      if (response.ok) {
        setConnections(prev => ({
          ...prev,
          [platform]: {
            connected: data.connected,
            username: data.username,
            loading: false,
            error: null
          }
        }));
      } else {
        setConnections(prev => ({
          ...prev,
          [platform]: {
            connected: false,
            username: null,
            loading: false,
            error: data.error || 'Connection check failed'
          }
        }));
      }
    } catch (error) {
      console.error(`${platform} connection check error:`, error);
      setConnections(prev => ({
        ...prev,
        [platform]: {
          connected: false,
          username: null,
          loading: false,
          error: 'Network error'
        }
      }));
    }
  }, [userId]);

  // すべてのプラットフォームの接続状態をチェック
  const checkAllConnections = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    await Promise.all([
      checkConnectionStatus('twitter'),
      checkConnectionStatus('threads')
    ]);
    setIsLoading(false);
  }, [userId, checkConnectionStatus]);

  // OAuth認証を開始
  const startOAuthFlow = useCallback(async (platform) => {
    if (!userId) {
      console.error('User ID is required for OAuth flow');
      return;
    }

    setConnections(prev => ({
      ...prev,
      [platform]: { ...prev[platform], loading: true, error: null }
    }));

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/${platform}/authorize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      });

      const data = await response.json();

      if (response.ok && data.authUrl) {
        // 新しいウィンドウでOAuth認証を開始
        const authWindow = window.open(
          data.authUrl,
          `${platform}_oauth`,
          'width=600,height=700,scrollbars=yes,resizable=yes'
        );

        // 認証完了を監視
        const checkClosed = setInterval(() => {
          if (authWindow.closed) {
            clearInterval(checkClosed);
            // 認証完了後、接続状態を再確認
            setTimeout(() => {
              checkConnectionStatus(platform);
            }, 1000);
          }
        }, 1000);

      } else {
        setConnections(prev => ({
          ...prev,
          [platform]: {
            ...prev[platform],
            loading: false,
            error: data.error || 'Failed to start OAuth flow'
          }
        }));
      }
    } catch (error) {
      console.error(`${platform} OAuth error:`, error);
      setConnections(prev => ({
        ...prev,
        [platform]: {
          ...prev[platform],
          loading: false,
          error: 'Network error'
        }
      }));
    }
  }, [userId, checkConnectionStatus]);

  // 接続を切断
  const disconnect = useCallback(async (platform) => {
    if (!userId) return;

    setConnections(prev => ({
      ...prev,
      [platform]: { ...prev[platform], loading: true }
    }));

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/${platform}/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      });

      if (response.ok) {
        setConnections(prev => ({
          ...prev,
          [platform]: {
            connected: false,
            username: null,
            loading: false,
            error: null
          }
        }));
      } else {
        const data = await response.json();
        setConnections(prev => ({
          ...prev,
          [platform]: {
            ...prev[platform],
            loading: false,
            error: data.error || 'Disconnect failed'
          }
        }));
      }
    } catch (error) {
      console.error(`${platform} disconnect error:`, error);
      setConnections(prev => ({
        ...prev,
        [platform]: {
          ...prev[platform],
          loading: false,
          error: 'Network error'
        }
      }));
    }
  }, [userId]);

  // 初期化時に接続状態をチェック
  useEffect(() => {
    if (userId) {
      checkAllConnections();
    }
  }, [userId, checkAllConnections]);

  // 接続済みプラットフォーム数を計算
  const connectedCount = connections.twitter.connected + connections.threads.connected;

  // 全体のエラー状態
  const hasError = connections.twitter.error || connections.threads.error;

  return {
    // 接続状態
    connections,
    isLoading,
    connectedCount,
    hasError,

    // アクション
    startOAuthFlow,
    disconnect,
    checkConnectionStatus,
    checkAllConnections,

    // ヘルパー
    isConnected: (platform) => connections[platform]?.connected || false,
    getUsername: (platform) => connections[platform]?.username || null,
    getError: (platform) => connections[platform]?.error || null,
    isLoadingPlatform: (platform) => connections[platform]?.loading || false,

    // 便利な状態
    canPost: connectedCount > 0,
    allConnected: connectedCount === 2,
    someConnected: connectedCount > 0,
    noneConnected: connectedCount === 0
  };
};