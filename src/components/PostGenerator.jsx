import React, { useState, useEffect } from 'react';

// 🔧 SubscriptionManagerコンポーネントを直接統合
const SubscriptionManager = ({ userId, onPlanChange, onClose }) => {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // インラインスタイル（省略）
  const styles = {
    container: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    },
    modal: {
      backgroundColor: 'white',
      borderRadius: '1rem',
      maxWidth: '600px',
      width: '100%',
      maxHeight: '90vh',
      overflowY: 'auto',
      position: 'relative'
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '1.5rem 1.5rem 1rem',
      borderBottom: '1px solid #f3f4f6'
    },
    closeButton: {
      background: 'none',
      border: 'none',
      fontSize: '1.5rem',
      color: '#6b7280',
      cursor: 'pointer',
      padding: '0.25rem',
      lineHeight: 1
    },
    title: {
      margin: 0,
      fontSize: '1.25rem',
      fontWeight: 600,
      color: '#1f2937'
    },
    content: {
      padding: '1rem 1.5rem 1.5rem'
    },
    planSection: {
      textAlign: 'center',
      marginBottom: '1.5rem'
    },
    planIcon: {
      fontSize: '3rem',
      marginBottom: '1rem'
    },
    planTitle: {
      margin: '0 0 0.5rem',
      fontSize: '1.5rem',
      fontWeight: 600,
      color: '#1f2937'
    },
    button: {
      width: '100%',
      padding: '0.75rem 1.5rem',
      borderRadius: '0.5rem',
      border: 'none',
      cursor: 'pointer',
      fontWeight: 500,
      fontSize: '1rem',
      marginBottom: '0.5rem'
    },
    buttonPrimary: {
      background: '#fbbf24',
      color: '#92400e'
    },
    buttonDanger: {
      background: '#dc2626',
      color: 'white'
    },
    buttonSecondary: {
      background: '#6b7280',
      color: 'white'
    }
  };

  useEffect(() => {
    if (userId) {
      fetchSubscriptionStatus();
    }
  }, [userId]);

  const fetchSubscriptionStatus = async () => {
    try {
      setLoading(true);
      setError('');

      const userPlan = localStorage.getItem('userPlan') || 'free';

      if (userPlan === 'free') {
        setSubscription({ plan: 'free', subscription: null });
        setLoading(false);
        return;
      }

      const subscriptionData = {
        plan: 'premium',
        subscription: {
          id: localStorage.getItem('stripeSessionId') || localStorage.getItem('checkoutSessionId'),
          status: 'active',
          current_period_start: Math.floor(new Date(localStorage.getItem('premiumActivatedAt') || Date.now()).getTime() / 1000),
          current_period_end: Math.floor((new Date(localStorage.getItem('premiumActivatedAt') || Date.now()).getTime() + 30 * 24 * 60 * 60 * 1000) / 1000),
          cancel_at_period_end: false,
          canceled_at: null,
          plan: {
            amount: 980,
            currency: 'jpy',
            interval: 'month'
          }
        }
      };

      setSubscription(subscriptionData);

    } catch (error) {
      console.error('Fetch subscription status error:', error);
      setError('サブスクリプション情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    if (window.upgradeToPremium) {
      window.upgradeToPremium();
    } else {
      alert('アップグレード機能を初期化中です。少し待ってからもう一度お試しください。');
    }
    onClose();
  };

  const handleCancel = async (cancelType = 'at_period_end') => {
    try {
      setActionLoading(true);
      setError('');
      setSuccess('');

      if (cancelType === 'immediately') {
        const keysToRemove = [
          'userPlan', 'user_plan', 'plan', 'subscriptionStatus',
          'premiumActivatedAt', 'stripeSessionId', 'checkoutSessionId',
          'authToken', 'premiumToken'
        ];

        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
        });

        localStorage.setItem('userPlan', 'free');
        setSuccess('プレミアムプランを解約しました。無料プランに戻りました。');
        if (onPlanChange) onPlanChange('free');

      } else {
        localStorage.setItem('cancelAtPeriodEnd', 'true');
        localStorage.setItem('cancelScheduledAt', new Date().toISOString());
        setSuccess('期間終了時に解約予定として設定されました。');
      }

      setShowCancelConfirm(false);
      await fetchSubscriptionStatus();

    } catch (error) {
      console.error('Cancel subscription error:', error);
      setError('解約処理でエラーが発生しました');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.modal}>
          <div style={styles.header}>
            <h3 style={styles.title}>読み込み中...</h3>
            <button onClick={onClose} style={styles.closeButton}>×</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>サブスクリプション管理</h3>
          <button onClick={onClose} style={styles.closeButton}>×</button>
        </div>

        <div style={styles.content}>
          {subscription?.plan === 'free' ? (
            <div>
              <div style={styles.planSection}>
                <div style={styles.planIcon}>🆓</div>
                <h4 style={styles.planTitle}>無料プランをご利用中</h4>
                <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                  1日3回まで高品質AI投稿生成をお楽しみいただけます。
                </p>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h5 style={{ color: '#fbbf24', marginBottom: '1rem', textAlign: 'center' }}>
                  🚀 プレミアムプランの特典
                </h5>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  <div style={{ marginBottom: '0.5rem' }}>⚡ 無制限AI投稿生成</div>
                  <div style={{ marginBottom: '0.5rem' }}>🐦 Twitter自動投稿</div>
                  <div style={{ marginBottom: '0.5rem' }}>📱 Threads自動投稿</div>
                  <div style={{ marginBottom: '0.5rem' }}>🔄 同時投稿機能</div>
                  <div style={{ marginBottom: '0.5rem' }}>👑 広告なし</div>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937' }}>¥980</div>
                <div style={{ color: '#6b7280' }}>月額（税込）</div>
              </div>

              <button
                onClick={handleUpgrade}
                style={{ ...styles.button, ...styles.buttonPrimary }}
              >
                👑 プレミアムプランにアップグレード
              </button>
            </div>
          ) : (
            <div>
              <div style={styles.planSection}>
                <div style={styles.planIcon}>👑</div>
                <h4 style={styles.planTitle}>プレミアムプラン</h4>
                <p style={{ color: '#10b981', fontWeight: 'bold' }}>アクティブ</p>
              </div>

              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
                  {error}
                </div>
              )}

              {success && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
                  {success}
                </div>
              )}

              <div style={{ marginBottom: '1.5rem' }}>
                <h5 style={{ marginBottom: '0.5rem', fontWeight: 600 }}>請求情報</h5>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  <div>料金: ¥980/月</div>
                  <div>開始日: {formatDate(subscription.subscription?.current_period_start)}</div>
                  <div>次回更新: {formatDate(subscription.subscription?.current_period_end)}</div>
                </div>
              </div>

              <button
                onClick={() => setShowCancelConfirm(true)}
                style={{ ...styles.button, ...styles.buttonDanger }}
                disabled={actionLoading}
              >
                {actionLoading ? '処理中...' : 'プランを解約'}
              </button>
            </div>
          )}

          {/* 解約確認モーダル */}
          {showCancelConfirm && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1001
            }}>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                padding: '1.5rem',
                maxWidth: '400px',
                margin: '1rem'
              }}>
                <h4 style={{ marginBottom: '1rem' }}>解約の確認</h4>
                <p style={{ marginBottom: '1.5rem', color: '#6b7280' }}>
                  解約のタイミングを選択してください。
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleCancel('at_period_end')}
                    style={{ ...styles.button, ...styles.buttonSecondary }}
                  >
                    期間終了時に解約（推奨）
                  </button>
                  <button
                    onClick={() => handleCancel('immediately')}
                    style={{ ...styles.button, ...styles.buttonDanger }}
                  >
                    今すぐ解約
                  </button>
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    style={{ ...styles.button, background: '#f3f4f6', color: '#6b7280' }}
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// メインのPostGeneratorコンポーネント
const PostGenerator = () => {
  // 基本状態管理
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState('カジュアル');
  const [generatedPost, setGeneratedPost] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [quality, setQuality] = useState(null);
  const [usage, setUsage] = useState({ remaining: 3, used: 0, limit: 3 });
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [userPlan, setUserPlan] = useState('free');
  const [generationTime, setGenerationTime] = useState(null);

  // SNS投稿関連の状態
  const [twitterConnected, setTwitterConnected] = useState(false);
  const [threadsConnected, setThreadsConnected] = useState(false);
  const [twitterUsername, setTwitterUsername] = useState('');
  const [isPostingToTwitter, setIsPostingToTwitter] = useState(false);
  const [isPostingToThreads, setIsPostingToThreads] = useState(false);

  // 🔧 修正: 設定ボタン状態管理
  const [showSubscriptionManager, setShowSubscriptionManager] = useState(false);

  // プレミアム確認
  const checkPremiumStatus = () => {
    console.log('🔍 Checking premium status...');

    const userPlan = localStorage.getItem('userPlan');
    const subscriptionStatus = localStorage.getItem('subscriptionStatus');

    console.log('📊 Premium check:', { userPlan, subscriptionStatus });

    const isPremiumUser = (userPlan === 'premium' && subscriptionStatus === 'active');

    if (isPremiumUser) {
      console.log('✅ Premium status confirmed');
      setUserPlan('premium');
      setUsage({ remaining: 'unlimited' });
      localStorage.removeItem('dailyUsage');
      checkSnsConnections();
    } else {
      console.log('📋 Free plan confirmed');
      setUserPlan('free');
      setUsage({ remaining: 3, used: 0, limit: 3 });
    }
  };

  // SNS接続状況確認
  const checkSnsConnections = () => {
    // Twitter接続確認
    const twitterToken = localStorage.getItem('twitter_token');
    const twitterUser = localStorage.getItem('twitter_username');

    if (twitterToken && twitterUser) {
      setTwitterConnected(true);
      setTwitterUsername(twitterUser);
      console.log('🐦 Twitter connected:', twitterUser);
    }

    // Threads接続確認
    const threadsToken = localStorage.getItem('threads_token');
    if (threadsToken) {
      setThreadsConnected(true);
      console.log('📱 Threads connected');
    }
  };

  // 初期化
  useEffect(() => {
    checkPremiumStatus();

    // URLパラメータからStripe成功を検出
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');

    if (sessionId) {
      console.log('💳 Stripe session detected:', sessionId);
      manualUpgradeToPremium();
    }

    // URLパラメータからTwitter OAuth完了を検出
    const oauth_token = urlParams.get('oauth_token');
    const oauth_verifier = urlParams.get('oauth_verifier');

    if (oauth_token && oauth_verifier) {
      console.log('🐦 Twitter OAuth callback detected');
      setTimeout(() => {
        checkSnsConnections();
      }, 1000);
    }
  }, []);

  // 手動プレミアム移行
  const manualUpgradeToPremium = () => {
    console.log('🔧 Manual premium upgrade initiated');

    localStorage.setItem('userPlan', 'premium');
    localStorage.setItem('subscriptionStatus', 'active');
    localStorage.setItem('premiumActivatedAt', new Date().toISOString());
    localStorage.removeItem('dailyUsage');

    setUserPlan('premium');
    setUsage({ remaining: 'unlimited' });
    checkSnsConnections();

    console.log('✅ Manual premium upgrade completed');

    const url = new URL(window.location);
    url.searchParams.delete('session_id');
    window.history.replaceState({}, document.title, url.toString());
  };

  // Twitter接続処理
  const connectTwitter = async () => {
    try {
      console.log('🐦 Starting Twitter OAuth...');
      setError('');

      const testResponse = await fetch('/api/auth/twitter/authorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: 'twitter-oauth-user-' + Date.now()
        })
      });

      console.log('📡 Twitter auth test response:', testResponse.status);

      if (testResponse.ok) {
        const data = await testResponse.json();
        console.log('📥 Twitter auth data:', data);

        if (data.authUrl || data.url) {
          window.location.href = data.authUrl || data.url;
        } else {
          throw new Error('認証URLが取得できませんでした');
        }
      } else {
        console.warn('⚠️ Twitter OAuth API not available, using manual setup');
        setError('Twitter OAuth APIが設定されていません。');

        const manualSetup = window.confirm(
          'Twitter OAuth APIが設定されていません。\n' +
          '手動でTwitter接続をテストしますか？\n' +
          '（これは開発・テスト用です）'
        );

        if (manualSetup) {
          manualTwitterSetup();
        }
      }
    } catch (error) {
      console.error('❌ Twitter connection error:', error);
      setError('Twitter接続でエラーが発生しました: ' + error.message);

      const manualSetup = window.confirm(
        'Twitter接続に失敗しました。\n' +
        '手動でTwitter接続をテストしますか？\n' +
        '（これは開発・テスト用です）'
      );

      if (manualSetup) {
        manualTwitterSetup();
      }
    }
  };

  // 手動Twitter接続設定（開発・テスト用）
  const manualTwitterSetup = () => {
    const username = window.prompt('Twitterのユーザーネームをテスト入力してください（@なし）:');
    if (username) {
      localStorage.setItem('twitter_token', 'test_token_' + Date.now());
      localStorage.setItem('twitter_username', username);
      setTwitterConnected(true);
      setTwitterUsername(username);
      setError('');
      console.log('🔧 Manual Twitter setup completed:', username);
      window.alert(`✅ Twitterアカウント @${username} をテスト接続しました！`);
    }
  };

  // 🔧 修正: Threads接続処理の実装
  const connectThreads = async () => {
    try {
      console.log('📱 Starting Threads OAuth...');
      setError('');

      // 環境変数チェック
      const hasThreadsConfig = process.env.THREADS_APP_ID || process.env.REACT_APP_THREADS_APP_ID;

      if (!hasThreadsConfig) {
        // 環境変数が設定されていない場合
        setError('Threads API設定が見つかりません。');

        const manualSetup = window.confirm(
          'Threads API設定が見つかりません。\n' +
          '手動でThreads接続をテストしますか？\n' +
          '（これは開発・テスト用です）'
        );

        if (manualSetup) {
          manualThreadsSetup();
        }
        return;
      }

      // Threads OAuth APIを呼び出し
      const testResponse = await fetch('/api/auth/threads/authorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: 'threads-oauth-user-' + Date.now()
        })
      });

      console.log('📡 Threads auth test response:', testResponse.status);

      if (testResponse.ok) {
        const data = await testResponse.json();
        console.log('📥 Threads auth data:', data);

        if (data.authUrl) {
          window.location.href = data.authUrl;
        } else {
          throw new Error('認証URLが取得できませんでした');
        }
      } else {
        throw new Error('Threads OAuth APIエラー');
      }

    } catch (error) {
      console.error('❌ Threads connection error:', error);
      setError('Threads接続でエラーが発生しました: ' + error.message);

      const manualSetup = window.confirm(
        'Threads接続に失敗しました。\n' +
        '手動でThreads接続をテストしますか？\n' +
        '（これは開発・テスト用です）'
      );

      if (manualSetup) {
        manualThreadsSetup();
      }
    }
  };

  // 🔧 新規: 手動Threads接続設定（開発・テスト用）
  const manualThreadsSetup = () => {
    const username = window.prompt('Threadsのユーザーネームをテスト入力してください（@なし）:');
    if (username) {
      localStorage.setItem('threads_token', 'test_token_' + Date.now());
      localStorage.setItem('threads_username', username);
      setThreadsConnected(true);
      setError('');
      console.log('🔧 Manual Threads setup completed:', username);
      window.alert(`✅ Threadsアカウント @${username} をテスト接続しました！`);
    }
  };

  // TwitterへSNS投稿
  // 🔧 修正: TwitterへSNS投稿の改善
  const postToTwitter = async () => {
    if (!generatedPost) {
      setError('投稿する内容を先に生成してください');
      return;
    }

    if (!twitterConnected) {
      setError('Twitterアカウントを先に接続してください');
      return;
    }

    setIsPostingToTwitter(true);
    setError('');

    try {
      console.log('🐦 Posting to Twitter...');

      // 🔧 修正: より正確なユーザーID生成
      const userId = twitterUsername ||
        localStorage.getItem('twitter_username') ||
        localStorage.getItem('userId') ||
        'numaken_jp'; // 🔧 フォールバック

      console.log('📤 Sending to Twitter API:', { userId, contentLength: generatedPost.length });

      const response = await fetch('/api/post-to-twitter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: generatedPost,
          userId: userId
        }),
      });

      console.log('📡 Twitter post response:', response.status);

      const data = await response.json();
      console.log('📥 Twitter post response data:', data);

      if (!response.ok) {
        console.error('❌ Twitter post failed:', data);

        // 🔧 修正: テストモード判定の改善
        if (data.test_mode || localStorage.getItem('twitter_token')?.includes('test_token')) {
          console.log('🔧 Test mode: simulating successful post');
          window.alert('✅ テストモード: Twitter投稿が成功しました！\n\n' + generatedPost.substring(0, 100) + '...');
          return;
        }

        throw new Error(data.error || 'Twitter投稿に失敗しました');
      }

      console.log('✅ Twitter post successful:', data);

      // 🔧 修正: 成功メッセージの改善
      if (data.test_mode) {
        window.alert('✅ テストモード: Twitter投稿が成功しました！\n\n投稿内容: ' + data.content);
      } else {
        window.alert('✅ Twitterに投稿しました！\n\n投稿ID: ' + data.post_id);
      }

    } catch (error) {
      console.error('❌ Twitter post error:', error);
      setError('Twitter投稿でエラーが発生しました: ' + error.message);
    } finally {
      setIsPostingToTwitter(false);
    }
  };


  // 🔧 修正: ThreadsへSNS投稿の実装
  // 🔧 修正: ThreadsへSNS投稿の実装
  const postToThreads = async () => {
    if (!generatedPost) {
      setError('投稿する内容を先に生成してください');
      return;
    }

    if (!threadsConnected) {
      setError('Threadsアカウントを先に接続してください');
      return;
    }

    setIsPostingToThreads(true);
    setError('');

    try {
      console.log('📱 Posting to Threads...');

      // 🔧 修正: より正確なユーザーID生成
      const userId = localStorage.getItem('threads_username') ||
        localStorage.getItem('userId') ||
        'numaken_threads'; // 🔧 フォールバック

      console.log('📤 Sending to Threads API:', { userId, contentLength: generatedPost.length });

      const response = await fetch('/api/post-to-threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: generatedPost,
          userId: userId
        }),
      });

      console.log('📡 Threads post response:', response.status);

      const data = await response.json();
      console.log('📥 Threads post response data:', data);

      if (!response.ok) {
        console.error('❌ Threads post failed:', data);

        // 🔧 修正: テストモード判定の改善
        if (data.test_mode || localStorage.getItem('threads_token')?.includes('test_token')) {
          console.log('🔧 Test mode: simulating successful post');
          window.alert('✅ テストモード: Threads投稿が成功しました！\n\n' + generatedPost.substring(0, 100) + '...');
          return;
        }

        throw new Error(data.error || 'Threads投稿に失敗しました');
      }

      console.log('✅ Threads post successful:', data);

      // 🔧 修正: 成功メッセージの改善
      if (data.test_mode) {
        window.alert('✅ テストモード: Threads投稿が成功しました！\n\n投稿内容: ' + data.content);
      } else {
        window.alert('✅ Threadsに投稿しました！\n\n投稿ID: ' + data.post_id);
      }

    } catch (error) {
      console.error('❌ Threads post error:', error);
      setError('Threads投稿でエラーが発生しました: ' + error.message);
    } finally {
      setIsPostingToThreads(false);
    }
  };


  // 同時投稿機能
  const postToAllPlatforms = async () => {
    if (!generatedPost) {
      setError('投稿する内容を先に生成してください');
      return;
    }

    const connectedPlatforms = [];
    if (twitterConnected) connectedPlatforms.push('Twitter');
    if (threadsConnected) connectedPlatforms.push('Threads');

    if (connectedPlatforms.length === 0) {
      setError('投稿先のプラットフォームを先に接続してください');
      return;
    }

    const confirmPost = window.confirm(
      `以下のプラットフォームに同時投稿しますか？\n\n` +
      `📝 投稿内容:\n${generatedPost.substring(0, 100)}${generatedPost.length > 100 ? '...' : ''}\n\n` +
      `📱 投稿先: ${connectedPlatforms.join(', ')}`
    );

    if (!confirmPost) return;

    setError('');
    console.log('🔄 Starting simultaneous posting to:', connectedPlatforms);

    const results = [];

    // 🔧 修正: 順次実行で詳細ログ
    if (twitterConnected) {
      try {
        console.log('🐦 Starting Twitter post...');
        await postToTwitter();
        results.push({ platform: 'Twitter', success: true });
        console.log('✅ Twitter post completed');
      } catch (error) {
        console.error('❌ Twitter post failed:', error);
        results.push({ platform: 'Twitter', success: false, error: error.message });
      }
    }

    if (threadsConnected) {
      try {
        console.log('📱 Starting Threads post...');
        await postToThreads();
        results.push({ platform: 'Threads', success: true });
        console.log('✅ Threads post completed');
      } catch (error) {
        console.error('❌ Threads post failed:', error);
        results.push({ platform: 'Threads', success: false, error: error.message });
      }
    }

    // 🔧 修正: 結果サマリーの改善
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    let message = '🔄 同時投稿結果:\n\n';
    if (successful.length > 0) {
      message += `✅ 投稿成功: ${successful.map(r => r.platform).join(', ')}\n`;
    }
    if (failed.length > 0) {
      message += `❌ 投稿失敗: ${failed.map(r => `${r.platform} (${r.error})`).join(', ')}`;
    }

    window.alert(message);
    console.log('🎯 Simultaneous posting completed:', { successful: successful.length, failed: failed.length });
  };
    

  // プレミアムアップグレード処理
  const handleUpgrade = async () => {
    try {
      console.log('🚀 Starting upgrade process...');
      setError('');

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'upgrade-user-' + Date.now()
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('💳 Checkout session created:', data);

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('決済URLが取得できませんでした');
      }
    } catch (error) {
      console.error('❌ Upgrade error:', error);
      setError('アップグレード処理でエラーが発生しました: ' + error.message);
    }
  };

  // AI投稿生成
  const generatePost = async () => {
    if (!prompt.trim()) {
      setError('投稿のテーマを入力してください');
      return;
    }

    setIsLoading(true);
    setError('');
    setGeneratedPost('');
    setGenerationTime(null);

    const startTime = Date.now();

    try {
      const endpoint = userPlan === 'premium'
        ? '/api/generate-post'
        : '/api/generate-post-shared';

      const requestBody = {
        prompt: prompt.trim(),
        tone,
        userType: userPlan
      };

      console.log('🚀 API call:', { endpoint, requestBody });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📡 Response status:', response.status);

      const data = await response.json();
      console.log('📥 Response data:', data);

      if (!response.ok) {
        if (response.status === 429) {
          setError('1日の無料生成回数を超えました。プレミアムプランで無制限生成！');
          setUsage({ remaining: 0, used: 3, limit: 3 });
          setShowUpgradePrompt(true);
        } else {
          throw new Error(data.error || '投稿生成に失敗しました');
        }
        return;
      }

      setGeneratedPost(data.post);
      setQuality(data.quality);

      if (data.usage && userPlan === 'free') {
        console.log('📊 Updating usage:', data.usage);
        setUsage(prevUsage => ({
          remaining: data.usage.remaining || 0,
          used: (prevUsage.limit || 3) - (data.usage.remaining || 0),
          limit: prevUsage.limit || 3
        }));

        if (data.usage.remaining <= 1) {
          setShowUpgradePrompt(true);
        }
      }

      const endTime = Date.now();
      setGenerationTime(endTime - startTime);

    } catch (error) {
      console.error('❌ Generation error:', error);
      setError('ネットワークエラーが発生しました: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // グローバル関数の設定
  useEffect(() => {
    window.upgradeToPremium = handleUpgrade;
    window.debugSNSApp = {
      showInfo: () => ({
        userPlan,
        usage,
        twitterConnected,
        threadsConnected,
        twitterUsername,
        localStorage: Object.fromEntries(
          Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])
        )
      }),
      manualUpgrade: manualUpgradeToPremium,
      checkStatus: checkPremiumStatus,
      checkSns: checkSnsConnections,
      manualTwitter: manualTwitterSetup,
      manualThreads: manualThreadsSetup
    };
    console.log('🔧 Debug functions available: window.debugSNSApp');
  }, [userPlan, usage, twitterConnected, threadsConnected]);

  // アップグレードプロンプト
  const UpgradePrompt = () => {
    if (!showUpgradePrompt) return null;

    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          maxWidth: '28rem',
          margin: '1rem',
          position: 'relative'
        }}>
          <button
            onClick={() => setShowUpgradePrompt(false)}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6b7280',
              fontSize: '1.5rem'
            }}
          >
            ×
          </button>

          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>👑</div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
                {usage.remaining === 0 ? '本日の無料生成完了！' : 'もっと生成しませんか？'}
              </h2>
            </div>

            <div style={{
              background: 'linear-gradient(to right, #fef3c7, #fed7aa)',
              borderRadius: '0.5rem',
              padding: '1rem',
              marginBottom: '1rem'
            }}>
              <h3 style={{ fontWeight: '600', color: '#92400e', marginBottom: '0.5rem', fontSize: '1rem' }}>
                プレミアムで解放される機能
              </h3>
              <ul style={{ color: '#a16207', fontSize: '0.875rem', listStyle: 'none', padding: 0, margin: 0, textAlign: 'left' }}>
                <li>⚡ 無制限の投稿生成</li>
                <li>🚀 高速生成（専用APIキー）</li>
                <li>🐦 Twitter自動投稿</li>
                <li>📱 Threads自動投稿</li>
                <li>🔄 同時投稿機能</li>
                <li>👑 広告なしのクリーンUI</li>
              </ul>
            </div>

            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
              {usage.remaining === 0
                ? '明日も無料で3回生成できますが、今すぐ無制限で使いませんか？'
                : `残り${usage.remaining}回の無料生成があります。`
              }
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                onClick={handleUpgrade}
                style={{
                  width: '100%',
                  background: '#fbbf24',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  fontWeight: '500',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                月額¥980でアップグレード
              </button>
              <button
                onClick={() => setShowUpgradePrompt(false)}
                style={{
                  width: '100%',
                  color: '#6b7280',
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {usage.remaining === 0 ? '明日まで待つ' : '後で決める'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // メイン画面
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f4ff', padding: '2rem' }}>
      <div style={{ maxWidth: '60rem', margin: '0 auto' }}>
        {/* ヘッダー */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#1f2937' }}>AI SNS自動化ツール</h1>

            {/* プレミアムバッジ */}
            {userPlan === 'premium' && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'linear-gradient(to right, #fbbf24, #f97316)',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '9999px',
                fontWeight: 'bold'
              }}>
                <span>👑</span>
                PREMIUM MEMBER
              </div>
            )}

            {/* 🔧 修正: 設定ボタン（プレミアムのみ）の実装 */}
            {userPlan === 'premium' && (
              <button
                onClick={() => setShowSubscriptionManager(true)}
                style={{
                  background: '#6b7280',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                ⚙️ 設定
              </button>
            )}
          </div>

          <p style={{ fontSize: '1.25rem', color: '#6b7280' }}>
            {userPlan === 'premium'
              ? '無制限AI投稿生成 + SNS自動投稿'
              : 'APIキー設定不要で即座にAI投稿生成'}
          </p>
        </div>

        {/* メインコンテンツ */}
        <div style={{
          background: 'white',
          borderRadius: '1rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          padding: '2rem'
        }}>
          {/* 使用状況表示 */}
          <div style={{
            marginBottom: '1.5rem',
            padding: '1rem',
            background: userPlan === 'premium' ? '#dcfce7' : '#dbeafe',
            borderRadius: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.25rem' }}>
                  {userPlan === 'premium' ? '👑' : '📊'}
                </span>
                <span style={{ fontWeight: '600', color: '#1f2937' }}>
                  {userPlan === 'premium' ? 'プレミアムプラン' : '無料プラン'}
                </span>
              </div>

              <div style={{ textAlign: 'right' }}>
                {userPlan === 'premium' ? (
                  <span style={{ color: '#10b981', fontWeight: 'bold' }}>無制限生成</span>
                ) : (
                  <span style={{ color: '#2563eb', fontWeight: 'bold' }}>
                    残り {typeof usage.remaining === 'number' ? usage.remaining : 3}/{usage.limit || 3}回
                  </span>
                )}
              </div>
            </div>

            {/* 統計情報 */}
            {generationTime && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                <span>生成時間: {(generationTime / 1000).toFixed(1)}秒</span>
                {quality && <span style={{ marginLeft: '1rem' }}>品質: {quality}点</span>}
              </div>
            )}

            {/* SNS接続状況（プレミアムのみ） */}
            {userPlan === 'premium' && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                <span>SNS接続: </span>
                {twitterConnected && <span style={{ color: '#1d9bf0' }}>🐦 @{twitterUsername} </span>}
                {threadsConnected && <span style={{ color: '#000' }}>📱 Threads </span>}
                {!twitterConnected && !threadsConnected && <span>未接続</span>}
              </div>
            )}
          </div>

          {/* 入力フォーム */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                投稿のテーマ
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="例: 新商品の紹介、イベントの告知、日常の出来事など..."
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  resize: 'none',
                  fontFamily: 'inherit',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
                rows={3}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                投稿のトーン
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontFamily: 'inherit',
                  fontSize: '1rem'
                }}
              >
                <option value="カジュアル">カジュアル</option>
                <option value="ビジネス">ビジネス</option>
                <option value="フレンドリー">フレンドリー</option>
                <option value="専門的">専門的</option>
                <option value="エンターテイメント">エンターテイメント</option>
              </select>
            </div>

            <button
              onClick={generatePost}
              disabled={isLoading || !prompt.trim()}
              style={{
                width: '100%',
                background: isLoading || !prompt.trim()
                  ? '#9ca3af'
                  : 'linear-gradient(to right, #2563eb, #7c3aed)',
                color: 'white',
                padding: '1rem 1.5rem',
                borderRadius: '0.5rem',
                fontWeight: 'bold',
                fontSize: '1.125rem',
                border: 'none',
                cursor: isLoading || !prompt.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {isLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '1.25rem',
                    height: '1.25rem',
                    border: '2px solid white',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  AI投稿生成中...
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                  <span>⚡</span>
                  AI投稿生成
                </div>
              )}
            </button>
          </div>

          {/* エラー表示 */}
          {error && (
            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '0.5rem'
            }}>
              <p style={{ color: '#dc2626', margin: 0 }}>⚠️ {error}</p>

              {/* Twitter接続エラー時の対処法表示 */}
              {error.includes('Twitter') && error.includes('OAuth') && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#dc2626' }}>
                  <p>開発・テスト用オプション：</p>
                  <button
                    onClick={manualTwitterSetup}
                    style={{
                      background: '#1d9bf0',
                      color: 'white',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.25rem',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      marginRight: '0.5rem'
                    }}
                  >
                    🔧 テストでTwitter接続
                  </button>
                </div>
              )}

              {/* Threads接続エラー時の対処法表示 */}
              {error.includes('Threads') && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#dc2626' }}>
                  <p>開発・テスト用オプション：</p>
                  <button
                    onClick={manualThreadsSetup}
                    style={{
                      background: '#000',
                      color: 'white',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.25rem',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      marginRight: '0.5rem'
                    }}
                  >
                    🔧 テストでThreads接続
                  </button>
                </div>
              )}

              {/* Stripe決済エラー時の対処法表示 */}
              {error.includes('アップグレード') && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#dc2626' }}>
                  <p>決済がうまくいかない場合：</p>
                  <button
                    onClick={manualUpgradeToPremium}
                    style={{
                      background: '#dc2626',
                      color: 'white',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.25rem',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    手動でプレミアムに移行
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 生成結果 */}
          {generatedPost && (
            <div style={{ marginTop: '2rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
                生成された投稿
              </h3>

              <div style={{
                background: '#f9fafb',
                padding: '1.5rem',
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb'
              }}>
                <p style={{ color: '#1f2937', lineHeight: '1.6', whiteSpace: 'pre-wrap', margin: 0 }}>
                  {generatedPost}
                </p>
              </div>

              {/* 品質・統計表示 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '1rem',
                fontSize: '0.875rem',
                color: '#6b7280'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {quality && <span>品質スコア: {quality}点</span>}
                  {generationTime && (
                    <span>生成時間: {(generationTime / 1000).toFixed(1)}秒</span>
                  )}
                </div>
                <span>文字数: {generatedPost.length}文字</span>
              </div>

              {/* アクションボタン */}
              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {/* コピーボタン */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedPost);
                    const originalText = generatedPost;
                    setGeneratedPost('📋 コピーしました！');
                    setTimeout(() => setGeneratedPost(originalText), 1000);
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  📋 クリップボードにコピー
                </button>

                {/* プレミアム限定：SNS投稿ボタン */}
                {userPlan === 'premium' && (
                  <>
                    {/* Twitter投稿 */}
                    {twitterConnected ? (
                      <button
                        onClick={postToTwitter}
                        disabled={isPostingToTwitter}
                        style={{
                          padding: '0.5rem 1rem',
                          background: isPostingToTwitter ? '#9ca3af' : '#1d9bf0',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          cursor: isPostingToTwitter ? 'not-allowed' : 'pointer',
                          fontSize: '0.875rem'
                        }}
                      >
                        {isPostingToTwitter ? '投稿中...' : `🐦 @${twitterUsername}に投稿`}
                      </button>
                    ) : (
                      <button
                        onClick={connectTwitter}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#1d9bf0',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          cursor: 'pointer',
                          fontSize: '0.875rem'
                        }}
                      >
                        🐦 Twitterを接続
                      </button>
                    )}

                    {/* Threads投稿 */}
                    {threadsConnected ? (
                      <button
                        onClick={postToThreads}
                        disabled={isPostingToThreads}
                        style={{
                          padding: '0.5rem 1rem',
                          background: isPostingToThreads ? '#9ca3af' : '#000',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          cursor: isPostingToThreads ? 'not-allowed' : 'pointer',
                          fontSize: '0.875rem'
                        }}
                      >
                        {isPostingToThreads ? '投稿中...' : '📱 Threadsに投稿'}
                      </button>
                    ) : (
                      <button
                        onClick={connectThreads}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#000',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          cursor: 'pointer',
                          fontSize: '0.875rem'
                        }}
                      >
                        📱 Threadsを接続
                      </button>
                    )}

                    {/* 同時投稿ボタン */}
                    {(twitterConnected || threadsConnected) && (
                      <button
                        onClick={postToAllPlatforms}
                        disabled={isPostingToTwitter || isPostingToThreads}
                        style={{
                          padding: '0.5rem 1rem',
                          background: (isPostingToTwitter || isPostingToThreads)
                            ? '#9ca3af'
                            : 'linear-gradient(to right, #7c3aed, #ec4899)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          cursor: (isPostingToTwitter || isPostingToThreads) ? 'not-allowed' : 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: 'bold'
                        }}
                      >
                        {(isPostingToTwitter || isPostingToThreads)
                          ? '投稿中...'
                          : '🔄 同時投稿'
                        }
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* 無料プラン：SNS投稿プレビュー */}
              {userPlan !== 'premium' && (
                <div style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  background: '#fef3c7',
                  borderRadius: '0.5rem',
                  border: '1px solid #fbbf24'
                }}>
                  <p style={{ color: '#92400e', fontSize: '0.875rem', margin: 0 }}>
                    💎 プレミアムプランなら、この投稿をTwitterやThreadsに自動投稿＋同時投稿できます！
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* プレミアム促進（無料プランのみ） */}
        {userPlan !== 'premium' && (
          <div style={{
            marginTop: '2rem',
            background: 'linear-gradient(to right, #fbbf24, #f97316)',
            borderRadius: '1rem',
            padding: '2rem',
            textAlign: 'center',
            color: 'white'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.5rem' }}>👑</span>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>もっと生成したい方へ</h3>
            </div>
            <p style={{ fontSize: '1.125rem', marginBottom: '1.5rem', opacity: 0.9 }}>
              プレミアムプランで無制限生成＋SNS自動投稿をお楽しみください
            </p>

            {/* プレミアム特典 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
              fontSize: '0.875rem'
            }}>
              <div>⚡ 無制限AI生成</div>
              <div>🐦 Twitter自動投稿</div>
              <div>📱 Threads自動投稿</div>
              <div>🔄 同時投稿機能</div>
            </div>

            <button
              onClick={handleUpgrade}
              style={{
                background: 'white',
                color: '#f97316',
                padding: '1rem 2rem',
                borderRadius: '0.5rem',
                fontWeight: 'bold',
                fontSize: '1.125rem',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              💎 プレミアムプランを見る（¥980/月）
            </button>

            {/* 現在の使用状況表示 */}
            <div style={{ marginTop: '1rem', fontSize: '0.875rem', opacity: 0.8 }}>
              今日の残り生成数: {typeof usage.remaining === 'number' ? usage.remaining : 3}回/3回
            </div>
          </div>
        )}

        {/* アップグレードプロンプト */}
        <UpgradePrompt />

        {/* 🔧 修正: SubscriptionManagerの表示 */}
        {showSubscriptionManager && (
          <SubscriptionManager
            userId="current-user"
            onPlanChange={checkPremiumStatus}
            onClose={() => setShowSubscriptionManager(false)}
          />
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PostGenerator;