// PostGenerator.jsx - SNS接続UX改善完全修正版
// 🚀 改善: 無料ユーザーでもSNS接続可能・プレミアム移行後即座投稿

import React, { useState, useEffect } from 'react';

// SubscriptionManagerコンポーネントを直接統合
const SubscriptionManager = ({ userId, onPlanChange, onClose }) => {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // インラインスタイル
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
          <h3 style={styles.title}>📄 アカウント設定</h3>
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
                  <div style={{ marginBottom: '0.5rem' }}>🐦 X (旧Twitter) 自動投稿</div>
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
                <h5 style={{ marginBottom: '0.5rem', fontWeight: 600 }}>📄 契約情報</h5>
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

// 🚀 新規追加: ウェルカムモーダルコンポーネント
const WelcomeModal = ({ onClose, onTwitterConnect, onThreadsConnect }) => {
  const [step, setStep] = useState(1);

  const styles = {
    container: {
      position: 'fixed',
      inset: 0,
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
      maxWidth: '500px',
      width: '100%',
      position: 'relative',
      maxHeight: '90vh',
      overflowY: 'auto'
    },
    header: {
      padding: '1.5rem 1.5rem 1rem',
      borderBottom: '1px solid #f3f4f6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    closeButton: {
      background: 'none',
      border: 'none',
      fontSize: '1.5rem',
      color: '#6b7280',
      cursor: 'pointer',
      padding: '0.25rem'
    },
    content: {
      padding: '1.5rem'
    },
    button: {
      width: '100%',
      padding: '0.75rem 1.5rem',
      borderRadius: '0.5rem',
      border: 'none',
      cursor: 'pointer',
      fontWeight: 500,
      fontSize: '1rem',
      marginBottom: '0.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
            {step === 1 ? '🎉 PostPilot Proへようこそ！' : '📱 SNS接続設定'}
          </h2>
          <button onClick={onClose} style={styles.closeButton}>×</button>
        </div>

        <div style={styles.content}>
          {step === 1 && (
            <div>
              <p style={{ color: '#6b7280', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                まずはSNSアカウントを接続して、投稿準備を完了させましょう！
                無料でも接続でき、プレミアム移行後すぐに投稿開始できます。
              </p>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ marginRight: '0.75rem', fontSize: '1.25rem' }}>✨</span>
                  <span>無料でも接続可能</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ marginRight: '0.75rem', fontSize: '1.25rem' }}>🚀</span>
                  <span>プレミアム移行後すぐに投稿開始</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ marginRight: '0.75rem', fontSize: '1.25rem' }}>💎</span>
                  <span>APIキー設定不要</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: '0.75rem', fontSize: '1.25rem' }}>⚡</span>
                  <span>投稿までの時間を大幅短縮</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setStep(2)}
                  style={{
                    ...styles.button,
                    background: 'linear-gradient(to right, #2563eb, #7c3aed)',
                    color: 'white',
                    flex: 1
                  }}
                >
                  SNS接続へ進む
                </button>
                <button
                  onClick={onClose}
                  style={{
                    ...styles.button,
                    background: '#f3f4f6',
                    color: '#6b7280',
                    width: 'auto',
                    padding: '0.75rem 1rem'
                  }}
                >
                  後で設定
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <p style={{ color: '#6b7280', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                どちらか1つでも接続すれば投稿準備完了です。
                両方接続すると同時投稿も可能になります！
              </p>

              <div style={{ marginBottom: '1.5rem' }}>
                <button
                  onClick={() => {
                    onTwitterConnect();
                    onClose();
                  }}
                  style={{
                    ...styles.button,
                    background: '#1d9bf0',
                    color: 'white',
                    marginBottom: '1rem'
                  }}
                >
                  <span>🐦 X (旧Twitter)に接続</span>
                </button>

                <button
                  onClick={() => {
                    onThreadsConnect();
                    onClose();
                  }}
                  style={{
                    ...styles.button,
                    background: '#000',
                    color: 'white'
                  }}
                >
                  <span>📱</span>
                  <span>Threadsに接続</span>
                </button>
              </div>

              <div style={{ fontSize: '0.875rem', color: '#6b7280', textAlign: 'center', marginBottom: '1rem' }}>
                接続後は、AI投稿生成→プレミアム移行→即座投稿のスムーズな流れで利用できます
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setStep(1)}
                  style={{
                    ...styles.button,
                    background: '#f3f4f6',
                    color: '#6b7280',
                    width: 'auto',
                    padding: '0.75rem 1rem'
                  }}
                >
                  戻る
                </button>
                <button
                  onClick={onClose}
                  style={{
                    ...styles.button,
                    background: '#10b981',
                    color: 'white',
                    flex: 1
                  }}
                >
                  後で接続する
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 🚀 新規追加: 接続状態バッジコンポーネント
const ConnectionBadge = ({ twitterConnected, threadsConnected, twitterUsername, threadsUsername }) => {
  const isReady = twitterConnected || threadsConnected;

  if (!isReady) {
    return (
      <div style={{
        background: '#dbeafe',
        border: '1px solid #93c5fd',
        borderRadius: '0.5rem',
        padding: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ marginRight: '0.5rem', fontSize: '1.25rem' }}>💡</span>
          <span style={{ fontWeight: 600, color: '#1e40af' }}>SNS接続で投稿準備を完了させませんか？</span>
        </div>
        <p style={{ color: '#3730a3', fontSize: '0.875rem', margin: 0 }}>
          事前に接続しておくと、プレミアム移行後すぐに投稿開始できます（無料でも接続可能）
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: '#ecfdf5',
      border: '1px solid #86efac',
      borderRadius: '0.5rem',
      padding: '1rem',
      marginBottom: '1.5rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span style={{ marginRight: '0.5rem', fontSize: '1.25rem' }}>🚀</span>
        <span style={{ fontWeight: 600, color: '#166534' }}>投稿準備完了！</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
        {twitterConnected && (
          <span style={{
            background: '#dbeafe',
            color: '#1e40af',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            <span>🐦</span>
            <span>X (旧Twitter)</span>
            <span>✅</span>
          </span>
        )}

        {threadsConnected && (
          <span style={{
            background: '#f3f4f6',
            color: '#374151',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            <span>📱</span>
            <span>Threads</span>
            <span>✅</span>
          </span>
        )}
      </div>

      <p style={{ color: '#166534', fontSize: '0.875rem', margin: 0 }}>
        プレミアム移行後、投稿生成→即座投稿のスムーズな体験をお楽しみいただけます
      </p>
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

  // 🔧 修正: 不足していた状態変数を追加
  const [upgrading, setUpgrading] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  // SNS投稿関連の状態
  const [twitterConnected, setTwitterConnected] = useState(false);
  const [threadsConnected, setThreadsConnected] = useState(false);
  const [twitterUsername, setTwitterUsername] = useState('');
  const [threadsUsername, setThreadsUsername] = useState('');
  const [isPostingToTwitter, setIsPostingToTwitter] = useState(false);
  const [isPostingToThreads, setIsPostingToThreads] = useState(false);

  // アカウント設定ボタン状態管理
  const [showSubscriptionManager, setShowSubscriptionManager] = useState(false);

  // 🚀 新規追加: ウェルカムモーダル状態管理
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // 🔧 修正: プレミアム確認とSNS接続状況確認を統合
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
    } else {
      console.log('📋 Free plan confirmed');
      setUserPlan('free');
      setUsage({ remaining: 3, used: 0, limit: 3 });
    }

    // 🚀 改善: 全ユーザーでSNS接続確認を実行
    checkSnsConnections();
  };

  // 🔧 修正: SNS接続状況確認の改善（無限ループ防止）
  const checkSnsConnections = async () => {
    // 既に確認中の場合はスキップ
    if (window.snsCheckInProgress) {
      console.log('🔧 SNS check already in progress, skipping');
      return;
    }

    window.snsCheckInProgress = true;
    console.log('🔍 Checking SNS connections...');

    const userId = getCurrentUserId();

    try {
      // Twitter接続状態確認
      console.log('🐦 Checking Twitter connection...');
      try {
        const twitterResponse = await fetch('/api/auth/twitter/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });

        if (twitterResponse.ok) {
          const twitterData = await twitterResponse.json();
          console.log('🐦 X (旧Twitter) status:', twitterData);

          if (twitterData.connected) {
            setTwitterConnected(true);
            setTwitterUsername(twitterData.username);
            // localStorageにも保存
            localStorage.setItem('twitter_username', twitterData.username);
            localStorage.setItem('twitter_connected', 'true');
          } else {
            setTwitterConnected(false);
            setTwitterUsername('');
          }
        } else {
          console.log('❌ Twitter status check failed');
          // フォールバック: localStorageから確認
          const localTwitterToken = localStorage.getItem('twitter_token');
          const localTwitterUser = localStorage.getItem('twitter_username');
          if (localTwitterToken && localTwitterUser) {
            setTwitterConnected(true);
            setTwitterUsername(localTwitterUser);
            console.log('🔧 Twitter status from localStorage:', localTwitterUser);
          }
        }
      } catch (twitterError) {
        console.error('❌ Twitter connection check error:', twitterError);
        // フォールバック処理
        const localTwitterToken = localStorage.getItem('twitter_token');
        const localTwitterUser = localStorage.getItem('twitter_username');
        if (localTwitterToken && localTwitterUser) {
          setTwitterConnected(true);
          setTwitterUsername(localTwitterUser);
        }
      }

      // Threads接続状態確認
      console.log('📱 Checking Threads connection...');
      try {
        const threadsResponse = await fetch('/api/auth/threads/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });

        if (threadsResponse.ok) {
          const threadsData = await threadsResponse.json();
          console.log('📱 Threads status:', threadsData);

          if (threadsData.connected) {
            setThreadsConnected(true);
            setThreadsUsername(threadsData.username);
            // localStorageにも保存
            localStorage.setItem('threads_username', threadsData.username);
            localStorage.setItem('threads_connected', 'true');
          } else {
            setThreadsConnected(false);
            setThreadsUsername('');
          }
        } else {
          console.log('❌ Threads status check failed');
          // フォールバック: localStorageから確認
          const localThreadsToken = localStorage.getItem('threads_token');
          const localThreadsUser = localStorage.getItem('threads_username');
          if (localThreadsToken) {
            setThreadsConnected(true);
            setThreadsUsername(localThreadsUser || 'Connected User');
            console.log('🔧 Threads status from localStorage');
          }
        }
      } catch (threadsError) {
        console.error('❌ Threads connection check error:', threadsError);
        // フォールバック処理
        const localThreadsToken = localStorage.getItem('threads_token');
        if (localThreadsToken) {
          setThreadsConnected(true);
          setThreadsUsername(localStorage.getItem('threads_username') || 'Connected User');
        }
      }

      console.log('🎯 SNS connections checked:', {
        twitter: { connected: twitterConnected, username: twitterUsername },
        threads: { connected: threadsConnected, username: threadsUsername }
      });

    } catch (error) {
      console.error('❌ SNS connection check failed:', error);
    } finally {
      // 確認完了フラグをリセット
      setTimeout(() => {
        window.snsCheckInProgress = false;
      }, 2000); // 2秒間は再実行を防ぐ
    }
  };

  // 🔧 修正: ユーザーID生成の統一
  const getCurrentUserId = () => {
    let userId = localStorage.getItem('userId');
    if (!userId) {
      userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('userId', userId);
    }
    return userId;
  };

  // 🚀 新規追加: 初回訪問判定
  const checkFirstVisit = () => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    const hasConnectedAnySNS = localStorage.getItem('twitter_connected') || localStorage.getItem('threads_connected');

    if (!hasSeenWelcome && !hasConnectedAnySNS) {
      // 2秒後にウェルカムモーダルを表示（ページ読み込み完了後）
      setTimeout(() => {
        setShowWelcomeModal(true);
      }, 2000);
    }
  };

  // 🔧 修正: 初期化処理の改善
  useEffect(() => {
    console.log('🚀 PostGenerator initializing...');

    // プレミアム状態とSNS接続確認
    checkPremiumStatus();

    // 🚀 新規追加: 初回訪問確認
    checkFirstVisit();

    // URLパラメータからの状態検知
    const urlParams = new URLSearchParams(window.location.search);

    // Stripe決済成功検知
    const sessionId = urlParams.get('session_id');
    if (sessionId) {
      console.log('💳 Stripe session detected:', sessionId);
      manualUpgradeToPremium();
    }

    // OAuth認証成功検知
    const authSuccess = urlParams.get('auth_success');
    if (authSuccess) {
      console.log('🔐 OAuth success detected:', authSuccess);
      setTimeout(() => {
        checkSnsConnections();
      }, 1000);
    }

    // Twitter OAuth完了検知
    const oauth_token = urlParams.get('oauth_token');
    const oauth_verifier = urlParams.get('oauth_verifier');
    if (oauth_token && oauth_verifier) {
      console.log('🐦 X (旧Twitter) OAuth callback detected');
      setTimeout(() => {
        checkSnsConnections();
      }, 1000);
    }

    // Threads認証完了検知
    const threadsAuth = urlParams.get('threads_auth');
    const threadsUsername = urlParams.get('username');
    if (threadsAuth === 'success' && threadsUsername) {
      console.log('📱 Threads auth success detected:', threadsUsername);
      setThreadsConnected(true);
      setThreadsUsername(threadsUsername);
      localStorage.setItem('threads_username', threadsUsername);
      localStorage.setItem('threads_connected', 'true');
    }

    // URLパラメータクリーンアップ
    if (sessionId || authSuccess || oauth_token || threadsAuth) {
      const url = new URL(window.location);
      url.searchParams.delete('session_id');
      url.searchParams.delete('auth_success');
      url.searchParams.delete('oauth_token');
      url.searchParams.delete('oauth_verifier');
      url.searchParams.delete('threads_auth');
      url.searchParams.delete('username');
      window.history.replaceState({}, document.title, url.toString());
    }

  }, []);

  // 🔧 修正: ウィンドウメッセージリスナー（OAuth完了通知）
  useEffect(() => {
    const handleMessage = (event) => {
      console.log('📩 Window message received:', event.data);

      if (event.data.type === 'TWITTER_AUTH_SUCCESS') {
        console.log('🐦 X (旧Twitter) auth success message received');
        setTwitterConnected(true);
        setTwitterUsername(event.data.username);
        localStorage.setItem('twitter_username', event.data.username);
        localStorage.setItem('twitter_connected', 'true');
      }

      if (event.data.type === 'THREADS_AUTH_SUCCESS') {
        console.log('📱 Threads auth success message received');
        setThreadsConnected(true);
        setThreadsUsername(event.data.username);
        localStorage.setItem('threads_username', event.data.username);
        localStorage.setItem('threads_connected', 'true');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
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
  };

  // Twitter接続処理
  const connectTwitter = async () => {
    try {
      console.log('🐦 Starting Twitter OAuth...');
      setError('');

      const userId = getCurrentUserId();

      const response = await fetch('/api/auth/twitter/authorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.authUrl || data.url) {
          window.location.href = data.authUrl || data.url;
        } else {
          throw new Error('認証URLが取得できませんでした');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Twitter OAuth APIエラー');
      }
    } catch (error) {
      console.error('❌ Twitter connection error:', error);
      setError('Twitter接続でエラーが発生しました。設定を確認してください。');
    }
  };

  // Threads接続処理
  const connectThreads = async () => {
    try {
      console.log('📱 Starting Threads OAuth...');
      setError('');

      const userId = getCurrentUserId();

      const response = await fetch('/api/auth/threads/authorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });

      console.log('📡 Threads auth response:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('📥 Threads auth data:', data);

        if (data.authUrl) {
          window.location.href = data.authUrl;
        } else {
          throw new Error('認証URLが取得できませんでした');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Threads OAuth APIエラー');
      }

    } catch (error) {
      console.error('❌ Threads connection error:', error);
      setError('Threads接続でエラーが発生しました。設定を確認してください。');
    }
  };

  // 手動Twitter接続設定（開発・テスト用）
  const manualTwitterSetup = () => {
    const username = window.prompt('Twitterのユーザーネームをテスト入力してください（@なし）:');
    if (username) {
      localStorage.setItem('twitter_token', 'test_token_' + Date.now());
      localStorage.setItem('twitter_username', username);
      localStorage.setItem('twitter_connected', 'true');
      setTwitterConnected(true);
      setTwitterUsername(username);
      setError('');
      console.log('🔧 Manual Twitter setup completed:', username);
      window.alert(`✅ Twitterアカウント @${username} をテスト接続しました！`);
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
      console.log('🐦 Posting to Twitter...');

      const userId = getCurrentUserId();

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

        // テストモード判定
        if (data.test_mode || localStorage.getItem('twitter_token')?.includes('test_token')) {
          console.log('🔧 Test mode: simulating successful post');
          window.alert('✅ テストモード: Twitter投稿が成功しました！\n\n' + generatedPost.substring(0, 100) + '...');
          return;
        }

        throw new Error(data.error || 'Twitter投稿に失敗しました');
      }

      console.log('✅ Twitter post successful:', data);

      // 成功メッセージ
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

  // ThreadsへSNS投稿
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

      const userId = getCurrentUserId();

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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Threads投稿に失敗しました');
      }

      const data = await response.json();
      console.log('✅ Threads post successful:', data);

      // 成功メッセージ
      if (data.post_id) {
        window.alert(`✅ Threadsに投稿しました！\n\n投稿ID: ${data.post_id}`);
      } else {
        window.alert('✅ Threadsに投稿しました！');
      }

    } catch (error) {
      console.error('❌ Threads post error:', error);
      setError(`Threads投稿でエラーが発生しました: ${error.message}`);
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

    // 順次実行
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

    // 結果サマリー
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

  // 🔧 修正: プレミアムアップグレード処理の修正
  const handleUpgrade = async () => {
    try {
      setUpgrading(true);

      const userId = getCurrentUserId();

      console.log('🚀 Starting upgrade process for user:', userId);

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          customerEmail: userEmail || undefined // 任意：ユーザーメールアドレス
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Checkout session created:', data.sessionId);

        // Stripe Checkoutにリダイレクト
        window.location.href = data.url;
      } else {
        const errorData = await response.json();
        console.error('❌ Checkout session creation failed:', errorData);

        setError('決済画面の作成に失敗しました。しばらく後で再試行してください。');
        setUpgrading(false);
      }
    } catch (error) {
      console.error('❌ Upgrade error:', error);
      setError('エラーが発生しました。ネットワーク接続を確認してください。');
      setUpgrading(false);
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
        threadsUsername,
        localStorage: Object.fromEntries(
          Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])
        )
      }),
      manualUpgrade: manualUpgradeToPremium,
      checkStatus: checkPremiumStatus,
      checkSns: checkSnsConnections,
      manualTwitter: manualTwitterSetup,
    };
    console.log('🔧 Debug functions available: window.debugSNSApp');
  }, [userPlan, usage, twitterConnected, threadsConnected]);

  // 🚀 改善: SNS投稿ボタンの表示判定（プレミアムのみ）
  const shouldShowSNSButtons = () => {
    return userPlan === 'premium' && generatedPost && generatedPost.trim().length > 0;
  };

  // 🚀 改善: SNS接続ボタンの表示判定（全ユーザー）
  const shouldShowConnectionButtons = () => {
    return true; // 全ユーザーに表示
  };

  // 🚀 改善: プレミアム誘導メッセージの生成
  const generateUpgradeMessage = () => {
    const isReady = twitterConnected || threadsConnected;

    if (isReady) {
      return {
        title: "🚀 準備完了！今すぐプレミアムで投稿開始",
        message: "SNS接続済みなので、プレミアム移行後すぐに投稿できます",
        benefits: [
          "✅ 即座投稿開始（待機時間なし）",
          "🔥 無制限AI投稿生成",
          "📱 X・Threads同時投稿",
          "👑 プレミアム限定機能"
        ]
      };
    } else {
      return {
        title: "💎 プレミアムで無制限投稿",
        message: "プレミアム移行後、SNS接続で投稿開始できます",
        benefits: [
          "🔥 無制限AI投稿生成",
          "📱 Twitter・Threads投稿機能",
          "🚀 同時投稿機能",
          "👑 プレミアム限定機能"
        ]
      };
    }
  };

  // アップグレードプロンプト
  const UpgradePrompt = () => {
    if (!showUpgradePrompt) return null;

    const upgradeInfo = generateUpgradeMessage();

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
                {upgradeInfo.title}
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
                {upgradeInfo.benefits.map((benefit, index) => (
                  <li key={index}>{benefit}</li>
                ))}
              </ul>
            </div>

            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
              {upgradeInfo.message}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                onClick={handleUpgrade}
                disabled={upgrading}
                style={{
                  width: '100%',
                  background: upgrading ? '#9ca3af' : '#fbbf24',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  fontWeight: '500',
                  border: 'none',
                  cursor: upgrading ? 'not-allowed' : 'pointer'
                }}
              >
                {upgrading ? '決済画面準備中...' : '月額¥980でアップグレード'}
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
    <div
      className="unified-container"
      style={{ minHeight: '100vh', backgroundColor: '#f0f4ff', padding: '2rem' }}
    >
      <div
        className="unified-main-container"
        style={{ maxWidth: '60rem', margin: '0 auto' }}
      >
        {/* ヘッダー */}
        <div
          className="unified-header"
          style={{ textAlign: 'center', marginBottom: '2rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#1f2937' }}>AI SNS自動化ツール</h1>

            {/* プレミアムバッジ */}
            {userPlan === 'premium' && (
              <div
                className="unified-premium-badge"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'linear-gradient(to right, #fbbf24, #f97316)',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '9999px',
                  fontWeight: 'bold'
                }}
              >
                <span>👑</span>
                PREMIUM MEMBER
              </div>
            )}
          </div>

          <p style={{ fontSize: '1.25rem', color: '#6b7280' }}>
            {userPlan === 'premium'
              ? '無制限AI投稿生成 + SNS自動投稿'
              : 'APIキー設定不要で即座にAI投稿生成'}
          </p>
        </div>

        {/* メインコンテンツ */}
        <div
          className="unified-card"
          style={{
            background: 'white',
            borderRadius: '1rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            padding: '2rem'
          }}
        >
          {/* 🚀 新規追加: 接続状態バッジ */}
          <ConnectionBadge
            twitterConnected={twitterConnected}
            threadsConnected={threadsConnected}
            twitterUsername={twitterUsername}
            threadsUsername={threadsUsername}
          />

          {/* 🚀 新規追加: SNS接続セクション（全ユーザー表示） */}
          {shouldShowConnectionButtons() && (
            <div style={{
              marginBottom: '2rem',
              padding: '1.5rem',
              background: '#f8fafc',
              borderRadius: '0.75rem',
              border: '1px solid #e2e8f0'
            }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
                📱 SNS接続設定
              </h3>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
                事前に接続しておくと、プレミアム移行後すぐに投稿開始できます（無料でも接続可能）
              </p>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {/* Twitter接続 */}
                <div style={{ flex: 1, minWidth: '200px' }}>
                  {twitterConnected ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      background: '#dbeafe',
                      borderRadius: '0.5rem',
                      border: '1px solid #93c5fd'
                    }}>
                      <span style={{ color: '#1e40af', fontWeight: 500 }}>
                        🐦 X (Twitter) ✅
                      </span>
                      <button
                        onClick={() => {
                          localStorage.removeItem('twitter_token');
                          localStorage.removeItem('twitter_username');
                          localStorage.removeItem('twitter_connected');
                          setTwitterConnected(false);
                          setTwitterUsername('');
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#dc2626',
                          cursor: 'pointer',
                          fontSize: '0.875rem'
                        }}
                      >
                        切断
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={connectTwitter}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        background: '#1d9bf0',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <span>🐦</span>
                      <span>X (旧Twitter) に接続</span>
                    </button>
                  )}
                </div>

                {/* Threads接続 */}
                <div style={{ flex: 1, minWidth: '200px' }}>
                  {threadsConnected ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      background: '#f3f4f6',
                      borderRadius: '0.5rem',
                      border: '1px solid #d1d5db'
                    }}>
                      <span style={{ color: '#374151', fontWeight: 500 }}>
                        📱 Threads ✅
                      </span>
                      <button
                        onClick={() => {
                          localStorage.removeItem('threads_token');
                          localStorage.removeItem('threads_username');
                          localStorage.removeItem('threads_connected');
                          setThreadsConnected(false);
                          setThreadsUsername('');
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#dc2626',
                          cursor: 'pointer',
                          fontSize: '0.875rem'
                        }}
                      >
                        切断
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={connectThreads}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        background: '#000',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <span>📱</span>
                      <span>Threadsに接続</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

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

            {/* SNS接続状況（全ユーザー） */}
            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
              <span>SNS接続: </span>
              {twitterConnected && <span style={{ color: '#1d9bf0' }}>🐦 X (旧Twitter)</span>}
              {threadsConnected && <span style={{ color: '#000' }}>📱 Threads </span>}
              {!twitterConnected && !threadsConnected && <span>未接続</span>}
            </div>
          </div>

          {/* 入力フォーム */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                投稿のテーマ
              </label>
              <textarea
                className="unified-textarea"
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
                className="unified-select"
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

                {/* 🚀 改善: プレミアム限定SNS投稿ボタン */}
                {shouldShowSNSButtons() && (
                  <>
                    {/* X (旧Twitter) 投稿 */}
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
                        {isPostingToTwitter ? '投稿中...' : `🐦 X (Twitter) に投稿`}
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
                        🐦 X (旧Twitter) を接続
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

              {/* 🚀 改善: 無料プランのSNS投稿プレビュー */}
              {userPlan !== 'premium' && (
                <div style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  background: 'linear-gradient(to right, #fef3c7, #fed7aa)',
                  borderRadius: '0.5rem',
                  border: '1px solid #fbbf24'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ marginRight: '0.5rem', fontSize: '1.25rem' }}>💎</span>
                    <span style={{ fontWeight: 600, color: '#92400e' }}>
                      {(twitterConnected || threadsConnected)
                        ? 'SNS接続済み！プレミアムで即座投稿開始'
                        : 'プレミアムプランでSNS自動投稿'
                      }
                    </span>
                  </div>
                  <p style={{ color: '#92400e', fontSize: '0.875rem', margin: 0 }}>
                    {(twitterConnected || threadsConnected)
                      ? 'SNS接続準備完了済み。プレミアム移行後、この投稿をすぐに自動投稿できます！'
                      : 'この投稿をTwitterやThreadsに自動投稿＋同時投稿できます！'
                    }
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 🚀 改善: プレミアム促進（無料プランのみ） */}
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
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                {(twitterConnected || threadsConnected)
                  ? '準備完了！プレミアムで即座投稿開始'
                  : 'もっと生成したい方へ'
                }
              </h3>
            </div>
            <p style={{ fontSize: '1.125rem', marginBottom: '1.5rem', opacity: 0.9 }}>
              {(twitterConnected || threadsConnected)
                ? 'SNS接続済みなので、プレミアム移行後すぐに自動投稿開始できます'
                : 'プレミアムプランで無制限生成＋SNS自動投稿をお楽しみください'
              }
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
              <div>🐦 X (旧Twitter)自動投稿</div>
              <div>📱 Threads自動投稿</div>
              <div>🔄 同時投稿機能</div>
            </div>

            <button
              onClick={handleUpgrade}
              disabled={upgrading}
              style={{
                background: upgrading ? '#9ca3af' : 'white',
                color: upgrading ? 'white' : '#f97316',
                padding: '1rem 2rem',
                borderRadius: '0.5rem',
                fontWeight: 'bold',
                fontSize: '1.125rem',
                border: 'none',
                cursor: upgrading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {upgrading ? '決済画面準備中...' : (
                (twitterConnected || threadsConnected)
                  ? '🚀 今すぐプレミアムで投稿開始（¥980/月）'
                  : '💎 プレミアムプランを見る（¥980/月）'
              )}
            </button>

            {/* 現在の使用状況表示 */}
            <div style={{ marginTop: '1rem', fontSize: '0.875rem', opacity: 0.8 }}>
              今日の残り生成数: {typeof usage.remaining === 'number' ? usage.remaining : 3}回/3回
              {(twitterConnected || threadsConnected) && (
                <div style={{ marginTop: '0.25rem' }}>
                  ✅ SNS接続準備完了 - プレミアム移行後即座投稿可能
                </div>
              )}
            </div>
          </div>
        )}

        {/* アップグレードプロンプト */}
        <UpgradePrompt />

        {/* 🚀 新規追加: ウェルカムモーダル */}
        {showWelcomeModal && (
          <WelcomeModal
            onClose={() => {
              setShowWelcomeModal(false);
              localStorage.setItem('hasSeenWelcome', 'true');
            }}
            onTwitterConnect={connectTwitter}
            onThreadsConnect={connectThreads}
          />
        )}

        {/* フッター統一設定ボタン */}
        <div style={{
          marginTop: '2rem',
          textAlign: 'center',
          padding: '1rem',
          borderTop: '1px solid #e5e7eb'
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
            title={userPlan === 'premium' ? 'プレミアムプラン管理・契約情報' : 'プラン詳細確認・アップグレード'}
          >
            {userPlan === 'premium' ? (
              <>
                <span>⚙️</span>
                <span>アカウント設定</span>
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
            color: '#6b7280',
            marginTop: '0.5rem',
            marginBottom: 0
          }}>
            {userPlan === 'premium'
              ? 'プラン管理・解約・請求情報はこちら'
              : 'プレミアムプランの詳細・アップグレードはこちら'
            }
          </p>
        </div>

        {/* SubscriptionManagerの表示 */}
        {showSubscriptionManager && (
          <SubscriptionManager
            userId={getCurrentUserId()}
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