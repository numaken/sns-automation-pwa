// src/components/PostGenerator.jsx
// 引き継ぎ書指定: プラン判定API統合版（追加部分のみ）

import React, { useState, useEffect } from 'react';
import UpgradePrompt from './UpgradePrompt';

const PostGenerator = () => {
  // 既存のstate
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState('casual');
  const [generatedPost, setGeneratedPost] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [usage, setUsage] = useState({ remaining: 3 });
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // 新規追加: プラン管理
  const [userPlan, setUserPlan] = useState('free');
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [userId, setUserId] = useState('');

  // ユーザーID生成（簡易版）
  useEffect(() => {
    const storedUserId = localStorage.getItem('sns_automation_user_id');
    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      const newUserId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('sns_automation_user_id', newUserId);
      setUserId(newUserId);
    }
  }, []);

  // プラン確認
  useEffect(() => {
    const checkUserPlan = async () => {
      if (!userId) return;

      setIsLoadingPlan(true);
      try {
        const response = await fetch(`/api/check-user-plan?userId=${userId}`);
        const data = await response.json();

        if (response.ok) {
          setUserPlan(data.plan);
        } else {
          console.error('Plan check error:', data.error);
          setUserPlan('free'); // デフォルト
        }
      } catch (error) {
        console.error('Plan check error:', error);
        setUserPlan('free'); // デフォルト
      } finally {
        setIsLoadingPlan(false);
      }
    };

    checkUserPlan();
  }, [userId]);

  // 既存のgeneratePost関数（プレミアム用）
  const generatePost = async () => {
    // 既存の実装をそのまま使用
    // この関数は個別APIキー使用版
  };

  // 既存のgeneratePostWithSharedAPI関数（無料用）
  const generatePostWithSharedAPI = async () => {
    // 既存の実装をそのまま使用
    // この関数は共有APIキー使用版
  };

  // 修正: プラン別生成処理
  const handleGenerateClick = () => {
    if (userPlan === 'premium') {
      // プレミアムプランは無制限（既存のgeneratePost使用）
      generatePost();
    } else {
      // 無料プランは共有APIキー使用（既存実装維持）
      generatePostWithSharedAPI();
    }
  };

  // プラン表示の修正
  const planDisplay = userPlan === 'premium' ? 'プレミアムプラン' : '無料プラン';
  const usageDisplay = userPlan === 'premium' ?
    <span className="text-yellow-600 font-medium">無制限 ♾️</span> :
    `残り ${usage.remaining}/3回`;

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* ヘッダー部分 */}
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          AI SNS投稿ジェネレーター
        </h1>
        <div className="flex justify-center items-center gap-4 text-sm">
          <span className={`px-3 py-1 rounded-full ${userPlan === 'premium'
              ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
              : 'bg-gray-100 text-gray-600'
            }`}>
            {isLoadingPlan ? '確認中...' : planDisplay}
          </span>
          <span className="text-gray-500">
            {isLoadingPlan ? '...' : usageDisplay}
          </span>
        </div>
      </div>

      {/* 既存のフォーム部分は変更なし */}
      <form onSubmit={(e) => { e.preventDefault(); handleGenerateClick(); }}>
        {/* 既存の入力フィールド */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            投稿のテーマ
          </label>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="例: 新商品の紹介"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            トーン
          </label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="casual">カジュアル</option>
            <option value="business">ビジネス</option>
            <option value="friendly">フレンドリー</option>
            <option value="professional">プロフェッショナル</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isLoading || !prompt.trim() || isLoadingPlan}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '生成中...' : isLoadingPlan ? 'プラン確認中...' : '投稿を生成'}
        </button>
      </form>

      {/* エラー表示 */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* 生成された投稿表示 */}
      {generatedPost && (
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
          <h3 className="text-lg font-medium text-gray-900 mb-2">生成された投稿:</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{generatedPost}</p>
        </div>
      )}

      {/* UpgradePrompt（userId propを追加） */}
      <UpgradePrompt
        isVisible={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        onUpgrade={() => {
          // この関数は使用されなくなったが、既存のインターフェイス維持のため残す
          console.log('Upgrade triggered');
        }}
        remainingUses={usage.remaining || 0}
        userId={userId} // 🆕 追加: userIdを渡す
      />
    </div>
  );
};

export default PostGenerator;