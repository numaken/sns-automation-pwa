// PostGenerator.jsx - 完全統合版（引き継ぎ書類準拠）
import React, { useState, useEffect } from 'react';

const PostGenerator = () => {
  // メインstate管理
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState('フレンドリー');
  const [generatedPost, setGeneratedPost] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [quality, setQuality] = useState(null);

  // プレミアム機能管理
  const [userPlan, setUserPlan] = useState('free');
  const [usage, setUsage] = useState({ remaining: 3 });
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState('inactive');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // SNS投稿機能管理
  const [twitterConnected, setTwitterConnected] = useState(false);
  const [threadsConnected, setThreadsConnected] = useState(false);
  const [twitterUsername, setTwitterUsername] = useState('');
  const [threadsUsername, setThreadsUsername] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [postSuccess, setPostSuccess] = useState('');

  // サブスクリプション管理state
  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelType, setCancelType] = useState('end_of_period');
  const [cancellationReason, setCancellationReason] = useState('');
  const [showBillingDetails, setShowBillingDetails] = useState(false);

  // 統計・分析state
  const [stats, setStats] = useState({ totalGenerated: 0, averageQuality: 0 });
  const [generationHistory, setGenerationHistory] = useState([]);
  const [lastGenerationTime, setLastGenerationTime] = useState(null);
  const [optimizedGeneration, setOptimizedGeneration] = useState(false);

  // プラン検証・初期化
  useEffect(() => {
    const checkUserPlan = () => {
      const localPlan = localStorage.getItem('userPlan');
      const localStatus = localStorage.getItem('subscriptionStatus');

      if (localPlan === 'premium' && localStatus === 'active') {
        setUserPlan('premium');
        setSubscriptionStatus('active');
        setUsage({ remaining: 'unlimited' });

        const savedStats = localStorage.getItem('premiumStats');
        if (savedStats) {
          setStats(JSON.parse(savedStats));
        }
      } else {
        setUserPlan('free');
        const dailyUsage = localStorage.getItem('dailyUsage');
        if (dailyUsage) {
          const parsedUsage = JSON.parse(dailyUsage);
          setUsage(parsedUsage);
        }
      }
    };

    checkUserPlan();

    // SNS接続状況確認
    const twitterToken = localStorage.getItem('twitter_token');
    const threadsToken = localStorage.getItem('threads_token');
    const twitterUser = localStorage.getItem('twitter_username');
    const threadsUser = localStorage.getItem('threads_username');

    if (twitterToken && twitterUser) {
      setTwitterConnected(true);
      setTwitterUsername(twitterUser);
    }

    if (threadsToken && threadsUser) {
      setThreadsConnected(true);
      setThreadsUsername(threadsUser);
    }

    // デバッグ情報設定
    window.debugSNSApp = {
      showInfo: () => ({
        userPlan,
        usage,
        twitterConnected,
        threadsConnected,
        subscriptionStatus
      })
    };
  }, []);

  // AI投稿生成機能
  const generatePost = async () => {
    if (!prompt.trim()) {
      setError('投稿のテーマを入力してください');
      return;
    }

    setIsLoading(true);
    setIsGenerating(true);
    setError('');
    setGeneratedPost('');
    setQuality(null);

    const startTime = Date.now();

    try {
      const endpoint = userPlan === 'premium'
        ? '/api/generate-post'
        : '/api/generate-post-shared';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          tone,
          userType: userPlan
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setError('1日の無料生成回数を超えました。プレミアムプランで無制限生成！');
          setUsage({ remaining: 0 });
          setShowUpgradePrompt(true);
        } else {
          throw new Error(data.error || '投稿生成に失敗しました');
        }
        return;
      }

      setGeneratedPost(data.post);
      setQuality(data.quality);

      if (data.usage) {
        setUsage(data.usage);
        localStorage.setItem('dailyUsage', JSON.stringify(data.usage));
      }

      // 統計情報更新
      const generationTime = Date.now() - startTime;
      setLastGenerationTime(generationTime);
      setOptimizedGeneration(data.optimized || false);

      if (userPlan === 'premium') {
        const newStats = {
          ...stats,
          totalGenerated: stats.totalGenerated + 1,
          averageQuality: Math.round((stats.averageQuality * stats.totalGenerated + data.quality) / (stats.totalGenerated + 1))
        };
        setStats(newStats);
        localStorage.setItem('premiumStats', JSON.stringify(newStats));
      }

      // 転換促進
      if (userPlan === 'free' && data.usage.remaining <= 1) {
        setShowUpgradePrompt(true);
      }

    } catch (error) {
      console.error('Generate post error:', error);
      setError('ネットワークエラーが発生しました。しばらく待ってから再試行してください。');
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  };

  // Twitter OAuth接続機能
  const connectTwitter = async () => {
    try {
      const response = await fetch('/api/auth/twitter/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'twitter-oauth-user-' + Date.now()
        })
      });

      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setError('Twitter認証URLの取得に失敗しました');
      }
    } catch (error) {
      console.error('Twitter auth error:', error);
      setError('Twitter認証の開始に失敗しました');
    }
  };

  // Threads OAuth接続機能
  const connectThreads = async () => {
    try {
      const response = await fetch('/api/auth/threads/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'threads-oauth-user-' + Date.now()
        })
      });

      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setError('Threads認証URLの取得に失敗しました');
      }
    } catch (error) {
      console.error('Threads auth error:', error);
      setError('Threads認証の開始に失敗しました');
    }
  };

  // Twitter投稿機能
  const postToTwitter = async () => {
    if (!generatedPost) {
      setError('投稿する内容がありません');
      return;
    }

    setIsPosting(true);
    try {
      const userId = localStorage.getItem('twitter_user_id') || 'default-user';

      const response = await fetch('/api/post-to-twitter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: generatedPost,
          userId: userId
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setPostSuccess('Twitterに投稿が成功しました！');
        setTimeout(() => setPostSuccess(''), 3000);
      } else {
        setError(data.error || 'Twitter投稿に失敗しました');
      }
    } catch (error) {
      console.error('Twitter post error:', error);
      setError('Twitter投稿でエラーが発生しました');
    } finally {
      setIsPosting(false);
    }
  };

  // Threads投稿機能
  const postToThreads = async () => {
    if (!generatedPost) {
      setError('投稿する内容がありません');
      return;
    }

    setIsPosting(true);
    try {
      const userId = localStorage.getItem('threads_user_id') || 'default-user';

      const response = await fetch('/api/post-to-threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: generatedPost,
          userId: userId
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setPostSuccess('Threadsに投稿が成功しました！');
        setTimeout(() => setPostSuccess(''), 3000);
      } else {
        setError(data.error || 'Threads投稿に失敗しました');
      }
    } catch (error) {
      console.error('Threads post error:', error);
      setError('Threads投稿でエラーが発生しました');
    } finally {
      setIsPosting(false);
    }
  };

  // 同時投稿機能
  const postToAllPlatforms = async () => {
    if (!generatedPost) {
      setError('投稿する内容がありません');
      return;
    }

    setIsPosting(true);
    const results = [];

    try {
      if (twitterConnected) {
        await postToTwitter();
        results.push('Twitter');
      }

      if (threadsConnected) {
        await postToThreads();
        results.push('Threads');
      }

      if (results.length > 0) {
        setPostSuccess(`${results.join('・')}に同時投稿が成功しました！`);
        setTimeout(() => setPostSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Multi-platform post error:', error);
      setError('同時投稿でエラーが発生しました');
    } finally {
      setIsPosting(false);
    }
  };

  // Stripeアップグレード機能
  const handleUpgrade = async () => {
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: 'price_premium_plan',
          successUrl: `${window.location.origin}/success`,
          cancelUrl: window.location.href,
        }),
      });

      const { sessionId } = await response.json();

      if (sessionId) {
        window.location.href = `https://checkout.stripe.com/pay/${sessionId}`;
      } else {
        setError('決済セッションの作成に失敗しました');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      setError('アップグレード処理でエラーが発生しました');
    }
  };

  // サブスクリプション管理関数（コンポーネント外で定義）
  const handleCancelSubscription = async () => {
    setSubscriptionLoading(true);
    try {
      if (cancelType === 'immediate') {
        localStorage.setItem('userPlan', 'free');
        localStorage.setItem('subscriptionStatus', 'cancelled');
        setUserPlan('free');
        setSubscriptionStatus('cancelled');
        setUsage({ remaining: 3 });
      }

      setShowCancelModal(false);
      setPostSuccess(`サブスクリプションを${cancelType === 'immediate' ? '即座に' : '期間終了時に'}キャンセルしました`);
    } catch (error) {
      setError('キャンセル処理でエラーが発生しました');
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleReactivateSubscription = async () => {
    setSubscriptionLoading(true);
    try {
      localStorage.setItem('subscriptionStatus', 'active');
      setSubscriptionStatus('active');
      setPostSuccess('サブスクリプションを再開しました');
    } catch (error) {
      setError('再開処理でエラーが発生しました');
    } finally {
      setSubscriptionLoading(false);
    }
  };

  // サブスクリプション管理コンポーネント
  const SubscriptionManagerComponent = () => {

    if (userPlan === 'free') {
      return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2 style={{ color: '#1f2937', marginBottom: '1rem' }}>プレミアムプランのご案内</h2>
          <div style={{
            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            padding: '1.5rem',
            borderRadius: '12px',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ color: 'white', marginBottom: '1rem' }}>🌟 プレミアム特典</h3>
            <ul style={{ color: 'white', textAlign: 'left', listStyle: 'none', padding: 0 }}>
              <li>✨ 無制限AI投稿生成</li>
              <li>🚀 高速生成（専用APIキー）</li>
              <li>🐦 Twitter自動投稿</li>
              <li>🔄 Threads自動投稿</li>
              <li>📊 詳細統計・分析</li>
              <li>👑 プレミアムサポート</li>
            </ul>
          </div>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1rem' }}>
            月額 ¥980
          </p>
          <button
            onClick={handleUpgrade}
            style={{
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              color: 'white',
              border: 'none',
              padding: '0.75rem 2rem',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            プレミアムにアップグレード
          </button>
        </div>
      );
    }

    return (
      <div style={{ padding: '2rem' }}>
        <h2 style={{ color: '#1f2937', marginBottom: '1rem' }}>サブスクリプション管理</h2>

        <div style={{
          background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
          padding: '1.5rem',
          borderRadius: '12px',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>👑 プレミアムプラン</h3>
          <p style={{ color: 'white', margin: '0.5rem 0' }}>
            ステータス: {subscriptionStatus === 'active' ? '✅ アクティブ' : '❌ 非アクティブ'}
          </p>
          <p style={{ color: 'white', margin: '0.5rem 0' }}>月額: ¥980</p>
          <p style={{ color: 'white', margin: '0.5rem 0' }}>
            次回更新: {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
          </p>
        </div>

        {subscriptionStatus === 'active' && (
          <div style={{ marginBottom: '1rem' }}>
            <button
              onClick={() => setShowCancelModal(true)}
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer',
                marginRight: '0.5rem'
              }}
            >
              サブスクリプションをキャンセル
            </button>
            <button
              onClick={() => setShowBillingDetails(!showBillingDetails)}
              style={{
                background: '#6b7280',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              請求詳細を表示
            </button>
          </div>
        )}

        {subscriptionStatus === 'cancelled' && (
          <button
            onClick={handleReactivateSubscription}
            style={{
              background: '#10b981',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            サブスクリプションを再開
          </button>
        )}

        {showBillingDetails && (
          <div style={{
            background: '#f9fafb',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            <h4>請求詳細</h4>
            <p>開始日: {new Date().toLocaleDateString()}</p>
            <p>次回請求日: {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
            <p>料金: ¥980/月</p>
          </div>
        )}
      </div>
    );
  };

  // キャンセル確認モーダル
  const CancelModal = () => {
    if (!showCancelModal) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '12px',
          maxWidth: '500px',
          margin: '0 1rem'
        }}>
          <h3 style={{ marginBottom: '1rem' }}>サブスクリプションのキャンセル</h3>

          <div style={{ marginBottom: '1rem' }}>
            <label>
              <input
                type="radio"
                value="end_of_period"
                checked={cancelType === 'end_of_period'}
                onChange={(e) => setCancelType(e.target.value)}
                style={{ marginRight: '0.5rem' }}
              />
              期間終了時にキャンセル（推奨）
            </label>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label>
              <input
                type="radio"
                value="immediate"
                checked={cancelType === 'immediate'}
                onChange={(e) => setCancelType(e.target.value)}
                style={{ marginRight: '0.5rem' }}
              />
              即座にキャンセル
            </label>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="reason">キャンセル理由（任意）:</label>
            <select
              id="reason"
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #d1d5db',
                marginTop: '0.5rem'
              }}
            >
              <option value="">選択してください</option>
              <option value="too_expensive">料金が高い</option>
              <option value="not_using_enough">十分に使用していない</option>
              <option value="technical_issues">技術的な問題</option>
              <option value="other">その他</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowCancelModal(false)}
              style={{
                background: '#6b7280',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              キャンセル
            </button>
            <button
              onClick={handleCancelSubscription}
              disabled={subscriptionLoading}
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              {subscriptionLoading ? '処理中...' : '確認'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // アップグレードプロンプト
  const UpgradePrompt = () => {
    if (!showUpgradePrompt) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '12px',
          maxWidth: '400px',
          margin: '0 1rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👑</div>
          <h2 style={{ marginBottom: '1rem' }}>
            {usage.remaining === 0 ? '本日の無料生成完了！' : 'もっと生成しませんか？'}
          </h2>

          <div style={{
            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>プレミアムで解放される機能</h3>
            <ul style={{ color: 'white', textAlign: 'left', listStyle: 'none', padding: 0, margin: 0 }}>
              <li>♾️ 無制限の投稿生成</li>
              <li>⚡ 高速生成（専用APIキー）</li>
              <li>👑 広告なしのクリーンUI</li>
            </ul>
          </div>

          <p style={{ marginBottom: '1rem' }}>
            {usage.remaining === 0
              ? '明日も無料で3回生成できますが、今すぐ無制限で使いませんか？'
              : `残り${usage.remaining}回の無料生成があります。`
            }
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button
              onClick={handleUpgrade}
              style={{
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              月額¥980でアップグレード
            </button>
            <button
              onClick={() => setShowUpgradePrompt(false)}
              style={{
                background: 'transparent',
                color: '#6b7280',
                border: 'none',
                padding: '0.5rem',
                cursor: 'pointer'
              }}
            >
              {usage.remaining === 0 ? '明日まで待つ' : '後で決める'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // メインレンダー
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f4ff', padding: '2rem' }}>
      <div style={{ maxWidth: '60rem', margin: '0 auto', position: 'relative' }}>

        {/* 右上設定ボタン - 引き継ぎ書類で期待された配置 */}
        <div style={{ position: 'absolute', top: '0', right: '0', zIndex: 10 }}>
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              background: userPlan === 'premium'
                ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                : 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '3rem',
              height: '3rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
          >
            ⚙️
          </button>
        </div>

        {/* ヘッダー */}
        <div style={{ textAlign: 'center', marginBottom: '2rem', paddingTop: '4rem' }}>
          {userPlan === 'premium' && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '25px',
              fontSize: '0.875rem',
              fontWeight: 'bold',
              marginBottom: '1rem',
              boxShadow: '0 4px 6px rgba(251, 191, 36, 0.3)'
            }}>
              <span style={{ marginRight: '0.5rem' }}>👑</span>
              PREMIUM MEMBER
            </div>
          )}

          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '0.5rem'
          }}>
            AI SNS投稿生成ツール
          </h1>
          <p style={{ fontSize: '1.125rem', color: '#6b7280' }}>
            {userPlan === 'premium' ? 'プレミアムプラン - 無制限AI投稿生成' : 'APIキー設定不要で即座にAI投稿生成'}
          </p>
        </div>

        {/* メインコンテンツ */}
        {!showSettings ? (
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            padding: '2rem'
          }}>
            {/* 投稿生成セクション */}
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1rem' }}>
                投稿内容生成
              </h2>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                  投稿のテーマ・内容:
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="例: 新商品の紹介、イベントの告知、日常の出来事など..."
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '0.75rem',
                    resize: 'vertical',
                    minHeight: '120px',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    fontFamily: 'inherit'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                  投稿のトーン:
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '0.75rem',
                    fontSize: '1rem',
                    outline: 'none',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                >
                  <option value="フレンドリー">フレンドリー</option>
                  <option value="プロフェッショナル">プロフェッショナル</option>
                  <option value="カジュアル">カジュアル</option>
                  <option value="エネルギッシュ">エネルギッシュ</option>
                  <option value="丁寧">丁寧</option>
                </select>
              </div>

              <button
                onClick={generatePost}
                disabled={isLoading || !prompt.trim()}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: isLoading
                    ? '#9ca3af'
                    : userPlan === 'premium'
                      ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                      : 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.75rem',
                  fontSize: '1.125rem',
                  fontWeight: 'bold',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {isLoading ? (
                  <>
                    <div style={{
                      width: '1rem',
                      height: '1rem',
                      border: '2px solid transparent',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    生成中...
                  </>
                ) : (
                  <>
                    ✨ AI投稿生成
                    {userPlan === 'free' && ` (残り ${usage.remaining}/3回)`}
                  </>
                )}
              </button>

              {userPlan === 'free' && usage.remaining <= 1 && (
                <p style={{
                  textAlign: 'center',
                  marginTop: '0.5rem',
                  fontSize: '0.875rem',
                  color: '#ef4444'
                }}>
                  無制限生成にはプレミアムプランをご利用ください
                </p>
              )}
            </div>

            {/* エラー表示 */}
            {error && (
              <div style={{
                background: '#fee2e2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: '1rem',
                borderRadius: '0.5rem',
                marginBottom: '1rem'
              }}>
                {error}
              </div>
            )}

            {/* 成功メッセージ */}
            {postSuccess && (
              <div style={{
                background: '#d1fae5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                padding: '1rem',
                borderRadius: '0.5rem',
                marginBottom: '1rem'
              }}>
                {postSuccess}
              </div>
            )}

            {/* 生成された投稿 */}
            {generatedPost && (
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1rem' }}>
                  生成された投稿
                </h3>
                <div style={{
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.75rem',
                  padding: '1.5rem',
                  marginBottom: '1rem'
                }}>
                  <p style={{
                    fontSize: '1.125rem',
                    lineHeight: '1.6',
                    color: '#1f2937',
                    margin: 0,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {generatedPost}
                  </p>

                  {/* 品質とパフォーマンス情報 */}
                  {(quality !== null || lastGenerationTime) && (
                    <div style={{
                      marginTop: '1rem',
                      paddingTop: '1rem',
                      borderTop: '1px solid #e5e7eb',
                      display: 'flex',
                      gap: '1rem',
                      flexWrap: 'wrap'
                    }}>
                      {quality !== null && (
                        <div style={{
                          background: quality >= 80 ? '#dcfce7' : quality >= 60 ? '#fef3c7' : '#fee2e2',
                          color: quality >= 80 ? '#166534' : quality >= 60 ? '#92400e' : '#991b1b',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '1rem',
                          fontSize: '0.875rem',
                          fontWeight: '600'
                        }}>
                          品質: {quality}点 ({quality >= 80 ? 'A' : quality >= 60 ? 'B' : 'C'}グレード)
                        </div>
                      )}
                      {lastGenerationTime && (
                        <div style={{
                          background: '#e0e7ff',
                          color: '#3730a3',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '1rem',
                          fontSize: '0.875rem',
                          fontWeight: '600'
                        }}>
                          生成時間: {(lastGenerationTime / 1000).toFixed(1)}秒
                        </div>
                      )}
                      {optimizedGeneration && (
                        <div style={{
                          background: '#dcfce7',
                          color: '#166534',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '1rem',
                          fontSize: '0.875rem',
                          fontWeight: '600'
                        }}>
                          最適化済み
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* SNS投稿ボタン（プレミアムのみ） */}
                {userPlan === 'premium' && (
                  <div style={{ marginTop: '1rem' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.75rem' }}>
                      SNS投稿
                    </h4>

                    {/* Twitter接続状況 */}
                    <div style={{ marginBottom: '1rem' }}>
                      {twitterConnected ? (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          background: '#dcfce7',
                          padding: '0.75rem',
                          borderRadius: '0.5rem',
                          marginBottom: '0.5rem'
                        }}>
                          <span style={{ color: '#166534' }}>✅ Twitter接続済み (@{twitterUsername})</span>
                        </div>
                      ) : (
                        <button
                          onClick={connectTwitter}
                          style={{
                            background: '#1da1f2',
                            color: 'white',
                            border: 'none',
                            padding: '0.5rem 1rem',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            marginBottom: '0.5rem',
                            marginRight: '0.5rem'
                          }}
                        >
                          🐦 Twitterを接続
                        </button>
                      )}
                    </div>

                    {/* Threads接続状況 */}
                    <div style={{ marginBottom: '1rem' }}>
                      {threadsConnected ? (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          background: '#dcfce7',
                          padding: '0.75rem',
                          borderRadius: '0.5rem',
                          marginBottom: '0.5rem'
                        }}>
                          <span style={{ color: '#166534' }}>✅ Threads接続済み (@{threadsUsername})</span>
                        </div>
                      ) : (
                        <button
                          onClick={connectThreads}
                          style={{
                            background: '#000000',
                            color: 'white',
                            border: 'none',
                            padding: '0.5rem 1rem',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            marginBottom: '0.5rem',
                            marginRight: '0.5rem'
                          }}
                        >
                          🧵 Threadsを接続
                        </button>
                      )}
                    </div>

                    {/* 投稿ボタン */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {twitterConnected && (
                        <button
                          onClick={postToTwitter}
                          disabled={isPosting}
                          style={{
                            background: '#1da1f2',
                            color: 'white',
                            border: 'none',
                            padding: '0.5rem 1rem',
                            borderRadius: '0.5rem',
                            cursor: isPosting ? 'not-allowed' : 'pointer',
                            opacity: isPosting ? 0.6 : 1
                          }}
                        >
                          🐦 Twitterに投稿
                        </button>
                      )}

                      {threadsConnected && (
                        <button
                          onClick={postToThreads}
                          disabled={isPosting}
                          style={{
                            background: '#000000',
                            color: 'white',
                            border: 'none',
                            padding: '0.5rem 1rem',
                            borderRadius: '0.5rem',
                            cursor: isPosting ? 'not-allowed' : 'pointer',
                            opacity: isPosting ? 0.6 : 1
                          }}
                        >
                          🧵 Threadsに投稿
                        </button>
                      )}

                      {twitterConnected && threadsConnected && (
                        <button
                          onClick={postToAllPlatforms}
                          disabled={isPosting}
                          style={{
                            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                            color: 'white',
                            border: 'none',
                            padding: '0.5rem 1rem',
                            borderRadius: '0.5rem',
                            cursor: isPosting ? 'not-allowed' : 'pointer',
                            opacity: isPosting ? 0.6 : 1
                          }}
                        >
                          🔄 同時投稿
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* プレミアム統計情報 */}
            {userPlan === 'premium' && stats.totalGenerated > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                color: 'white',
                padding: '1.5rem',
                borderRadius: '0.75rem',
                marginTop: '2rem'
              }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: 'bold' }}>
                  📊 あなたの統計
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.totalGenerated}</div>
                    <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>総投稿生成数</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.averageQuality}</div>
                    <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>平均品質スコア</div>
                  </div>
                  {lastGenerationTime && (
                    <div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                        {(lastGenerationTime / 1000).toFixed(1)}s
                      </div>
                      <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>最新生成時間</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden'
          }}>
            {/* 設定ヘッダー */}
            <div style={{
              background: userPlan === 'premium'
                ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                : 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              padding: '1.5rem 2rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>設定</h2>
              <button
                onClick={() => setShowSettings(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '2.5rem',
                  height: '2.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            {/* サブスクリプション管理コンテンツ */}
            <SubscriptionManagerComponent />

            <div style={{ padding: '1rem 2rem 2rem' }}>
              <button
                onClick={() => setShowSettings(false)}
                style={{
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                メインに戻る
              </button>
            </div>
          </div>
        )}
      </div>

      {/* モーダル */}
      <UpgradePrompt />
      <CancelModal />

      {/* アニメーション */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default PostGenerator;