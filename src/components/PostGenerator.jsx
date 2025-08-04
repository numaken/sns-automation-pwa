// PostGenerator.jsx - Phase 2完全版（プレミアムデザイン統合）
import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import SnsPostButtons from './SnsPostButtons';
import UpgradePrompt from './UpgradePrompt';
import { useUserPlan } from '../hooks/useUserPlan';
import './PostGenerator.css';
import './SnsPostButtons.css';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_51RdRz8QK8lTckdl0Q8ZGxhCzBq3Hcy65ONNMJR8aFG9bN2bVnhW0EwB6nJ2ELyxJhG8oPm0e4cKOQGfcgNJdDYb800O7WG5dSI');

const PostGenerator = () => {
  const { userPlan: hookUserPlan, isLoading: hookLoading } = useUserPlan();

  // State管理
  const [userPlan, setUserPlan] = useState('free');
  const [email, setEmail] = useState(localStorage.getItem('userEmail') || '');
  const [subscriptionId, setSubscriptionId] = useState(localStorage.getItem('subscriptionId') || '');
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState('カジュアル');
  const [generatedPost, setGeneratedPost] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [usage, setUsage] = useState({ remaining: 3 });
  const [quality, setQuality] = useState(null);
  const [qualityGrade, setQualityGrade] = useState(null);
  const [qualityFeedback, setQualityFeedback] = useState('');
  const [generationCount, setGenerationCount] = useState(0);
  const [generationTime, setGenerationTime] = useState(0);

  const isPremium = userPlan === 'premium';

  const API_ENDPOINT = process.env.NODE_ENV === 'production'
    ? 'https://sns-automation-pwa.vercel.app'
    : '';

  // 初期化とプラン同期
  useEffect(() => {
    const checkUpgradeStatus = () => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('upgrade') === 'success') {
        setUserPlan('premium');
        localStorage.setItem('plan', 'premium');
        setUsage({ remaining: 'unlimited' });
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    const storedPlan = localStorage.getItem('plan') || 'free';
    const storedEmail = localStorage.getItem('userEmail') || '';
    const storedSubId = localStorage.getItem('subscriptionId') || '';

    console.log('Restored plan from localStorage:', storedPlan);
    console.log('User email:', storedEmail);
    console.log('Subscription ID:', storedSubId);

    setUserPlan(storedPlan);
    setEmail(storedEmail);
    setSubscriptionId(storedSubId);

    checkUpgradeStatus();
  }, []);

  useEffect(() => {
    if (!hookLoading && hookUserPlan && hookUserPlan !== userPlan) {
      console.log('Syncing with useUserPlan hook:', hookUserPlan);
      setUserPlan(hookUserPlan);
      localStorage.setItem('plan', hookUserPlan);
    }
  }, [hookUserPlan, hookLoading, userPlan]);

  // プレミアム用生成関数（高速化）
  const generatePost = async () => {
    if (!prompt.trim()) {
      setError('投稿のテーマを入力してください');
      return;
    }

    setIsGenerating(true);
    setError('');
    setGeneratedPost('');
    setQuality(null);
    setQualityGrade(null);
    setQualityFeedback('');

    try {
      const response = await fetch(`${API_ENDPOINT}/api/generate-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          tone,
          platform: 'Twitter',
          userType: 'premium',
          priority: 'high'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '投稿生成に失敗しました');
      }

      setGeneratedPost(data.post);
      setQuality(data.quality);
      setQualityGrade(data.qualityGrade);
      setQualityFeedback(data.qualityFeedback);
      setGenerationTime(data.generation_time);
      setGenerationCount(prev => prev + 1);

      // プレミアム統計表示
      if (data.stats) {
        console.log('Premium stats:', data.stats);
      }

    } catch (error) {
      console.error('Premium generate error:', error);
      setError('生成に失敗しました。プレミアムサポートにお問い合わせください。');
    } finally {
      setIsGenerating(false);
    }
  };

  // 無料版生成関数
  const generatePostWithSharedAPI = async () => {
    if (!prompt.trim()) {
      setError('投稿のテーマを入力してください');
      return;
    }

    setIsGenerating(true);
    setError('');
    setGeneratedPost('');
    setQuality(null);
    setQualityGrade(null);
    setQualityFeedback('');

    try {
      const response = await fetch(`${API_ENDPOINT}/api/generate-post-shared`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          tone,
          platform: 'Twitter',
          userType: 'free'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setError('1日の無料生成回数（3回）を超えました。プレミアムプランで無制限生成！');
          setUsage({ remaining: 0 });
          setShowUpgradePrompt(true);
        } else if (response.status === 503) {
          setError('システム負荷により一時的に利用できません。しばらく後にお試しください。');
        } else {
          throw new Error(data.error || '投稿生成に失敗しました');
        }
        return;
      }

      setGeneratedPost(data.post);
      setQuality(data.quality);
      setQualityGrade(data.qualityGrade);
      setQualityFeedback(data.qualityFeedback);

      if (data.usage) {
        setUsage(data.usage);

        if (data.usage.remaining <= 1) {
          setShowUpgradePrompt(true);
        }
      }

    } catch (error) {
      console.error('Generate post error:', error);
      setError('ネットワークエラーが発生しました。しばらく待ってから再試行してください。');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateClick = () => {
    if (isPremium) {
      generatePost(); // プレミアム：無制限・高速
    } else {
      generatePostWithSharedAPI(); // 無料：制限あり
    }
  };

  // アップグレードボタンコンポーネント
  const UpgradeButton = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [upgradeError, setUpgradeError] = useState('');

    const handleUpgrade = async () => {
      const userEmail = email || prompt('メールアドレスを入力してください:');
      if (!userEmail) return;

      setIsLoading(true);
      setUpgradeError('');

      try {
        const response = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: userEmail,
            successUrl: `${window.location.origin}?upgrade=success`,
            cancelUrl: `${window.location.origin}?upgrade=cancel`,
          }),
        });

        const { sessionId } = await response.json();
        const stripe = await stripePromise;
        const { error } = await stripe.redirectToCheckout({ sessionId });

        if (error) {
          throw new Error(error.message);
        }
      } catch (error) {
        console.error('Upgrade error:', error);
        setUpgradeError('アップグレードに失敗しました: ' + error.message);
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="upgrade-section">
        <h3>🚀 プレミアムプランでできること</h3>
        <ul>
          <li>✅ 無制限の投稿生成</li>
          <li>✅ ⚡ 高速生成（8秒以内）</li>
          <li>✅ 直接SNS投稿機能</li>
          <li>✅ Twitter・Threads同時投稿</li>
          <li>✅ より高品質なAI生成</li>
          <li>✅ 広告なしのクリーンUI</li>
          <li>✅ 詳細統計・分析機能</li>
        </ul>

        <div style={{ textAlign: 'center' }}>
          <div className="email-badge">
            {email || 'numaken@gmail.com'}
          </div>

          <button
            onClick={handleUpgrade}
            disabled={isLoading}
            className="upgrade-btn"
          >
            {isLoading ? '処理中...' : '月額¥980で今すぐ決済 →'}
          </button>

          <p className="payment-info">
            🔒 Stripe決済で安全・安心<br />
            カード情報は当サイトに保存されません
          </p>

          {upgradeError && (
            <div className="error-message">
              {upgradeError}
            </div>
          )}
        </div>
      </div>
    );
  };

  // プレミアム用のコンテナクラス
  const containerClass = isPremium
    ? "post-generator premium-container"
    : "post-generator";

  return (
    <div className={containerClass}>
      {/* プレミアムヘッダー */}
      {isPremium && (
        <div className="premium-header">
          <div className="flex justify-between items-center">
            <div>
              <div className="premium-badge">
                <span className="premium-crown">👑</span>
                Premium Member
              </div>
              <h2 className="text-xl font-bold mt-2">無制限AI投稿生成</h2>
            </div>
            <div className="unlimited-badge">
              無制限
            </div>
          </div>
          {generationCount > 0 && (
            <div className="premium-stats">
              <div className="premium-stat-item">
                <span>今日の生成数</span>
                <span className="premium-stat-value">{generationCount}回</span>
              </div>
              {generationTime > 0 && (
                <div className="premium-stat-item">
                  <span>平均生成時間</span>
                  <span className="premium-stat-value">{(generationTime / 1000).toFixed(1)}秒</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 通常ヘッダー */}
      {!isPremium && (
        <div className="header-section">
          <h1 className="header-title">🚀 SNS自動化</h1>
          <p className="header-subtitle">設定不要でAI投稿生成</p>

          <div className={`plan-badge ${userPlan}`}>
            <span className="plan-icon">
              {isPremium ? '👑' : '📱'}
            </span>
            <span className={`plan-text ${userPlan}`}>
              {isPremium ? 'プレミアムプラン - 無制限' : '無料プラン'}
            </span>
          </div>
        </div>
      )}

      {/* 使用量表示（無料プランのみ） */}
      {!isPremium && (
        <div className="usage-container">
          <div className="usage-text">
            本日の残り生成回数: <strong>{usage.remaining}/3回</strong>
          </div>
        </div>
      )}

      {/* メイン生成フォーム */}
      <div className="form-card">
        <div className="form-group">
          <label className="form-label">💭 投稿のテーマ</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="投稿したい内容やテーマを入力してください..."
            className={`form-textarea ${isPremium ? 'premium-input' : ''}`}
            rows={4}
          />
        </div>

        <div className="form-group">
          <label className="form-label">🎭 トーン</label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className={`form-select ${isPremium ? 'premium-select' : ''}`}
          >
            <option value="カジュアル">😊 カジュアル</option>
            <option value="フォーマル">🎩 フォーマル</option>
            <option value="フレンドリー">🤝 フレンドリー</option>
            <option value="プロフェッショナル">💼 プロフェッショナル</option>
          </select>
        </div>

        <div className="relative">
          <button
            onClick={handleGenerateClick}
            disabled={isGenerating || !prompt.trim() || (!isPremium && usage.remaining === 0)}
            className={`generate-button ${userPlan} ${isPremium ? 'premium-generate-btn' : ''}`}
          >
            {isGenerating ?
              (isPremium ? '⚡ 高速生成中...' : '🤖 AI生成中...') :
              (!isPremium && usage.remaining === 0) ?
                '⏰ 本日の無料生成完了（明日リセット）' :
                (isPremium ? '⚡ 高速AI生成' : '✨ AI投稿を生成')
            }
          </button>

          {isPremium && (
            <div className="fast-generation-indicator">
              高速処理
            </div>
          )}
        </div>

        {!isPremium && usage.remaining === 0 && (
          <div className="limit-card">
            <div className="limit-text">
              📅 無料プランは1日3回まで生成可能です<br />
              明日の朝にリセットされます
            </div>
          </div>
        )}
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="error-card">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* 生成結果表示 */}
      {generatedPost && (
        <div className={`success-card ${isPremium ? 'premium-result' : ''}`}>
          <h3 className="success-header">
            <span>✨</span>
            生成された投稿
          </h3>
          <div className="success-content">{generatedPost}</div>

          {quality && (
            <div className={isPremium ? 'premium-quality-score' : 'quality-badge'}>
              <span>📊</span>
              品質スコア: {quality}/100 ({qualityGrade}グレード)
            </div>
          )}

          {qualityFeedback && (
            <div className="quality-feedback">
              {qualityFeedback}
            </div>
          )}

          <button
            onClick={() => navigator.clipboard.writeText(generatedPost)}
            className="copy-button"
          >
            <span>📋</span>
            クリップボードにコピー
          </button>

          <SnsPostButtons
            generatedPost={generatedPost}
            userPlan={userPlan}
          />
        </div>
      )}

      {/* 使い方ガイド */}
      <div className="guide-card">
        <h3 className="guide-header">
          <span>💡</span>
          使い方ガイド
        </h3>
        <ul className="guide-list">
          {[
            '投稿したいテーマを具体的に入力',
            'お好みのトーンを選択',
            isPremium ? '⚡ 高速AI生成ボタンをクリック' : 'AI生成ボタンをクリック',
            '生成されたテキストをコピーしてSNSに投稿'
          ].map((text, index) => (
            <li key={index} className="guide-item">
              <div className="guide-number">{index + 1}</div>
              <div className="guide-text">{text}</div>
            </li>
          ))}
        </ul>
      </div>

      {/* 広告削除機能: プレミアムユーザーには広告を表示しない */}
      {!isPremium && (
        <div className="ad-section">
          <div className="ad-content">
            <p className="ad-label">広告</p>
            <div className="ad-banner">
              <p>プレミアムプランで広告なしの快適な体験を！</p>
              <button
                onClick={() => setShowUpgradePrompt(true)}
                className="ad-upgrade-btn"
              >
                詳しく見る →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* アップグレードセクション（無料プランのみ） */}
      {!isPremium && <UpgradeButton />}

      {/* プレミアム統計表示 */}
      {isPremium && generationCount > 0 && (
        <div className="premium-unlimited-display">
          <p className="text-sm opacity-90">今月の利用状況</p>
          <p className="text-lg font-bold">
            {generationCount}回生成完了 | 無制限利用中
          </p>
        </div>
      )}

      {/* アップグレードプロンプト */}
      <UpgradePrompt
        isVisible={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        onUpgrade={() => {
          setShowUpgradePrompt(false);
          document.querySelector('.upgrade-btn')?.click();
        }}
        remainingUses={usage.remaining}
      />
    </div>
  );
};
 
export default PostGenerator;