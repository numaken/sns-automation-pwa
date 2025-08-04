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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [usage, setUsage] = useState({ remaining: 3 });
  const [quality, setQuality] = useState(null);

  // プレミアムプラン情報の統合
  useEffect(() => {
    if (!hookLoading && hookUserPlan) {
      setUserPlan(hookUserPlan);
    }
  }, [hookUserPlan, hookLoading]);

  useEffect(() => {
    if (userPlan === 'free') {
      checkUsage();
    }
  }, [userPlan]);

  const checkUsage = async () => {
    try {
      const response = await fetch('/api/admin/debug-ip', {
        headers: {
          'x-admin-key': 'sns-automation-admin-2024'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const remaining = Math.max(0, 3 - (data.usage || 0));
        setUsage({ remaining });
      }
    } catch (error) {
      console.error('Usage check error:', error);
    }
  };

  const handleUpgrade = async () => {
    setShowUpgradePrompt(false);
    
    try {
      const stripe = await stripePromise;
      
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          subscriptionId: subscriptionId
        }),
      });

      const session = await response.json();
      
      if (session.sessionId) {
        const result = await stripe.redirectToCheckout({
          sessionId: session.sessionId,
        });
        
        if (result.error) {
          console.error('Stripe checkout error:', result.error);
          setError('決済処理でエラーが発生しました');
        }
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      setError('アップグレード処理でエラーが発生しました');
    }
  };

  // プレミアムプラン用の無制限生成（既存のAPIキー使用）
  const generatePostPremium = async () => {
    if (!prompt.trim()) {
      setError('投稿のテーマを入力してください');
      return;
    }

    setIsLoading(true);
    setError('');
    setGeneratedPost('');

    try {
      const response = await fetch('/api/generate-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      setError('投稿の生成に失敗しました。しばらく待ってから再試行してください。');
    } finally {
      setIsLoading(false);
    }
  };

  // 無料プラン用の共有APIキー生成
  const generatePostFree = async () => {
    if (!prompt.trim()) {
      setError('投稿のテーマを入力してください');
      return;
    }

    setIsLoading(true);
    setError('');
    setGeneratedPost('');

    try {
      const response = await fetch('/api/generate-post-shared', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      }

      // 制限間近でアップグレード促進
      if (userPlan === 'free' && data.usage && data.usage.remaining <= 1) {
        setShowUpgradePrompt(true);
      }

    } catch (error) {
      console.error('Generate post error:', error);
      setError('ネットワークエラーが発生しました。しばらく待ってから再試行してください。');
    } finally {
      setIsLoading(false);
    }
  };

  // メイン生成ハンドラー（プラン別処理）
  const generatePost = () => {
    if (userPlan === 'premium') {
      generatePostPremium();
    } else {
      generatePostFree();
    }
  };

  // プラン表示
  const planDisplay = userPlan === 'premium' ? 'プレミアムプラン - 無制限' : '無料プラン';
  const usageDisplay = userPlan === 'premium' ? null : `残り ${usage.remaining}/3回`;

  if (hookLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="post-generator">
      {/* プラン表示エリア */}
      <div className="plan-status">
        <div className="plan-info">
          <span className="plan-name">{planDisplay}</span>
          {usageDisplay && <span className="usage-info">{usageDisplay}</span>}
        </div>
      </div>

      <div className="generator-content">
        <h2>🤖 AI投稿生成</h2>
        <p className="description">
          {userPlan === 'premium' 
            ? 'プレミアムプラン：無制限でAI投稿を生成できます' 
            : 'APIキー設定不要で簡単にAI投稿を生成'
          }
        </p>

        <div className="form-group">
          <label htmlFor="prompt">投稿のテーマ・内容</label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="例: 新商品の魅力的な紹介、イベント告知、日常の気づき等"
            rows={4}
          />
        </div>

        <div className="form-group">
          <label htmlFor="tone">投稿のトーン</label>
          <select 
            id="tone" 
            value={tone} 
            onChange={(e) => setTone(e.target.value)}
          >
            <option value="カジュアル">カジュアル</option>
            <option value="ビジネス">ビジネス</option>
            <option value="フレンドリー">フレンドリー</option>
            <option value="プロフェッショナル">プロフェッショナル</option>
            <option value="エモーショナル">エモーショナル</option>
          </select>
        </div>

        <button 
          className="generate-btn"
          onClick={generatePost}
          disabled={isLoading || !prompt.trim()}
        >
          {isLoading ? '生成中...' : '✨ AI投稿生成'}
        </button>

        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}

        {generatedPost && (
          <div className="generated-content">
            <div className="post-header">
              <h3>生成された投稿</h3>
              {quality && (
                <span className="quality-score">品質スコア: {quality}%</span>
              )}
            </div>
            <div className="post-content">
              <p>{generatedPost}</p>
            </div>
            <div className="post-actions">
              <button 
                onClick={() => navigator.clipboard.writeText(generatedPost)}
                className="copy-btn"
              >
                📋 コピー
              </button>
            </div>
          </div>
        )}

        {generatedPost && (
          <SnsPostButtons 
            generatedPost={generatedPost}
            userPlan={userPlan}
          />
        )}
      </div>

      <UpgradePrompt
        isVisible={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        onUpgrade={handleUpgrade}
        remainingUses={usage.remaining}
      />
    </div>
  );
};

export default PostGenerator;
