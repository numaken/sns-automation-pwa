import React, { useState, useEffect } from 'react';

const PostGenerator = () => {
  // 基本状態管理（簡素化版）
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

  // 🔧 修正: シンプル化されたプレミアム確認
  const checkPremiumStatus = () => {
    console.log('🔍 Checking premium status...');

    // 主要キーのみをチェック（シンプル化）
    const userPlan = localStorage.getItem('userPlan');
    const subscriptionStatus = localStorage.getItem('subscriptionStatus');

    console.log('📊 Premium check:', { userPlan, subscriptionStatus });

    // 🔧 修正: プレミアム判定の簡素化
    const isPremiumUser = (userPlan === 'premium' && subscriptionStatus === 'active');

    if (isPremiumUser) {
      console.log('✅ Premium status confirmed');
      setUserPlan('premium');
      setUsage({ remaining: 'unlimited' });
      localStorage.removeItem('dailyUsage'); // 無料プランデータクリア
    } else {
      console.log('📋 Free plan confirmed');
      setUserPlan('free');
      // 🔧 修正: 初期値の適切な設定
      setUsage({ remaining: 3, used: 0, limit: 3 });
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
  }, []);

  // 🔧 修正: 手動プレミアム移行の改善
  const manualUpgradeToPremium = () => {
    console.log('🔧 Manual premium upgrade initiated');

    localStorage.setItem('userPlan', 'premium');
    localStorage.setItem('subscriptionStatus', 'active');
    localStorage.setItem('premiumActivatedAt', new Date().toISOString());
    localStorage.removeItem('dailyUsage');

    setUserPlan('premium');
    setUsage({ remaining: 'unlimited' });

    console.log('✅ Manual premium upgrade completed');

    // URL クリーンアップ
    const url = new URL(window.location);
    url.searchParams.delete('session_id');
    window.history.replaceState({}, document.title, url.toString());
  };

  // 🔧 修正: プレミアムアップグレード処理の改善
  const handleUpgrade = async () => {
    try {
      console.log('🚀 Starting upgrade process...');
      setError(''); // エラークリア

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

  // 🔧 修正: AI投稿生成の改善
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
      // 🔧 修正: プレミアムユーザーは別エンドポイント使用
      const endpoint = userPlan === 'premium'
        ? '/api/generate-post'
        : '/api/generate-post-shared';

      const requestBody = {
        prompt: prompt.trim(),
        tone,
        userType: userPlan // 'free' または 'premium'
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
          // 🔧 修正: 使用量の正確な設定
          setUsage({ remaining: 0, used: 3, limit: 3 });
          setShowUpgradePrompt(true);
        } else {
          throw new Error(data.error || '投稿生成に失敗しました');
        }
        return;
      }

      // 🔧 修正: 成功時の処理改善
      setGeneratedPost(data.post);
      setQuality(data.quality);

      // 🔧 修正: 使用量更新の改善
      if (data.usage && userPlan === 'free') {
        console.log('📊 Updating usage:', data.usage);
        setUsage(prevUsage => ({
          remaining: data.usage.remaining || 0,
          used: (prevUsage.limit || 3) - (data.usage.remaining || 0),
          limit: prevUsage.limit || 3
        }));

        // プレミアム転換タイミング
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

  // 🔧 修正: デバッグ機能の条件付き有効化
  useEffect(() => {
    // 開発環境でのみデバッグ機能を有効化
    if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
      window.debugSNSApp = {
        showInfo: () => ({
          userPlan,
          usage,
          localStorage: Object.fromEntries(
            Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])
          )
        }),
        manualUpgrade: manualUpgradeToPremium,
        checkStatus: checkPremiumStatus
      };
      console.log('🔧 Debug functions available: window.debugSNSApp');
    }
  }, [userPlan, usage]);

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
          </div>

          <p style={{ fontSize: '1.25rem', color: '#6b7280' }}>
            {userPlan === 'premium'
              ? '無制限AI投稿生成'
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
          {/* 🔧 修正: 使用状況表示の改善 */}
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

              {/* 🔧 修正: Stripe決済エラー時の対処法表示 */}
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

              {/* コピーボタン */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedPost);
                  const originalText = generatedPost;
                  setGeneratedPost('📋 コピーしました！');
                  setTimeout(() => setGeneratedPost(originalText), 1000);
                }}
                style={{
                  marginTop: '1rem',
                  padding: '0.5rem 1rem',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer'
                }}
              >
                📋 クリップボードにコピー
              </button>
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