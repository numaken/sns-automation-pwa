import React, { useState, useEffect } from 'react';
import { Crown, Zap, Settings, BarChart3, Twitter, Globe } from 'lucide-react';
import UpgradePrompt from './UpgradePrompt';
import SubscriptionManager from './SubscriptionManager';

const API_ENDPOINT = typeof window !== 'undefined' ? window.location.origin : '';

const PostGenerator = () => {
  // State管理
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState('カジュアル');
  const [generatedPost, setGeneratedPost] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [quality, setQuality] = useState(null);
  const [usage, setUsage] = useState({ remaining: 3, used: 0, limit: 3 });
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [userPlan, setUserPlan] = useState('free');
  const [showSettings, setShowSettings] = useState(false);
  const [generationTime, setGenerationTime] = useState(null);

  // 初期化
  useEffect(() => {
    checkUserPlan();
    // ローカルストレージの制限データをクリア（一時的な修正）
    localStorage.removeItem('dailyUsage');
    console.log('🔧 Component initialized, localStorage cleared');
  }, []);

  // プラン確認
  const checkUserPlan = () => {
    const savedPlan = localStorage.getItem('userPlan');
    const subscriptionStatus = localStorage.getItem('subscriptionStatus');

    console.log('📊 Plan check:', { savedPlan, subscriptionStatus });

    if (savedPlan === 'premium' && subscriptionStatus === 'active') {
      setUserPlan('premium');
    } else {
      setUserPlan('free');
    }
  };

  // AI投稿生成（修正版）
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
      console.log('🚀 Starting generation:', {
        prompt: prompt.trim(),
        tone,
        userPlan,
        userType: userPlan === 'premium' ? 'premium' : 'free'
      });

      // APIエンドポイントの決定
      const endpoint = userPlan === 'premium'
        ? `${API_ENDPOINT}/api/generate-post`
        : `${API_ENDPOINT}/api/generate-post-shared`;

      console.log('📡 API endpoint:', endpoint);

      const requestBody = {
        prompt: prompt.trim(),
        tone,
        userType: userPlan === 'premium' ? 'premium' : 'free'
      };

      console.log('📤 Request body:', requestBody);

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
          setUsage({ remaining: 0, used: 3, limit: 3 });
          setShowUpgradePrompt(true);
        } else {
          throw new Error(data.error || '投稿生成に失敗しました');
        }
        return;
      }

      // 成功時の処理
      setGeneratedPost(data.post);
      setQuality(data.quality);

      if (data.usage) {
        setUsage(data.usage);
        console.log('📊 Usage updated:', data.usage);
      }

      const endTime = Date.now();
      setGenerationTime(endTime - startTime);

      // プレミアム転換タイミング
      if (userPlan === 'free' && data.usage && data.usage.remaining <= 1) {
        setShowUpgradePrompt(true);
      }

    } catch (error) {
      console.error('❌ Generation error:', error);
      setError('ネットワークエラーが発生しました。しばらく待ってから再試行してください。');
    } finally {
      setIsLoading(false);
    }
  };

  // アップグレード処理
  const handleUpgrade = async () => {
    try {
      const response = await fetch(`${API_ENDPOINT}/api/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: 'price_premium_monthly',
          successUrl: `${window.location.origin}/success`,
          cancelUrl: window.location.href,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError('決済ページの作成に失敗しました');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      setError('アップグレード処理でエラーが発生しました');
    }
  };

  // コンポーネントの表示切り替え
  if (showSettings) {
    return (
      <SubscriptionManager
        onBack={() => setShowSettings(false)}
        userPlan={userPlan}
        onPlanUpdate={checkUserPlan}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <h1 className="text-4xl font-bold text-gray-900">AI SNS自動化ツール</h1>

            {/* プレミアムバッジ */}
            {userPlan === 'premium' && (
              <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-full font-bold shadow-lg">
                <Crown className="h-5 w-5" />
                PREMIUM MEMBER
              </div>
            )}

            {/* 設定ボタン */}
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors"
            >
              <Settings className="h-5 w-5" />
              設定
            </button>
          </div>

          <p className="text-xl text-gray-600">
            {userPlan === 'premium'
              ? '無制限AI投稿生成'
              : 'APIキー設定不要で即座にAI投稿生成'}
          </p>
        </div>

        {/* メインコンテンツ */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* 使用状況表示 */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-gray-900">
                  {userPlan === 'premium' ? 'プレミアムプラン' : '無料プラン'}
                </span>
              </div>

              <div className="text-right">
                {userPlan === 'premium' ? (
                  <span className="text-green-600 font-bold">無制限生成</span>
                ) : (
                  <span className="text-blue-600 font-bold">
                    残り {usage.remaining}/{usage.limit}回
                  </span>
                )}
              </div>
            </div>

            {/* 統計情報（プレミアム） */}
            {userPlan === 'premium' && generationTime && (
              <div className="mt-2 text-sm text-gray-600">
                <span>生成時間: {(generationTime / 1000).toFixed(1)}秒</span>
                {quality && <span className="ml-4">品質: {quality}点</span>}
              </div>
            )}
          </div>

          {/* 入力フォーム */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                投稿のテーマ
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="例: 新商品の紹介、イベントの告知、日常の出来事など..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                投稿のトーン
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-lg font-bold text-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  AI投稿生成中...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <Zap className="h-5 w-5" />
                  AI投稿生成
                </div>
              )}
            </button>
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* 生成結果 */}
          {generatedPost && (
            <div className="mt-8 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">生成された投稿</h3>

              <div className="bg-gray-50 p-6 rounded-lg border">
                <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                  {generatedPost}
                </p>
              </div>

              {/* 品質・統計表示 */}
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center gap-4">
                  {quality && <span>品質スコア: {quality}点</span>}
                  {generationTime && (
                    <span>生成時間: {(generationTime / 1000).toFixed(1)}秒</span>
                  )}
                </div>
                <span>文字数: {generatedPost.length}文字</span>
              </div>

              {/* SNS投稿ボタン（プレミアム限定） */}
              {userPlan === 'premium' && (
                <div className="flex gap-4 pt-4">
                  <button className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
                    <Twitter className="h-4 w-4" />
                    Twitterに投稿
                  </button>
                  <button className="flex items-center gap-2 bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors">
                    <Globe className="h-4 w-4" />
                    Threadsに投稿
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* アップグレードプロンプト */}
        <UpgradePrompt
          isVisible={showUpgradePrompt}
          onClose={() => setShowUpgradePrompt(false)}
          onUpgrade={handleUpgrade}
          remainingUses={usage.remaining}
        />
      </div>
    </div>
  );
};

export default PostGenerator;