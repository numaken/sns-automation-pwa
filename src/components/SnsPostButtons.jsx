import React, { useState, useEffect } from 'react';
import { Twitter, MessageCircle, Link, CheckCircle, AlertCircle, Settings } from 'lucide-react';

// OAuth共通ヘルパー関数をインライン定義（localStorage使用不可のため）
const OAuthHelpers = {
  generateUserId() {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  async startOAuthFlow(platform, userId) {
    const response = await fetch(`/api/auth/${platform}/authorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });

    if (!response.ok) {
      throw new Error(`OAuth start failed: ${response.status}`);
    }

    return await response.json();
  },

  async checkOAuthConnection(platform, userId) {
    try {
      const response = await fetch(`/api/auth/${platform}/status?userId=${userId}`);

      if (!response.ok) {
        if (response.status === 404) {
          return { connected: false, message: `${platform}アカウントが接続されていません` };
        }
        throw new Error(`Connection check failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      return { connected: false, error: error.message };
    }
  },

  async postToSNS(platform, content, userId) {
    const response = await fetch(`/api/post-to-${platform}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: content,
        text: content, // 両方を送信（互換性確保）
        userId: userId
      })
    });

    const data = await response.json();

    if (!response.ok) {
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
  },

  openOAuthWindow(authUrl, onSuccess, onError) {
    const popup = window.open(authUrl, 'oauth', 'width=600,height=700,scrollbars=yes,resizable=yes');

    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);

        const urlParams = new URLSearchParams(window.location.search);

        if (urlParams.get('twitter_connected') === 'success' || urlParams.get('threads_connected') === 'success') {
          const username = urlParams.get('username');
          onSuccess && onSuccess(username);
          window.history.replaceState({}, document.title, window.location.pathname);
        } else if (urlParams.get('error')) {
          const error = urlParams.get('error');
          onError && onError(error);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    }, 1000);

    setTimeout(() => {
      if (!popup.closed) {
        popup.close();
        clearInterval(checkClosed);
        onError && onError('Authentication timeout');
      }
    }, 300000);
  }
};

const SnsPostButtons = ({ generatedPost, userPlan = 'free' }) => {
  const [userId] = useState(() => OAuthHelpers.generateUserId());
  const [connections, setConnections] = useState({
    twitter: { connected: false, loading: true },
    threads: { connected: false, loading: true }
  });
  const [posting, setPosting] = useState({
    twitter: false,
    threads: false
  });
  const [results, setResults] = useState({
    twitter: null,
    threads: null
  });

  // コンポーネント初期化時にOAuth接続状態をチェック
  useEffect(() => {
    checkAllConnections();
  }, []);

  const checkAllConnections = async () => {
    setConnections(prev => ({
      twitter: { ...prev.twitter, loading: true },
      threads: { ...prev.threads, loading: true }
    }));

    try {
      const [twitterStatus, threadsStatus] = await Promise.allSettled([
        OAuthHelpers.checkOAuthConnection('twitter', userId),
        OAuthHelpers.checkOAuthConnection('threads', userId)
      ]);

      setConnections({
        twitter: {
          connected: twitterStatus.status === 'fulfilled' ? twitterStatus.value.connected : false,
          loading: false,
          username: twitterStatus.status === 'fulfilled' ? twitterStatus.value.username : null,
          error: twitterStatus.status === 'rejected' ? twitterStatus.reason.message : null
        },
        threads: {
          connected: threadsStatus.status === 'fulfilled' ? threadsStatus.value.connected : false,
          loading: false,
          username: threadsStatus.status === 'fulfilled' ? threadsStatus.value.username : null,
          error: threadsStatus.status === 'rejected' ? threadsStatus.reason.message : null
        }
      });
    } catch (error) {
      console.error('Connection check failed:', error);
      setConnections({
        twitter: { connected: false, loading: false, error: error.message },
        threads: { connected: false, loading: false, error: error.message }
      });
    }
  };

  const handleOAuthConnect = async (platform) => {
    try {
      setConnections(prev => ({
        ...prev,
        [platform]: { ...prev[platform], loading: true }
      }));

      const oauthData = await OAuthHelpers.startOAuthFlow(platform, userId);

      OAuthHelpers.openOAuthWindow(
        oauthData.authUrl,
        (username) => {
          setConnections(prev => ({
            ...prev,
            [platform]: { connected: true, loading: false, username }
          }));
          alert(`${platform === 'twitter' ? 'Twitter' : 'Threads'}アカウント「@${username}」を接続しました！`);
        },
        (error) => {
          setConnections(prev => ({
            ...prev,
            [platform]: { connected: false, loading: false, error }
          }));
          alert(`${platform === 'twitter' ? 'Twitter' : 'Threads'}認証に失敗しました: ${error}`);
        }
      );
    } catch (error) {
      console.error(`${platform} OAuth error:`, error);
      setConnections(prev => ({
        ...prev,
        [platform]: { connected: false, loading: false, error: error.message }
      }));
      alert(`OAuth認証の開始に失敗しました: ${error.message}`);
    }
  };

  const handlePost = async (platform) => {
    if (!generatedPost) {
      alert('投稿内容を生成してください');
      return;
    }

    if (userPlan !== 'premium') {
      alert('SNS投稿機能はプレミアムプラン限定です。アップグレードしてください。');
      return;
    }

    if (!connections[platform].connected) {
      alert(`まず${platform === 'twitter' ? 'Twitter' : 'Threads'}アカウントを接続してください`);
      return;
    }

    setPosting(prev => ({ ...prev, [platform]: true }));
    setResults(prev => ({ ...prev, [platform]: null }));

    try {
      const result = await OAuthHelpers.postToSNS(platform, generatedPost, userId);

      setResults(prev => ({
        ...prev,
        [platform]: {
          success: true,
          message: result.message,
          url: result.tweetUrl || result.threadsUrl,
          id: result.tweetId || result.threadId
        }
      }));

      alert(`${platform === 'twitter' ? 'Twitter' : 'Threads'}に投稿しました！`);
    } catch (error) {
      console.error(`${platform} post error:`, error);

      setResults(prev => ({
        ...prev,
        [platform]: {
          success: false,
          error: error.message
        }
      }));

      // 認証エラーの場合は再接続を促す
      if (error.message.includes('認証') || error.message.includes('接続')) {
        setConnections(prev => ({
          ...prev,
          [platform]: { ...prev[platform], connected: false }
        }));
      }

      alert(`投稿に失敗しました: ${error.message}`);
    } finally {
      setPosting(prev => ({ ...prev, [platform]: false }));
    }
  };

  const PlatformButton = ({ platform, icon: Icon, name, color }) => {
    const connection = connections[platform];
    const isPosting = posting[platform];
    const result = results[platform];

    return (
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Icon className={`h-5 w-5 ${color}`} />
            <span className="font-medium">{name}</span>
          </div>

          {connection.loading ? (
            <div className="text-gray-500 text-sm">確認中...</div>
          ) : connection.connected ? (
            <div className="flex items-center space-x-1 text-green-600 text-sm">
              <CheckCircle className="h-4 w-4" />
              <span>@{connection.username}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 text-gray-500 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>未接続</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {!connection.connected ? (
            <button
              onClick={() => handleOAuthConnect(platform)}
              disabled={connection.loading}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <Settings className="h-4 w-4" />
              <span>{connection.loading ? '確認中...' : `${name}を接続`}</span>
            </button>
          ) : (
            <button
              onClick={() => handlePost(platform)}
              disabled={isPosting || !generatedPost || userPlan !== 'premium'}
              className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <Icon className="h-4 w-4" />
              <span>{isPosting ? '投稿中...' : `${name}に投稿`}</span>
            </button>
          )}

          {userPlan !== 'premium' && (
            <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
              プレミアムプランで投稿機能が利用できます
            </p>
          )}
        </div>

        {result && (
          <div className={`p-2 rounded text-sm ${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
            {result.success ? (
              <div className="space-y-1">
                <p>{result.message}</p>
                {result.url && (
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                  >
                    <Link className="h-3 w-3" />
                    <span>投稿を確認</span>
                  </a>
                )}
              </div>
            ) : (
              <p>エラー: {result.error}</p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">SNS投稿</h3>
        <button
          onClick={checkAllConnections}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
        >
          <Settings className="h-4 w-4" />
          <span>接続状態を更新</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PlatformButton
          platform="twitter"
          icon={Twitter}
          name="Twitter"
          color="text-blue-500"
        />

        <PlatformButton
          platform="threads"
          icon={MessageCircle}
          name="Threads"
          color="text-purple-500"
        />
      </div>

      {!generatedPost && (
        <p className="text-center text-gray-500 text-sm py-4">
          まずAI投稿生成を行ってください
        </p>
      )}
    </div>
  );
};

export default SnsPostButtons;