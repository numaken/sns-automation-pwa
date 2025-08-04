import React, { useState, useEffect } from 'react';
import SnsPostButtons from './SnsPostButtons';
import UpgradePrompt from './UpgradePrompt';
import { useUserPlan } from '../hooks/useUserPlan';
import './PostGenerator.css';
import './SnsPostButtons.css';

import { loadStripe } from '@stripe/stripe-js';

// Stripe公開キーでストライプを初期化
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_51RdRz8QK8lTckdl0Q8ZGxhCzBq3Hcy65ONNMJR8aFG9bN2bVnhW0EwB6nJ2ELyxJhG8oPm0e4cKOQGfcgNJdDYb800O7WG5dSI');

const PostGenerator = () => {
  // 新しいuseUserPlanフックと既存システムの統合
  const { userPlan: hookUserPlan, isLoading: hookLoading } = useUserPlan();
  
  // 既存のlocalStorage管理を維持
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

  // プラン管理の統合
  useEffect(() => {
    const storedPlan = localStorage.getItem('plan') || 'free';
    const storedEmail = localStorage.getItem('userEmail') || '';
    const storedSubId = localStorage.getItem('subscriptionId') || '';
    
    console.log('Restored plan from localStorage:', storedPlan);
    console.log('User email:', storedEmail);
    console.log('Subscription ID:', storedSubId);
    
    setUserPlan(storedPlan);
    setEmail(storedEmail);
    setSubscriptionId(storedSubId);
  }, []);

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

  // 生成ボタンのハンドラー
  const handleGenerateClick = () => {
    if (userPlan === 'premium') {
      generatePost(); // プレミアムは個人APIキー
    } else {
      generatePostWithSharedAPI(); // 無料は共有APIキー
    }
  };

  // 既存のUpgradeButton機能は維持...
  // (元のコードの UpgradeButton 部分をここに追加)

  return (
    <div className="post-generator">
      {/* プラン表示 */}
      <div className="plan-display">
        <span className="plan-icon">
          {userPlan === 'premium' ? '👑' : '📱'}
        </span>
        <span className="plan-text">
          {userPlan === 'premium' ? 'プレミアムプラン - 無制限' : '無料プラン'}
        </span>
      </div>

      {/* 使用量表示（無料プランのみ） */}
      {userPlan === 'free' && (
        <div className="usage-display">
          残り {usage.remaining}/3回
        </div>
      )}

      {/* 生成フォーム */}
      <div className="generation-form">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="投稿のテーマを入力..."
        />
        
        <select value={tone} onChange={(e) => setTone(e.target.value)}>
          <option value="カジュアル">カジュアル</option>
          <option value="フォーマル">フォーマル</option>
          <option value="フレンドリー">フレンドリー</option>
          <option value="プロフェッショナル">プロフェッショナル</option>
        </select>

        <button
          onClick={handleGenerateClick}
          disabled={isGenerating || !prompt.trim() || (userPlan === 'free' && usage.remaining === 0)}
        >
          {isGenerating ? '生成中...' : 
           (userPlan === 'free' && usage.remaining === 0) ? '本日の無料生成完了' : 
           '🔥 投稿を生成'}
        </button>
      </div>

      {/* エラー表示 */}
      {error && <div className="error">{error}</div>}

      {/* 生成結果 */}
      {generatedPost && (
        <div className="generated-post">
          <h3>生成された投稿</h3>
          <p>{generatedPost}</p>
          {quality && <div>品質スコア: {quality}/100</div>}
        </div>
      )}

      {/* UpgradePrompt */}
      <UpgradePrompt
        isVisible={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        onUpgrade={() => window.location.href = '/upgrade'}
        remainingUses={usage.remaining}
      />
    </div>
  );
};

export default PostGenerator;
