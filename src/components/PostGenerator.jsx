import React, { useState, useEffect } from 'react';
import { Wand2, Sparkles, AlertCircle, Crown } from 'lucide-react';
import UpgradePrompt from './UpgradePrompt';
import { useUserPlan } from '../hooks/useUserPlan';

const API_ENDPOINT = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:3000' 
  : 'https://sns-automation-pwa.vercel.app';

const PostGenerator = () => {
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState('カジュアル');
  const [generatedPost, setGeneratedPost] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [quality, setQuality] = useState(null);
  const [usage, setUsage] = useState({ remaining: 3 });
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  
  // プレミアムプラン管理
  const { userPlan, isLoading: planLoading } = useUserPlan();

  useEffect(() => {
    // 無料プランの場合のみ使用量を確認
    if (userPlan === 'free') {
      checkUsage();
    }
  }, [userPlan]);

  const checkUsage = async () => {
    try {
      const response = await fetch(`${API_ENDPOINT}/api/check-usage`);
      if (response.ok) {
        const data = await response.json();
        setUsage(data);
      }
    } catch (error) {
      console.error('Usage check error:', error);
    }
  };

  // プレミアムプラン用の無制限生成（既存のユーザーAPIキー使用）
  const generatePost = async () => {
    if (!prompt.trim()) {
      setError('投稿のテーマを入力してください');
      return;
    }

    setIsLoading(true);
    setError('');
    setGeneratedPost('');

    try {
      const response = await fetch(`${API_ENDPOINT}/api/generate-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
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
  const generatePostWithSharedAPI = async () => {
    if (!prompt.trim()) {
      setError('投稿のテーマを入力してください');
      return;
    }

    setIsLoading(true);
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

  // メイン生成ハンドラー（仕様書通りの実装）
  const handleGenerateClick = () => {
    if (userPlan === 'premium') {
      // プレミアムプランは無制限（既存のgeneratePost使用）
      generatePost();
    } else {
      // 無料プランは共有APIキー使用（既存実装維持）
      generatePostWithSharedAPI();
    }
  };

  const handleUpgrade = () => {
    window.location.href = '/upgrade';
  };

  // プラン表示（仕様書通りの実装）
  const planDisplay = userPlan === 'premium' ? 'プレミアムプラン - 無制限' : '無料プラン';
  const usageDisplay = userPlan === 'premium' ? null : `残り ${usage.remaining}/3回`;

  if (planLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* プラン表示エリア */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {userPlan === 'premium' ? (
              <Crown className="h-5 w-5 text-yellow-500" />
            ) : (
              <Sparkles className="h-5 w-5 text-blue-500" />
            )}
            <span className="font-medium text-gray-800">{planDisplay}</span>
          </div>
          {usageDisplay && (
            <span className="text-sm text-gray-600">{usageDisplay}</span>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center">
            <Wand2 className="h-6 w-6 mr-2 text-purple-600" />
            AI投稿生成
          </h2>
          <p className="text-gray-600">
            {userPlan === 'premium' 
              ? 'プレミアムプラン：無制限でAI投稿を生成できます' 
              : 'APIキー設定不要で簡単にAI投稿を生成'
            }
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              投稿のテーマ・内容
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="例: 新商品の魅力的な紹介、イベント告知、日常の気づき等"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              rows={4}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              投稿のトーン
            </label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="カジュアル">カジュアル</option>
              <option value="ビジネス">ビジネス</option>
              <option value="フレンドリー">フレンドリー</option>
              <option value="プロフェッショナル">プロフェッショナル</option>
              <option value="エモーショナル">エモーショナル</option>
            </select>
          </div>

          <button
            onClick={handleGenerateClick}
            disabled={isLoading || !prompt.trim()}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                生成中...
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <Sparkles className="h-5 w-5 mr-2" />
                AI投稿生成
              </span>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {generatedPost && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-gray-800">生成された投稿</h3>
              {quality && (
                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                  品質スコア: {quality}%
                </span>
              )}
            </div>
            <div className="bg-white p-4 rounded border border-gray-200">
              <p className="whitespace-pre-wrap text-gray-800">{generatedPost}</p>
            </div>
            <div className="mt-3 flex space-x-2">
              <button
                onClick={() => navigator.clipboard.writeText(generatedPost)}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
              >
                コピー
              </button>
              <button
                onClick={() => setGeneratedPost('')}
                className="px-4 py-2 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
              >
                クリア
              </button>
            </div>
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
  );
};

export default PostGenerator;
