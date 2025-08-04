import React, { useState, useEffect } from 'react';
import SnsPostButtons from './SnsPostButtons';
import UpgradePrompt from './UpgradePrompt';
import { useUserPlan } from '../hooks/useUserPlan';
import './PostGenerator.css';
import './SnsPostButtons.css';

import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_51RdRz8QK8lTckdl0Q8ZGxhCzBq3Hcy65ONNMJR8aFG9bN2bVnhW0EwB6nJ2ELyxJhG8oPm0e4cKOQGfcgNJdDYb800O7WG5dSI');

const PostGenerator = () => {
  const { userPlan: hookUserPlan, isLoading: hookLoading } = useUserPlan();
  
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

  const API_ENDPOINT = process.env.NODE_ENV === 'production'
    ? 'https://sns-automation-pwa.vercel.app'
    : '';

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

  const handleGenerateClick = () => {
    if (userPlan === 'premium') {
      generatePost();
    } else {
      generatePostWithSharedAPI();
    }
  };

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
          <li>✅ 直接SNS投稿機能</li>
          <li>✅ Twitter・Threads同時投稿</li>
          <li>✅ より高品質なAI生成</li>
          <li>✅ 広告なしのクリーンUI</li>
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
            🔒 Stripe決済で安全・安心<br/>
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

  return (
    <div className="post-generator">
      <div className="header-section">
        <h1 className="header-title">🚀 SNS自動化</h1>
        <p className="header-subtitle">設定不要でAI投稿生成</p>

        <div className={`plan-badge ${userPlan}`}>
          <span className="plan-icon">
            {userPlan === 'premium' ? '👑' : '📱'}
          </span>
          <span className={`plan-text ${userPlan}`}>
            {userPlan === 'premium' ? 'プレミアムプラン - 無制限' : '無料プラン'}
          </span>
        </div>
      </div>

      {userPlan === 'free' && (
        <div className="usage-container">
          <div className="usage-text">
            本日の残り生成回数: <strong>{usage.remaining}/3回</strong>
          </div>
        </div>
      )}

      <div className="form-card">
        <div className="form-group">
          <label className="form-label">💭 投稿のテーマ</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="投稿したい内容やテーマを入力してください..."
            className="form-textarea"
            rows={4}
          />
        </div>

        <div className="form-group">
          <label className="form-label">🎭 トーン</label>
          <select 
            value={tone} 
            onChange={(e) => setTone(e.target.value)} 
            className="form-select"
          >
            <option value="カジュアル">😊 カジュアル</option>
            <option value="フォーマル">🎩 フォーマル</option>
            <option value="フレンドリー">🤝 フレンドリー</option>
            <option value="プロフェッショナル">💼 プロフェッショナル</option>
          </select>
        </div>

        <button
          onClick={handleGenerateClick}
          disabled={isGenerating || !prompt.trim() || (userPlan === 'free' && usage.remaining === 0)}
          className={`generate-button ${userPlan}`}
        >
          {isGenerating ? '🤖 AI生成中...' : 
           (userPlan === 'free' && usage.remaining === 0) ? '⏰ 本日の無料生成完了（明日リセット）' : 
           '✨ AI投稿を生成'}
        </button>

        {userPlan === 'free' && usage.remaining === 0 && (
          <div className="limit-card">
            <div className="limit-text">
              📅 無料プランは1日3回まで生成可能です<br />
              明日の朝にリセットされます
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="error-card">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {generatedPost && (
        <div className="success-card">
          <h3 className="success-header">
            <span>✨</span>
            生成された投稿
          </h3>
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

          <SnsPostButtons 
            generatedPost={generatedPost}
            userPlan={userPlan}
          />
        </div>
      )}

      <div className="guide-card">
        <h3 className="guide-header">
          <span>💡</span>
          使い方ガイド
        </h3>
        <ul className="guide-list">
          {[
            '投稿したいテーマを具体的に入力',
            'お好みのトーンを選択',
            'AI生成ボタンをクリック',
            '生成されたテキストをコピーしてSNSに投稿'
          ].map((text, index) => (
            <li key={index} className="guide-item">
              <div className="guide-number">{index + 1}</div>
              <div className="guide-text">{text}</div>
            </li>
          ))}
        </ul>
      </div>

      {userPlan === 'free' && <UpgradeButton />}

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
