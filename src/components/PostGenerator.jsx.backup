import React, { useState, useEffect } from 'react';
import SnsPostButtons from './SnsPostButtons';
import UpgradePrompt from './UpgradePrompt';
import './PostGenerator.css';
import './SnsPostButtons.css';

import { loadStripe } from '@stripe/stripe-js';

// Stripe公開キーでストライプを初期化（環境変数から読み込み）
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_51RdRz8QK8lTckdl0Q8ZGxhCzBq3Hcy65ONNMJR8aFG9bN2bVnhW0EwB6nJ2ELyxJhG8oPm0e4cKOQGfcgNJdDYb800O7WG5dSI');

// PostGenerator.jsx の UpgradeButton コンポーネント修正版
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
        body: JSON.stringify({ email: userEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Checkout session作成に失敗しました');
      }

      // 2. Stripeオブジェクト取得
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripeの初期化に失敗しました');
      }

      // 3. メールアドレスを保存（決済完了後に使用）
      localStorage.setItem('userEmail', userEmail);
      localStorage.setItem('pendingCheckoutSession', data.sessionId);

      console.log('🚀 Redirecting to Stripe Checkout:', {
        sessionId: data.sessionId,
        email: userEmail
      });

      // 4. Stripe Checkoutページにリダイレクト
      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      // ここに到達することは通常ない（リダイレクトするため）

    } catch (error) {
      console.error('🔥 Checkout error:', error);
      setError(error.message || '決済処理中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="upgrade-section">
      <div className="email-input mb-3">
        <input
          type="email"
          placeholder="メールアドレスを入力"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 border rounded-lg"
          disabled={isLoading}
        />
      </div>

      {error && (
        <div className="error-message text-red-600 mb-3 p-2 bg-red-50 rounded">
          ⚠️ {error}
        </div>
      )}

      <button
        onClick={handleUpgrade}
        disabled={isLoading || !email.trim()}
        className="upgrade-button w-full py-3 px-6 bg-orange-500 text-white font-medium rounded-lg 
                   hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors
                   flex items-center justify-center space-x-2"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            <span>決済ページに移動中...</span>
          </>
        ) : (
          <>
            <span>🔒</span>
            <span>月額¥980で安全に決済 →</span>
          </>
        )}
      </button>

      {/* 安全性の説明 */}
      <div className="text-xs text-gray-600 mt-2 text-center">
        <p>🔒 Stripe決済で安全・安心</p>
        <p>カード情報は当サイトに保存されません</p>
      </div>
    </div>
  );
};

const PostGenerator = ({ userPlan: initialUserPlan = 'free' }) => {
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState('casual');
  const [generatedPost, setGeneratedPost] = useState('');
  const [quality, setQuality] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [usage, setUsage] = useState({ remaining: 3 });
  const [postResults, setPostResults] = useState({}); // SNS投稿結果管理
  const [userPlan, setUserPlan] = useState(initialUserPlan);
  const [userEmail, setUserEmail] = useState(localStorage.getItem('userEmail'));
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false); // 追加

  // API endpoint (Vercel deployment URL)
  const API_ENDPOINT = process.env.REACT_APP_API_URL || window.location.origin;

  // 🔧 修正: 初期化時にプラン状態を確認する処理も追加
  useEffect(() => {
    // ページロード時にローカルストレージからプラン状態を復元
    const savedPlan = localStorage.getItem('userPlan') || 'free';
    const savedEmail = localStorage.getItem('userEmail');
    const savedSubscriptionId = localStorage.getItem('subscriptionId');

    console.log('Restored plan from localStorage:', savedPlan);
    console.log('User email:', savedEmail);
    console.log('Subscription ID:', savedSubscriptionId);

    setUserPlan(savedPlan);
    if (savedEmail) {
      setUserEmail(savedEmail);
    }

    // プレミアムプランの場合は無制限に設定
    if (savedPlan === 'premium') {
      setUsage({ remaining: 999 });
    }
  }, []);

  // 開発者APIキー使用版の投稿生成関数
  const generatePostWithSharedAPI = async () => {
    if (!prompt.trim()) {
      setError('投稿のテーマを入力してください');
      return;
    }

    setIsLoading(true);
    setError('');
    setGeneratedPost('');
    setQuality(null);
    setPostResults({}); // 投稿結果をリセット

    try {
      // 開発者APIキー使用版を呼び出し
      const response = await fetch(`${API_ENDPOINT}/api/generate-post-shared`, {
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

      // 使用量表示の更新
      if (userPlan === 'free' && data.usage.remaining <= 1) {
        setShowUpgradePrompt(true);
      }

    } catch (error) {
      console.error('Generate post error:', error);
      setError('ネットワークエラーが発生しました。しばらく待ってから再試行してください。');
    } finally {
      setIsLoading(false);
    }
  };

  // 生成ボタンのクリックハンドラー修正
  const handleGenerateClick = () => {
    if (userPlan === 'free') {
      // 無料プランは開発者APIキー使用
      generatePostWithSharedAPI();
    } else {
      // プレミアムプランは既存の個人APIキー使用
      generatePost();
    }
  };

  const fetchUsageStatus = async () => {
    if (userPlan !== 'free') return;

    try {
      const response = await fetch(`${API_ENDPOINT}/api/usage-status`);
      if (response.ok) {
        const data = await response.json();
        setUsage({ remaining: data.remaining });
      }
    } catch (error) {
      console.error('Usage status fetch error:', error);
    }
  };

  const checkUserPlan = async () => {
    if (!userEmail) return;

    try {
      const response = await fetch(`${API_ENDPOINT}/api/check-subscription?email=${userEmail}`);
      if (response.ok) {
        const data = await response.json();
        setUserPlan(data.plan);
        console.log('User plan checked:', data.plan);
      }
    } catch (error) {
      console.error('Plan check error:', error);
    }
  };

  const handleUpgradeSuccess = (newPlan) => {
    setUserPlan(newPlan);
    // 使用量リセット
    setUsage({ remaining: 999 });
    // エラークリア
    setError('');
    // アップグレードプロンプトを閉じる
    setShowUpgradePrompt(false);
  };

  const generatePost = async () => {
    if (!prompt.trim()) {
      setError('投稿のテーマを入力してください');
      return;
    }

    setIsLoading(true);
    setError('');
    setGeneratedPost('');
    setQuality(null);
    setPostResults({}); // 投稿結果をリセット

    try {
      const response = await fetch(`${API_ENDPOINT}/api/generate-post`, {
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
          setError(data.message || 'レート制限に達しました');
          setUsage({ remaining: 0 });
        } else {
          setError(data.message || '投稿生成に失敗しました');
        }
        return;
      }

      setGeneratedPost(data.post);
      setQuality(data.quality);

      if (data.usage) {
        setUsage(data.usage);
      }

    } catch (error) {
      console.error('Generate post error:', error);
      setError('ネットワークエラーが発生しました。しばらく待ってから再試行してください。');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedPost);
      // 簡易フィードバック表示
      const button = document.querySelector('.copy-button');
      if (button) {
        const original = button.textContent;
        button.textContent = 'コピー完了！';
        setTimeout(() => {
          button.textContent = original;
        }, 2000);
      }
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  // SNS投稿結果のハンドリング
  const handlePostResult = (platform, result) => {
    setPostResults(prev => ({
      ...prev,
      [platform]: result
    }));
  };

  const getQualityColor = (grade) => {
    const colors = {
      'A': '#4CAF50',
      'B': '#2196F3',
      'C': '#FF9800',
      'D': '#F44336'
    };
    return colors[grade] || '#757575';
  };

  const canGenerate = userPlan === 'premium' || usage.remaining > 0;

  return (
    <div className="post-generator">
      <div className="generator-header">
        <h2>✨ AI投稿生成</h2>
        {userPlan === 'free' && (
          <div className="usage-display">
            <span className={`usage-count ${usage.remaining === 0 ? 'depleted' : ''}`}>
              残り {usage.remaining}/3回
            </span>
          </div>
        )}
        {userPlan === 'premium' && (
          <div className="usage-display">
            <span className="premium-badge">プレミアムプラン - 無制限</span>
          </div>
        )}
      </div>

      <div className="input-section">
        <div className="input-group">
          <label htmlFor="prompt">投稿のテーマ・内容</label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="例: 新しいカフェを見つけた感想、読書の習慣について、週末の過ごし方..."
            rows="3"
            disabled={isLoading}
          />
        </div>

        <div className="options-grid">
          <div className="input-group">
            <label htmlFor="tone">トーン</label>
            <select
              id="tone"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              disabled={isLoading}
            >
              <option value="casual">カジュアル</option>
              <option value="professional">プロフェッショナル</option>
              <option value="friendly">フレンドリー</option>
              <option value="enthusiastic">熱意的</option>
              <option value="thoughtful">思慮深い</option>
            </select>
          </div>
        </div>

        <button
          className={`generate-button ${!canGenerate ? 'disabled' : ''}`}
          onClick={handleGenerateClick}
          disabled={isLoading || !canGenerate}
        >
          {isLoading ? (
            <>
              <span className="loading-spinner"></span>
              生成中...
            </>
          ) : canGenerate ? (
            '🚀 投稿を生成'
          ) : (
            '本日の無料生成を使い切りました'
          )}
        </button>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {generatedPost && (
        <div className="result-section">
          <div className="result-header">
            <h3>生成された投稿</h3>
            {quality && (
              <div className="quality-badge" style={{ backgroundColor: getQualityColor(quality.grade) }}>
                <span className="quality-grade">{quality.grade}</span>
                <span className="quality-score">{quality.score}/100</span>
              </div>
            )}
          </div>

          <div className="generated-post">
            {generatedPost}
          </div>

          {quality && (
            <div className="quality-feedback">
              <strong>品質評価:</strong> {quality.feedback}
            </div>
          )}

          <div className="action-buttons">
            <button
              className="copy-button secondary-button"
              onClick={copyToClipboard}
            >
              📋 コピー
            </button>
          </div>

          {/* SNS投稿機能統合 */}
          <SnsPostButtons
            generatedPost={generatedPost}
            userPlan={userPlan}
            onPostResult={handlePostResult}
            className="integrated-sns-buttons"
          />
        </div>
      )}

      {userPlan === 'free' && (
        <div className="upgrade-promotion">
          <div className="promo-content">
            <h4>🎯 プレミアムプランでできること</h4>
            <ul>
              <li>✅ 無制限の投稿生成</li>
              <li>✅ 直接SNS投稿機能</li>
              <li>✅ Twitter・Threads同時投稿</li>
              <li>✅ より高品質なAI生成</li>
              <li>✅ 広告なしのクリーンUI</li>
            </ul>

            <UpgradeButton
              onUpgradeSuccess={handleUpgradeSuccess}
              setUserPlan={setUserPlan}
              setUsage={setUsage}
            />
          </div>
        </div>
      )}

      {/* アップグレードプロンプト */}
      <UpgradePrompt
        isVisible={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        onUpgrade={() => {
          setShowUpgradePrompt(false);
          // 既存のUpgradeButtonと同じ処理を実行
          const upgradeButton = document.querySelector('.upgrade-button');
          if (upgradeButton) {
            upgradeButton.click();
          }
        }}
        remainingUses={usage.remaining}
      />
    </div>
  );
};

export default PostGenerator;