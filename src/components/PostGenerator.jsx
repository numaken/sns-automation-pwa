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
                  <div style={{ marginBottom: '0.5rem' }}>𝕏 X（旧Twitter）自動投稿</div>
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
  const [generatedPost, setGeneratedPost] = useState(() => {
    // 初期化時にlocalStorageから復元
    return localStorage.getItem('draft_post') || '';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [quality, setQuality] = useState(null);
  const [usage, setUsage] = useState({ remaining: 3, used: 0, limit: 3 });
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [userPlan, setUserPlan] = useState('free');
  const [generationTime, setGenerationTime] = useState(null);
  const [showSignInPage, setShowSignInPage] = useState(false);

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

    // SNS接続チェック（最初に実行）
    const hasTwitterConnection = localStorage.getItem('twitter_connected') === 'true' || 
                                  localStorage.getItem('twitter_token');
    const hasThreadsConnection = localStorage.getItem('threads_connected') === 'true' || 
                                  localStorage.getItem('threads_token');
    
    // 初回アクセス時（userPlanが未設定の場合）
    if (!userPlan) {
      console.log('🎉 First time access - setting up free plan');
      // 初回アクセス時は無料プランから開始
      localStorage.setItem('userPlan', 'free');
      setUserPlan('free');
      setUsage({ remaining: 3, used: 0, limit: 3 });
      
      // メイン画面を表示
      setShowSignInPage(false);
      checkSnsConnections();
      return;
    }
    
    // 無料プラン：メイン画面を表示（SNS投稿機能は制限）
    if (userPlan === 'free') {
      console.log('📋 Free plan - showing main screen with limited features');
      setUserPlan('free');
      setUsage({ remaining: 3, used: 0, limit: 3 });
      setShowSignInPage(false);
      checkSnsConnections();
      return;
    }

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

  // SNS接続完了後の処理
  const handleSnsConnectionComplete = () => {
    console.log('🎉 SNS connection completed - Upgrading to premium');
    localStorage.setItem('userPlan', 'premium');
    localStorage.setItem('subscriptionStatus', 'active');
    localStorage.setItem('premiumActivatedAt', new Date().toISOString());
    setUserPlan('premium');
    setUsage({ remaining: 'unlimited' });
    setShowSignInPage(false);
    
    // SNS接続状態を更新（無限ループを防ぐため、直接状態を設定）
    const twitterToken = localStorage.getItem('twitter_token');
    const twitterUser = localStorage.getItem('twitter_username');
    if (twitterToken && twitterUser) {
      setTwitterConnected(true);
      setTwitterUsername(twitterUser);
    }
    
    const threadsToken = localStorage.getItem('threads_token');
    const threadsUser = localStorage.getItem('threads_username');
    if (threadsToken && threadsUser) {
      setThreadsConnected(true);
    }
  };

  // SNS接続状況確認
  const checkSnsConnections = () => {
    console.log('🔍 Checking SNS connections...');
    
    // X（旧Twitter）接続確認
    const twitterToken = localStorage.getItem('twitter_token');
    const twitterUser = localStorage.getItem('twitter_username');

    console.log('𝕏 Twitter check:', { token: !!twitterToken, user: twitterUser, showSignInPage });

    if (twitterToken && twitterUser) {
      setTwitterConnected(true);
      setTwitterUsername(twitterUser);
      console.log('𝕏 X connected:', twitterUser);
      
      // 初回サインインページ表示中なら、プレミアムにアップグレード
      if (showSignInPage) {
        console.log('🎉 Twitter connection complete - upgrading to premium');
        handleSnsConnectionComplete();
        return; // 処理完了
      }
    }

    // Threads接続確認
    const threadsToken = localStorage.getItem('threads_token');
    const threadsConnectedFlag = localStorage.getItem('threads_connected');
    const threadsUser = localStorage.getItem('threads_username');
    
    console.log('📱 Threads check:', { token: !!threadsToken, connected: threadsConnectedFlag, user: threadsUser, showSignInPage });
    
    if (threadsToken && threadsConnectedFlag === 'true') {
      setThreadsConnected(true);
      console.log('📱 Threads connected:', threadsUser);
      
      // 初回サインインページ表示中なら、プレミアムにアップグレード
      if (showSignInPage) {
        console.log('🎉 Threads connection complete - upgrading to premium');
        handleSnsConnectionComplete();
        return; // 処理完了
      }
    }

    console.log('✅ SNS connection check complete');
  };

  // 初期化
  useEffect(() => {
    checkPremiumStatus();

    // URLパラメータからOAuth成功を検出
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const twitterAuth = urlParams.get('twitter_auth');
    const threadsAuth = urlParams.get('auth_success');

    // OAuth認証成功時の処理
    if (twitterAuth === 'success' || threadsAuth === 'threads') {
      console.log('🔄 OAuth success detected, checking connections...');
      setTimeout(() => {
        checkSnsConnections();
        // URL履歴をクリーンアップ
        const url = new URL(window.location);
        url.searchParams.delete('twitter_auth');
        url.searchParams.delete('auth_success');
        url.searchParams.delete('username');
        url.searchParams.delete('auto_return');
        url.searchParams.delete('fixed');
        url.searchParams.delete('platform');
        window.history.replaceState({}, document.title, url.toString());
      }, 500);
    }

    if (sessionId) {
      console.log('💳 Stripe session detected:', sessionId);
      manualUpgradeToPremium();
    }

    // URLパラメータからTwitter OAuth完了を検出
    const oauth_token = urlParams.get('oauth_token');
    const oauth_verifier = urlParams.get('oauth_verifier');

    if (oauth_token && oauth_verifier) {
      console.log('𝕏 X OAuth callback detected');
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

  // X（旧Twitter）接続処理
  const connectTwitter = async () => {
    try {
      console.log('𝕏 Starting X OAuth...');
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
          'X OAuth APIが設定されていません。\n' +
          '手動でX接続をテストしますか？\n' +
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
        'X接続に失敗しました。\n' +
        '手動でX接続をテストしますか？\n' +
        '（これは開発・テスト用です）'
      );

      if (manualSetup) {
        manualTwitterSetup();
      }
    }
  };

  // 手動Twitter接続設定（開発・テスト用）
  const manualTwitterSetup = () => {
    const username = window.prompt ? window.prompt('Xのユーザーネームをテスト入力してください（@なし）:') : null;
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

      // 🔧 修正: React環境では process.env は使用不可、API呼び出しで確認

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
      console.log('𝕏 Posting to X...');
      
      const userId = localStorage.getItem('twitter_user_id') || 'twitter-user-' + Date.now();
      console.log('🔍 Using userId for Twitter post:', userId);
      console.log('🔍 localStorage keys:', {
        twitter_token: localStorage.getItem('twitter_token'),
        twitter_user_id: localStorage.getItem('twitter_user_id'),
        twitter_username: localStorage.getItem('twitter_username'),
        twitter_connected: localStorage.getItem('twitter_connected')
      });

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

      if (!response.ok) {
        const data = await response.json();
        console.error('❌ Twitter post failed:', data);

        if (localStorage.getItem('twitter_token')?.includes('test_token')) {
          console.log('🔧 Test mode: simulating successful post');
          window.alert('✅ テストモード: X投稿が成功しました！\n\n' + generatedPost);
          return;
        }

        throw new Error(data.error || 'X投稿に失敗しました');
      }

      const result = await response.json();
      console.log('✅ Twitter post successful:', result);

      window.alert('✅ Twitterに投稿しました！');
      // 投稿成功時にドラフトをクリア
      localStorage.removeItem('draft_post');

    } catch (error) {
      console.error('❌ Twitter post error:', error);
      setError('X投稿でエラーが発生しました: ' + error.message);
    } finally {
      setIsPostingToTwitter(false);
    }
  };

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
      
      const userId = localStorage.getItem('threads_user_id') || 'threads-user-' + Date.now();
      console.log('🔍 Using userId for Threads post:', userId);
      console.log('🔍 localStorage keys:', {
        threads_token: localStorage.getItem('threads_token'),
        threads_user_id: localStorage.getItem('threads_user_id'),
        threads_username: localStorage.getItem('threads_username'),
        threads_connected: localStorage.getItem('threads_connected')
      });

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

      if (!response.ok) {
        const data = await response.json();
        console.error('❌ Threads post failed:', data);

        // テスト環境の場合の代替処理
        if (localStorage.getItem('threads_token')?.includes('test_token')) {
          console.log('🔧 Test mode: simulating successful post');
          window.alert('✅ テストモード: Threads投稿が成功しました！\n\n' + generatedPost);
          return;
        }

        throw new Error(data.error || 'Threads投稿に失敗しました');
      }

      const result = await response.json();
      console.log('✅ Threads post successful:', result);

      window.alert('✅ Threadsに投稿しました！');
      // 投稿成功時にドラフトをクリア
      localStorage.removeItem('draft_post');

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

    const promises = [];

    if (twitterConnected) {
      promises.push(postToTwitter());
    }

    if (threadsConnected) {
      promises.push(postToThreads());
    }

    try {
      await Promise.all(promises);
      window.alert(`✅ ${connectedPlatforms.join(' と ')}に同時投稿しました！`);
      // 投稿成功時にドラフトをクリア
      localStorage.removeItem('draft_post');
    } catch (error) {
      console.error('❌ Bulk post error:', error);
      setError('同時投稿でエラーが発生しました: ' + error.message);
    }
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

    // SNS接続チェック（プレミアムユーザー向け）
    if (userPlan === 'premium') {
      const hasConnection = twitterConnected || threadsConnected;
      if (!hasConnection) {
        setError('投稿生成にはSNSアカウントの接続が必要です。先にTwitterまたはThreadsに接続してください。');
        return;
      }
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
      
      // 生成した投稿をlocalStorageに自動保存
      localStorage.setItem('draft_post', data.post);

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
      // 🔧 開発・デバッグ用: プラン切り替え機能
      resetToFree: () => {
        console.log('🔄 Resetting to free plan...');
        localStorage.setItem('userPlan', 'free');
        localStorage.setItem('subscriptionStatus', 'inactive');
        localStorage.removeItem('premiumActivatedAt');
        localStorage.removeItem('dailyUsage');
        // SNS接続も削除してサインインページに戻る
        localStorage.removeItem('twitter_connected');
        localStorage.removeItem('twitter_token');
        localStorage.removeItem('twitter_username');
        localStorage.removeItem('threads_connected');
        localStorage.removeItem('threads_token');
        localStorage.removeItem('threads_username');
        
        setUserPlan('free');
        setUsage({ remaining: 3, used: 0, limit: 3 });
        console.log('✅ Reset to free plan completed - SNS connections cleared - Reloading...');
        setTimeout(() => window.location.reload(), 500);
      },
      
      // 🆕 開発・デバッグ用: Stripe迂回で有料プラン化
      upgradeToPremiumDirect: () => {
        console.log('🚀 Direct upgrade to premium (bypassing Stripe)...');
        localStorage.setItem('userPlan', 'premium');
        localStorage.setItem('subscriptionStatus', 'active');
        localStorage.setItem('premiumActivatedAt', new Date().toISOString());
        localStorage.removeItem('dailyUsage');
        
        setUserPlan('premium');
        setUsage({ remaining: 'unlimited' });
        console.log('✅ Direct upgrade to premium completed - Reloading...');
        setTimeout(() => window.location.reload(), 500);
      },
      fullReset: () => {
        console.log('🧹 Full reset - clearing all data...');
        localStorage.clear();
        console.log('✅ All data cleared - Reloading...');
        setTimeout(() => window.location.reload(), 1000);
      },
      testTwitter: () => {
        const username = window.prompt ? 
          (window.prompt('テスト用Xユーザー名を入力（@なし）:') || 'test_user') : 
          'test_user';
        localStorage.setItem('twitter_token', 'test_token_x_' + Date.now());
        localStorage.setItem('twitter_username', username);
        localStorage.setItem('twitter_connected', 'true');
        localStorage.setItem('userPlan', 'premium');
        localStorage.setItem('subscriptionStatus', 'active');
        console.log('✅ Test X connection created - Reload page');
        setTimeout(() => window.location.reload(), 500);
      },
      testThreads: () => {
        const username = window.prompt ? 
          (window.prompt('テスト用Threadsユーザー名を入力:') || 'test_user') : 
          'test_user';
        localStorage.setItem('threads_token', 'test_token_threads_' + Date.now());
        localStorage.setItem('threads_username', username);
        localStorage.setItem('threads_connected', 'true');
        localStorage.setItem('userPlan', 'premium');
        localStorage.setItem('subscriptionStatus', 'active');
        console.log('✅ Test Threads connection created - Reload page');
        setTimeout(() => window.location.reload(), 500);
      },
      enableAdminMode: () => {
        const password = window.prompt ? window.prompt('管理者パスワードを入力してください:') : null;
        if (password === 'sns2024admin') {
          localStorage.setItem('admin_mode', 'true');
          console.log('✅ 管理者モードが有効になりました - ページをリロードしてください');
          setTimeout(() => window.location.reload(), 500);
        } else {
          console.log('❌ パスワードが間違っています');
        }
      },
      disableAdminMode: () => {
        localStorage.removeItem('admin_mode');
        console.log('✅ 管理者モードが無効になりました - ページをリロードしてください');
        setTimeout(() => window.location.reload(), 500);
      },
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
                <li>𝕏 X（旧Twitter）自動投稿</li>
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

  // 初回サインインページ
  if (showSignInPage) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        padding: '2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          padding: '3rem',
          maxWidth: '600px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 32px 64px -12px rgba(0, 0, 0, 0.25)'
        }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            marginBottom: '1rem', 
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent'
          }}>
            🚀 SNS自動投稿アプリへようこそ
          </h1>
          
          <p style={{ 
            fontSize: '1.25rem', 
            color: '#6b7280', 
            marginBottom: '2rem',
            lineHeight: '1.6'
          }}>
            始めるには、X（旧Twitter）またはThreadsアカウントに接続してください。<br/>
            接続後、無制限のAI投稿生成と自動投稿が利用可能になります！
          </p>

          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            justifyContent: 'center',
            marginBottom: '2rem'
          }}>
            <button
              onClick={connectTwitter}
              disabled={isLoading}
              style={{
                background: 'linear-gradient(135deg, #1da1f2, #0d8bd9)',
                color: 'white',
                padding: '1rem 2rem',
                borderRadius: '12px',
                border: 'none',
                fontSize: '1.125rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(29, 161, 242, 0.4)',
                opacity: isLoading ? 0.7 : 1
              }}
            >
              𝕏 X（旧Twitter）で接続
            </button>

            <button
              onClick={connectThreads}
              disabled={isLoading}
              style={{
                background: 'linear-gradient(135deg, #000, #333)',
                color: 'white',
                padding: '1rem 2rem',
                borderRadius: '12px',
                border: 'none',
                fontSize: '1.125rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                opacity: isLoading ? 0.7 : 1
              }}
            >
              📱 Threadsで接続
            </button>
          </div>

          {/* テスト用接続ボタン（管理者モード時のみ） */}
          {localStorage.getItem('admin_mode') === 'true' && (
            <div style={{
              marginTop: '2rem',
              padding: '1.5rem',
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '12px',
              border: '1px dashed rgba(59, 130, 246, 0.3)'
            }}>
            <p style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              marginBottom: '1rem',
              textAlign: 'center'
            }}>
              🧪 テスト用（開発環境のみ）
            </p>
            
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => {
                  const username = window.prompt ? 
                    (window.prompt('テスト用Xユーザー名を入力（@なし）:') || 'test_user') : 
                    'test_user';
                  localStorage.setItem('twitter_token', 'test_token_x_' + Date.now());
                  localStorage.setItem('twitter_username', username);
                  localStorage.setItem('twitter_connected', 'true');
                  handleSnsConnectionComplete();
                }}
                style={{
                  background: '#3b82f6',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                🔧 X接続テスト
              </button>

              <button
                onClick={() => {
                  const username = window.prompt ? 
                    (window.prompt('テスト用Threadsユーザー名を入力:') || 'test_user') : 
                    'test_user';
                  localStorage.setItem('threads_token', 'test_token_threads_' + Date.now());
                  localStorage.setItem('threads_username', username);
                  localStorage.setItem('threads_connected', 'true');
                  handleSnsConnectionComplete();
                }}
                style={{
                  background: '#6b7280',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                🔧 Threads接続テスト
              </button>
            </div>
          </div>
          )}

          {error && (
            <div style={{
              background: '#fef2f2',
              color: '#dc2626',
              padding: '1rem',
              borderRadius: '8px',
              marginTop: '1rem',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // メイン画面
  return (
    <>
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        padding: '1rem',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* ヘッダー */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '3rem', 
          paddingTop: '2rem'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '1rem', 
            marginBottom: '1.5rem',
            flexWrap: 'wrap'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(10px)',
              padding: '0.75rem 1.5rem',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <span style={{ fontSize: '2rem' }}>✨</span>
              <h1 style={{ 
                fontSize: '2.5rem', 
                fontWeight: '800', 
                background: 'linear-gradient(135deg, #ffffff, #e0e7ff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                margin: 0
              }}>SNS自動化</h1>
            </div>

            {/* プレミアムバッジ */}
            {userPlan === 'premium' && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                color: 'white',
                padding: '0.75rem 1.25rem',
                borderRadius: '25px',
                fontWeight: '700',
                fontSize: '0.875rem',
                boxShadow: '0 8px 25px rgba(251, 191, 36, 0.3)',
                border: '2px solid rgba(255, 255, 255, 0.3)'
              }}>
                <span style={{ fontSize: '1.2rem' }}>👑</span>
                PREMIUM
              </div>
            )}

            {/* 設定ボタン（全ユーザー） */}
            <button
              onClick={() => setShowSubscriptionManager(true)}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                padding: '0.75rem 1rem',
                borderRadius: '15px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.3)';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                <span>⚙️</span>
                設定
              </button>
          </div>

          <p style={{ 
            fontSize: '1.125rem', 
            color: 'rgba(255, 255, 255, 0.9)', 
            fontWeight: '500',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' 
          }}>
            {userPlan === 'premium'
              ? '🚀 無制限AI投稿生成 + SNS自動投稿が可能'
              : '🎯 APIキー設定不要で即座にAI投稿生成'}
          </p>
        </div>

        {/* メインコンテンツ */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          boxShadow: '0 32px 64px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          padding: '2.5rem',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          {/* 投稿テーマ入力（メインエリア） */}
          <div style={{
            marginBottom: '2rem',
            background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)',
            borderRadius: '20px',
            padding: '2rem',
            border: '2px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
              }}>
                ✍️
              </div>
              <div>
                <h2 style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: '700', 
                  color: '#1f2937', 
                  margin: 0,
                  marginBottom: '4px'
                }}>
                  投稿テーマを入力
                </h2>
                <p style={{ 
                  fontSize: '0.875rem', 
                  color: '#6b7280', 
                  margin: 0
                }}>
                  どんな内容を投稿したいか教えてください
                </p>
              </div>
            </div>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="例：今日学んだプログラミングの新しい技術について..."
              style={{
                width: '100%',
                height: '120px',
                padding: '1.5rem',
                borderRadius: '16px',
                border: '2px solid #e5e7eb',
                fontSize: '1rem',
                fontFamily: 'inherit',
                resize: 'vertical',
                backgroundColor: 'white',
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',
                outline: 'none',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#4f46e5';
                e.target.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.06), 0 0 0 3px rgba(79, 70, 229, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.06)';
              }}
            />

            {/* トーン選択とボタン */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              marginTop: '1.5rem',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                  トーン:
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    backgroundColor: 'white',
                    color: '#374151',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="カジュアル">😊 カジュアル</option>
                  <option value="プロフェッショナル">💼 プロフェッショナル</option>
                  <option value="フレンドリー">🤝 フレンドリー</option>
                  <option value="情熱的">🔥 情熱的</option>
                </select>
              </div>

              <button
                onClick={generatePost}
                disabled={isLoading || !prompt.trim()}
                style={{
                  background: !prompt.trim() || isLoading 
                    ? '#9ca3af' 
                    : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  color: 'white',
                  padding: '1rem 2rem',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: !prompt.trim() || isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  boxShadow: !prompt.trim() || isLoading 
                    ? 'none' 
                    : '0 8px 25px rgba(79, 70, 229, 0.3)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isLoading && prompt.trim()) {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 12px 35px rgba(79, 70, 229, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading && prompt.trim()) {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 8px 25px rgba(79, 70, 229, 0.3)';
                  }
                }}
              >
                {isLoading ? (
                  <>
                    <div style={{ 
                      width: '20px', 
                      height: '20px', 
                      border: '2px solid rgba(255,255,255,0.3)', 
                      borderTop: '2px solid white', 
                      borderRadius: '50%', 
                      animation: 'spin 1s linear infinite' 
                    }} />
                    生成中...
                  </>
                ) : (
                  <>
                    🤖 AI投稿生成
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 生成された投稿文（メインエリア） */}
          {generatedPost && (
            <div style={{
              marginBottom: '2rem',
              background: 'linear-gradient(135deg, #f0f9ff, #dbeafe)',
              borderRadius: '20px',
              padding: '2rem',
              border: '2px solid #3b82f6'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}>
                  🎯
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ 
                        fontSize: '1.5rem', 
                        fontWeight: '700', 
                        color: '#1f2937', 
                        margin: 0,
                        marginBottom: '4px'
                      }}>
                        生成された投稿文
                      </h3>
                      <p style={{ 
                        fontSize: '0.875rem', 
                        color: '#6b7280', 
                        margin: 0
                      }}>
                        内容を確認して投稿またはコピーしてください
                      </p>
                    </div>
                    {quality && (
                      <div style={{
                        background: quality.grade === 'A' ? '#10b981' : 
                                   quality.grade === 'B' ? '#3b82f6' : 
                                   quality.grade === 'C' ? '#f59e0b' : '#ef4444',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '12px',
                        fontWeight: '700',
                        fontSize: '1rem'
                      }}>
                        品質: {quality.grade}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '1.5rem',
                border: '1px solid #e5e7eb',
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)'
              }}>
                <div style={{
                  fontSize: '1rem',
                  lineHeight: '1.6',
                  color: '#1f2937',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'inherit'
                }}>
                  {generatedPost}
                </div>
              </div>

              {/* 投稿・コピーボタン */}
              <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                marginTop: '1.5rem',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedPost);
                    alert('✅ 投稿文をクリップボードにコピーしました！');
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #6b7280, #4b5563)',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '12px',
                    border: 'none',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 12px rgba(107, 114, 128, 0.3)'
                  }}
                >
                  📋 コピー
                </button>

                {/* SNS投稿ボタンはここに配置 */}
                {(twitterConnected || threadsConnected) && userPlan === 'premium' && (
                  <>
                    {twitterConnected && (
                      <button
                        onClick={postToTwitter}
                        disabled={isPostingToTwitter}
                        style={{
                          background: 'linear-gradient(135deg, #1da1f2, #0d8bd9)',
                          color: 'white',
                          padding: '0.75rem 1.5rem',
                          borderRadius: '12px',
                          border: 'none',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          boxShadow: '0 4px 12px rgba(29, 161, 242, 0.3)'
                        }}
                      >
                        {isPostingToTwitter ? '投稿中...' : '𝕏 Xに投稿'}
                      </button>
                    )}

                    {threadsConnected && (
                      <button
                        onClick={postToThreads}
                        disabled={isPostingToThreads}
                        style={{
                          background: 'linear-gradient(135deg, #000, #333)',
                          color: 'white',
                          padding: '0.75rem 1.5rem',
                          borderRadius: '12px',
                          border: 'none',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                        }}
                      >
                        {isPostingToThreads ? '投稿中...' : '📱 Threadsに投稿'}
                      </button>
                    )}

                    {twitterConnected && threadsConnected && (
                      <button
                        onClick={postToAllPlatforms}
                        style={{
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          color: 'white',
                          padding: '0.75rem 1.5rem',
                          borderRadius: '12px',
                          border: 'none',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                        }}
                      >
                        🔄 同時投稿
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* エラー表示 */}
          {error && (
            <div style={{
              background: 'linear-gradient(135deg, #fee2e2, #fecaca)',
              border: '2px solid #ef4444',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1rem',
              color: '#dc2626',
              fontWeight: '500'
            }}>
              ❌ {error}
            </div>
          )}
          {/* 使用状況表示 */}
          <div style={{
            marginBottom: '2rem',
            padding: '1.5rem',
            background: userPlan === 'premium' 
              ? 'linear-gradient(135deg, #d1fae5, #a7f3d0)' 
              : 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
            borderRadius: '16px',
            border: `2px solid ${userPlan === 'premium' ? '#10b981' : '#3b82f6'}`,
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* 装飾的な背景要素 */}
            <div style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '100px',
              height: '100px',
              background: userPlan === 'premium' 
                ? 'rgba(16, 185, 129, 0.1)' 
                : 'rgba(59, 130, 246, 0.1)',
              borderRadius: '50%'
            }} />
            <div style={{
              position: 'absolute',
              bottom: '-30px',
              left: '-30px',
              width: '60px',
              height: '60px',
              background: userPlan === 'premium' 
                ? 'rgba(16, 185, 129, 0.05)' 
                : 'rgba(59, 130, 246, 0.05)',
              borderRadius: '50%'
            }} />
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: userPlan === 'premium' 
                    ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                    : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                }}>
                  {userPlan === 'premium' ? '👑' : '📊'}
                </div>
                <div>
                  <div style={{ 
                    fontWeight: '700', 
                    fontSize: '1.125rem',
                    color: '#1f2937',
                    marginBottom: '2px'
                  }}>
                    {userPlan === 'premium' ? 'プレミアムプラン' : '無料プラン'}
                  </div>
                  <div style={{ 
                    fontSize: '0.875rem', 
                    color: '#6b7280' 
                  }}>
                    {userPlan === 'premium' ? 'すべての機能が利用可能' : '基本機能が利用可能'}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                {userPlan === 'premium' ? (
                  <div style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    padding: '0.5rem 1rem',
                    borderRadius: '12px',
                    fontWeight: '700',
                    fontSize: '0.875rem'
                  }}>
                    ∞ 無制限
                  </div>
                ) : (
                  <div style={{
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    color: 'white',
                    padding: '0.5rem 1rem',
                    borderRadius: '12px',
                    fontWeight: '700',
                    fontSize: '0.875rem'
                  }}>
                    {typeof usage.remaining === 'number' ? usage.remaining : 3}/{usage.limit || 3} 回
                  </div>
                )}
              </div>
            </div>

            {/* 統計情報 */}
            {generationTime && (
              <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                marginTop: '1rem',
                padding: '0.75rem',
                background: 'rgba(255, 255, 255, 0.5)',
                borderRadius: '8px',
                fontSize: '0.875rem' 
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  color: '#10b981',
                  fontWeight: '600'
                }}>
                  <span>⚡</span>
                  生成時間: {(generationTime / 1000).toFixed(1)}秒
                </div>
                {quality && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    color: '#f59e0b',
                    fontWeight: '600'
                  }}>
                    <span>⭐</span>
                    品質: {quality}点
                  </div>
                )}
              </div>
            )}

            {/* SNS接続状況（プレミアムのみ） */}
            {userPlan === 'premium' && (
              <div style={{ 
                marginTop: '1rem',
                padding: '0.75rem',
                background: 'rgba(255, 255, 255, 0.5)',
                borderRadius: '8px',
                fontSize: '0.875rem' 
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  color: '#1f2937'
                }}>
                  <span>🔗</span>
                  SNS接続状況:
                </div>
                <div style={{ 
                  display: 'flex', 
                  gap: '1rem', 
                  flexWrap: 'wrap' 
                }}>
                  {twitterConnected ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                      padding: '0.25rem 0.75rem',
                      background: 'rgba(29, 155, 240, 0.1)',
                      borderRadius: '12px',
                      color: '#1d9bf0',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      minWidth: '120px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>𝕏</span>
                        @{twitterUsername}
                      </div>
                      <button
                        onClick={() => {
                          localStorage.removeItem('twitter_token');
                          localStorage.removeItem('twitter_username');
                          localStorage.removeItem('twitter_connected');
                          setTwitterConnected(false);
                          setTwitterUsername('');
                        }}
                        style={{
                          background: 'rgba(220, 38, 38, 0.1)',
                          color: '#dc2626',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '2px 6px',
                          cursor: 'pointer',
                          fontSize: '0.7rem',
                          fontWeight: '500'
                        }}
                        title="X接続を解除"
                      >
                        ×
                      </button>
                    </div>
                  ) : null}
                  {threadsConnected ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                      padding: '0.25rem 0.75rem',
                      background: 'rgba(0, 0, 0, 0.1)',
                      borderRadius: '12px',
                      color: '#000',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      minWidth: '120px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>🧵</span>
                        @{localStorage.getItem('threads_username') || 'Threads'}
                      </div>
                      <button
                        onClick={() => {
                          localStorage.removeItem('threads_token');
                          localStorage.removeItem('threads_username');
                          localStorage.removeItem('threads_connected');
                          setThreadsConnected(false);
                        }}
                        style={{
                          background: 'rgba(220, 38, 38, 0.1)',
                          color: '#dc2626',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '2px 6px',
                          cursor: 'pointer',
                          fontSize: '0.7rem',
                          fontWeight: '500'
                        }}
                        title="Threads接続を解除"
                      >
                        ×
                      </button>
                    </div>
                  ) : null}
                  {!twitterConnected && !threadsConnected && (
                    <span style={{ color: '#6b7280' }}>未接続 - 投稿ボタンから接続可能</span>
                  )}
                </div>
              </div>
            )}
            </div>
          </div>

          {/* 入力フォーム */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
              <label style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '1rem', 
                fontWeight: '700', 
                color: '#1f2937', 
                marginBottom: '0.75rem' 
              }}>
                <span>🎯</span>
                投稿のテーマ
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="例: 新商品の紹介、イベントの告知、日常の出来事など..."
                style={{
                  width: '100%',
                  padding: '1rem 1.25rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '16px',
                  resize: 'none',
                  fontFamily: 'inherit',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                  background: 'rgba(255, 255, 255, 0.8)',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                rows={4}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                }}
              />
            </div>

            <div>
              <label style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '1rem', 
                fontWeight: '700', 
                color: '#1f2937', 
                marginBottom: '0.75rem' 
              }}>
                <span>🎨</span>
                投稿のトーン
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                style={{
                  width: '100%',
                  padding: '1rem 1.25rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '16px',
                  fontFamily: 'inherit',
                  fontSize: '1rem',
                  background: 'rgba(255, 255, 255, 0.8)',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.75rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.5em 1.5em',
                  paddingRight: '3rem'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                }}
              >
                <option value="カジュアル">🌟 カジュアル</option>
                <option value="ビジネス">💼 ビジネス</option>
                <option value="フレンドリー">😊 フレンドリー</option>
                <option value="専門的">🎯 専門的</option>
                <option value="エンターテイメント">🎉 エンターテイメント</option>
              </select>
            </div>

            <button
              onClick={generatePost}
              disabled={isLoading || !prompt.trim()}
              style={{
                width: '100%',
                background: isLoading || !prompt.trim()
                  ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
                  : 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                padding: '1.25rem 2rem',
                borderRadius: '20px',
                fontWeight: '700',
                fontSize: '1.125rem',
                border: 'none',
                cursor: isLoading || !prompt.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: isLoading || !prompt.trim() 
                  ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                position: 'relative',
                overflow: 'hidden',
                transform: 'scale(1)'
              }}
              onMouseEnter={(e) => {
                if (!isLoading && prompt.trim()) {
                  e.target.style.transform = 'scale(1.02)';
                  e.target.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading && prompt.trim()) {
                  e.target.style.transform = 'scale(1)';
                  e.target.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
                }
              }}
            >
              
              <div style={{ position: 'relative', zIndex: 1 }}>
                {isLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '1.5rem',
                      height: '1.5rem',
                      border: '3px solid rgba(255, 255, 255, 0.3)',
                      borderTop: '3px solid white',
                      borderRadius: '50%'
                    }}></div>
                    AI投稿生成中...
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>✨</span>
                    AI投稿生成
                    <span style={{ fontSize: '1.25rem' }}>🚀</span>
                  </div>
                )}
              </div>
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

        </div>

{/* プレミアム促進とアップグレード管理 */}
        <>
          {/* 無料プランの場合のプレミアム促進 */}
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

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem',
                fontSize: '0.875rem'
              }}>
                <div>⚡ 無制限AI生成</div>
                <div>𝕏 X（旧Twitter）自動投稿</div>
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

              <div style={{ marginTop: '1rem', fontSize: '0.875rem', opacity: 0.8 }}>
                今日の残り生成数: {typeof usage.remaining === 'number' ? usage.remaining : 3}回/3回
              </div>
            </div>
          )}

          {/* アップグレードプロンプト */}
          <UpgradePrompt />

          {/* 設定ボタン（全ユーザー） */}
          <div style={{
            marginTop: '2rem',
            textAlign: 'center',
            padding: '1rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <button
              onClick={() => setShowSubscriptionManager(true)}
              style={{
                background: userPlan === 'premium'
                  ? 'linear-gradient(to right, #6b7280, #4b5563)'
                  : 'linear-gradient(to right, #f97316, #ea580c)',
                color: 'white',
                padding: '0.75rem 2rem',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                margin: '0 auto',
                transition: 'all 0.2s',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              title={userPlan === 'premium' ? 'プレミアムプラン管理・契約情報・解約' : 'プラン詳細確認・アップグレード'}
            >
              {userPlan === 'premium' ? (
                <>
                  <span>⚙️</span>
                  <span>アカウント設定・解約</span>
                </>
              ) : (
                <>
                  <span>📄</span>
                  <span>契約情報・プラン詳細</span>
                </>
              )}
            </button>

            <p style={{
              fontSize: '0.875rem',
              color: 'rgba(255, 255, 255, 0.7)',
              marginTop: '0.5rem',
              marginBottom: 0
            }}>
              {userPlan === 'premium'
                ? 'プラン管理・解約・SNS接続解除はこちら'
                : 'プレミアムプランの詳細・アップグレードはこちら'
              }
            </p>
          </div>

          {/* SubscriptionManagerの表示 */}
          {showSubscriptionManager && (
            <SubscriptionManager
              userId="current-user"
              onPlanChange={checkPremiumStatus}
              onClose={() => setShowSubscriptionManager(false)}
            />
          )}
        </>
      </div>
    </>
  );
};

export default PostGenerator;