import React, { useState, useEffect } from 'react';
import SnsPostButtons from './SnsPostButtons';
import './PostGenerator.css';
import './SnsPostButtons.css';

// UpgradeButton コンポーネント（Stripe統合）
const UpgradeButton = ({ onUpgradeSuccess, setUserPlan, setUsage }) => {
  const [email, setEmail] = useState(localStorage.getItem('userEmail') || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpgrade = async () => {
    const email = prompt('メールアドレスを入力してください:');
    if (!email) return;

    setIsLoading(true);
    setError('');

    try {
      // Stripe サブスクリプション作成API呼び出し
      const response = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        // 🔧 修正: API成功後の状態更新処理を追加

        // 1. ローカルストレージにプラン情報を保存
        localStorage.setItem('userPlan', 'premium');
        localStorage.setItem('userEmail', email);
        localStorage.setItem('subscriptionId', data.subscriptionId);
        localStorage.setItem('customerId', data.customerId);

        // 2. React状態を更新
        setUserPlan('premium');

        // 3. 使用回数制限をリセット（プレミアムなので無制限）
        setUsage({ remaining: 999 });

        // 4. 成功メッセージとUIの更新
        alert('プレミアムプランにアップグレードしました！\n無制限で投稿生成とSNS投稿が利用できます。');

        // 5. 成功コールバック実行
        if (onUpgradeSuccess) {
          onUpgradeSuccess('premium');
        }

      } else {
        // エラーハンドリング
        console.error('Subscription creation failed:', data);
        setError('アップグレードに失敗しました。もう一度お試しください。');
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      setError('ネットワークエラーが発生しました。もう一度お試しください。');
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
        />
      </div>

      {error && (
        <div className="error-message text-red-600 mb-3 p-2 bg-red-50 rounded">
          {error}
        </div>
      )}

      <button
        onClick={handleUpgrade}
        disabled={isLoading}
        className="upgrade-button w-full py-3 px-6 bg-orange-500 text-white font-medium rounded-lg 
                   hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? '処理中...' : '月額¥980でアップグレード →'}
      </button>
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
          onClick={generatePost}
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
    </div>
  );
};

export default PostGenerator;