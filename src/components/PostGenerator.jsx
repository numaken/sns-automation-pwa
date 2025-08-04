import React, { useState, useEffect } from 'react';
import SnsPostButtons from './SnsPostButtons';
import UpgradePrompt from './UpgradePrompt';
import { useUserPlan } from '../hooks/useUserPlan';
import './PostGenerator.css';
import './SnsPostButtons.css';

import { loadStripe } from '@stripe/stripe-js';

// Stripe公開キーでストライプを初期化
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_51RdRz8QK8lTckdl0Q8ZGxhCzBq3Hcy65ONNMJR8aFG9bN2bVnhW0EwB6nJ2ELyxJhG8oPm0e4cKOQGfcgNJdDYb800O7WG5dSI');

// UpgradeButton コンポーネント（既存機能維持）
const UpgradeButton = ({ onUpgradeSuccess, setUserPlan, setUsage }) => {
  const [email, setEmail] = useState(localStorage.getItem('userEmail') || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpgrade = async () => {
    const userEmail = email || prompt('メールアドレスを入力してください:');
    if (!userEmail) return;

    setIsLoading(true);
    setError('');

    try {
      // 1. Checkout Session作成
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

      // 2. Stripeチェックアウトページにリダイレクト
      const stripe = await stripePromise;
      const { error } = await stripe.redirectToCheckout({ sessionId });

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      setError('アップグレードに失敗しました: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="upgrade-section">
      <div className="premium-features">
        <h3>🚀 プレミアムプランでできること</h3>
        <ul>
          <li>✅ 無制限の投稿生成</li>
          <li>✅ 直接SNS投稿機能</li>
          <li>✅ Twitter・Threads同時投稿</li>
          <li>✅ より高品質なAI生成</li>
          <li>✅ 広告なしのクリーンUI</li>
        </ul>
        
        <div className="upgrade-form">
          <div className="email-section">
            <span className="email-badge">{email || 'numaken@gmail.com'}</span>
          </div>
          
          <button 
            onClick={handleUpgrade}
            disabled={isLoading}
            className="upgrade-btn"
          >
            {isLoading ? '処理中...' : '月額¥980で今すぐ決済 →'}
          </button>
          
          <p className="payment-info">
            🔒 Stripe決済で安全・安心<br/>
            カード情報は当サイトに保存されません
          </p>
          
          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
    </div>
  );
};

// メインのPostGeneratorコンポーネント
const PostGenerator = () => {
  // 新しいuseUserPlanフックと既存システムの統合
  const { userPlan: hookUserPlan, isLoading: hookLoading } = useUserPlan();
  
  // 状態管理（既存 + 新機能）
  const [userPlan, setUserPlan] = useState('free');
  const [email, setEmail] = useState(localStorage.getItem('userEmail') || '');
  const [subscriptionId, setSubscriptionId] = useState(localStorage.getItem('subscriptionId') || '');
  
  // 新機能の状態
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState('カジュアル');
  const [generatedPost, setGeneratedPost] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [usage, setUsage] = useState({ remaining: 3 });
  const [quality, setQuality] = useState(null);

  const API_ENDPOINT = process.env.NODE_ENV === 'production'
    ? 'https://sns-automation-pwa.vercel.app'
    : '';

  // 初期化（既存機能維持）
  useEffect(() => {
    const checkUpgradeStatus = () => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('upgrade') === 'success') {
        setUserPlan('premium');
        localStorage.setItem('plan', 'premium');
        setUsage({ remaining: 'unlimited' });
        // URL をクリーンアップ
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

  // useUserPlanフックとの同期
  useEffect(() => {
    if (!hookLoading && hookUserPlan && hookUserPlan !== userPlan) {
      console.log('Syncing with useUserPlan hook:', hookUserPlan);
      setUserPlan(hookUserPlan);
      localStorage.setItem('plan', hookUserPlan);
    }
  }, [hookUserPlan, hookLoading, userPlan]);

  // プレミアム生成機能（個人APIキー使用）
  const generatePost = async () => {
    if (!prompt.trim()) {
      setError('投稿のテーマを入力してください');
      return;
    }

    setIsGenerating(true);
    setError('');
    setGeneratedPost('');

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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '投稿生成に失敗しました');
      }

      setGeneratedPost(data.post);
      setQuality(data.quality);

    } catch (error) {
      console.error('Generate post error:', error);
      setError('投稿生成に失敗しました。しばらく待ってから再試行してください。');
    } finally {
      setIsGenerating(false);
    }
  };

  // 無料版生成機能（共有APIキー使用）
  const generatePostWithSharedAPI = async () => {
    if (!prompt.trim()) {
      setError('投稿のテーマを入力してください');
      return;
    }

    setIsGenerating(true);
    setError('');
    setGeneratedPost('');

    try {
      const response = await fetch(`${API_ENDPOINT}/api/generate-post-shared`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          tone,
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

  // 生成ボタンのハンドラー（新機能）
  const handleGenerateClick = () => {
    if (userPlan === 'premium') {
      generatePost(); // プレミアムは個人APIキー
    } else {
      generatePostWithSharedAPI(); // 無料は共有APIキー
    }
  };

  // アップグレード成功ハンドラー
  const handleUpgradeSuccess = () => {
    setUserPlan('premium');
    setUsage({ remaining: 'unlimited' });
    localStorage.setItem('plan', 'premium');
  };

  return (
    <div className="post-generator">
      <div className="header-section">
        <h1>🚀 SNS自動化</h1>
        <p>設定不要でAI投稿生成</p>
        
        {/* プラン表示（統合版） */}
        <div className="plan-badge">
          <span className="plan-icon">
            {userPlan === 'premium' ? '👑' : '📱'}
          </span>
          <span className="plan-text">
            {userPlan === 'premium' ? 'プレミアムプラン - 無制限' : '無料プラン'}
          </span>
        </div>
      </div>

      {/* 使用量表示（無料プランのみ） */}
      {userPlan === 'free' && (
        <div className="usage-container">
          <div className="usage-text">
            本日の残り生成回数: <strong>{usage.remaining}/3回</strong>
          </div>
        </div>
      )}

      {/* 投稿生成フォーム */}
      <div className="form-card">
        <div className="form-group">
          <label>💭 投稿のテーマ</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="投稿したい内容やテーマを入力してください..."
            rows={4}
          />
        </div>

        <div className="form-group">
          <label>🎭 トーン</label>
          <select value={tone} onChange={(e) => setTone(e.target.value)}>
            <option value="カジュアル">😊 カジュアル</option>
            <option value="フォーマル">🎩 フォーマル</option>
            <option value="フレンドリー">🤝 フレンドリー</option>
            <option value="プロフェッショナル">💼 プロフェッショナル</option>
          </select>
        </div>

        <button
          onClick={handleGenerateClick}
          disabled={isGenerating || !prompt.trim() || (userPlan === 'free' && usage.remaining === 0)}
          className="generate-button"
        >
          {isGenerating ? '🤖 AI生成中...' : 
           (userPlan === 'free' && usage.remaining === 0) ? '⏰ 本日の無料生成完了（明日リセット）' : 
           '✨ AI投稿を生成'}
        </button>

        {/* 制限メッセージ */}
        {userPlan === 'free' && usage.remaining === 0 && (
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

      {/* 生成された投稿表示 */}
      {generatedPost && (
        <div className="success-card">
          <h3>✨ 生成された投稿</h3>
          <div className="success-content">{generatedPost}</div>
          
          {quality && (
            <div className="quality-badge">
              <span>📊</span>
              品質スコア: {quality}/100
            </div>
          )}

          <button
            onClick={() => navigator.clipboard.writeText(generatedPost)}
            className="copy-button"
          >
            <span>📋</span>
            クリップボードにコピー
          </button>

          {/* SNS投稿ボタン（既存機能） */}
          <SnsPostButtons 
            generatedPost={generatedPost}
            userPlan={userPlan}
          />
        </div>
      )}

      {/* プレミアムプラン案内（無料プランのみ） */}
      {userPlan === 'free' && (
        <UpgradeButton 
          onUpgradeSuccess={handleUpgradeSuccess}
          setUserPlan={setUserPlan}
          setUsage={setUsage}
        />
      )}

      {/* UpgradePrompt（新機能） */}
      <UpgradePrompt
        isVisible={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        onUpgrade={() => {
          setShowUpgradePrompt(false);
          // 既存のUpgradeButtonの決済フローを使用
          document.querySelector('.upgrade-btn')?.click();
        }}
        remainingUses={usage.remaining}
      />
    </div>
  );
};

export default PostGenerator;
