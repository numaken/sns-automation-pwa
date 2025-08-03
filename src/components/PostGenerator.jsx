// 無料版専用リリース版 - プレミアム要素を一時的に無効化

import React, { useState, useEffect } from 'react';

const PostGenerator = () => {
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState('カジュアル');
  const [generatedPost, setGeneratedPost] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [usage, setUsage] = useState({ remaining: 3 });
  const [quality, setQuality] = useState(null);

  // プレミアム機能は一時的に無効化
  const userPlan = 'free'; // 固定
  const PREMIUM_FEATURES_ENABLED = false; // プレミアム機能完成時にtrueに

  const API_ENDPOINT = process.env.NODE_ENV === 'production'
    ? 'https://sns-automation-pwa.vercel.app'
    : '';

  // 無料版のみの生成関数
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
          setError('1日の無料生成回数（3回）を超えました。明日またお試しください！');
          setUsage({ remaining: 0 });
          // プレミアム誘導は一時的に削除
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

    } catch (error) {
      console.error('Generate post error:', error);
      setError('ネットワークエラーが発生しました。しばらく待ってから再試行してください。');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* プラン表示 - 無料版のみ */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="font-medium text-blue-800">無料プラン</span>
          <span className="text-sm text-blue-600">
            残り {usage.remaining}/3回（本日分）
          </span>
        </div>
        {!PREMIUM_FEATURES_ENABLED && (
          <p className="text-xs text-blue-600 mt-1">
            プレミアムプラン（無制限生成）は準備中です
          </p>
        )}
      </div>

      {/* 投稿生成フォーム */}
      <div className="space-y-4">
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium mb-2">
            投稿のテーマ
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="投稿したい内容やテーマを入力してください..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
        </div>

        <div>
          <label htmlFor="tone" className="block text-sm font-medium mb-2">
            トーン
          </label>
          <select
            id="tone"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="カジュアル">カジュアル</option>
            <option value="フォーマル">フォーマル</option>
            <option value="フレンドリー">フレンドリー</option>
            <option value="プロフェッショナル">プロフェッショナル</option>
          </select>
        </div>

        <button
          onClick={generatePostWithSharedAPI}
          disabled={isGenerating || !prompt.trim() || usage.remaining === 0}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? '生成中...' :
            usage.remaining === 0 ? '本日の無料生成完了（明日リセット）' :
              'AI投稿を生成'}
        </button>

        {usage.remaining === 0 && (
          <div className="text-center text-sm text-gray-600">
            無料プランは1日3回まで生成可能です。<br />
            明日朝にリセットされます。
          </div>
        )}
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* 生成された投稿表示 */}
      {generatedPost && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-medium text-green-800 mb-2">生成された投稿</h3>
          <p className="text-green-700 whitespace-pre-wrap">{generatedPost}</p>
          {quality && (
            <div className="mt-2 text-sm text-green-600">
              品質スコア: {quality}/100
            </div>
          )}

          {/* コピーボタン追加 */}
          <button
            onClick={() => navigator.clipboard.writeText(generatedPost)}
            className="mt-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
          >
            📋 コピー
          </button>
        </div>
      )}

      {/* 使用方法説明 */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-800 mb-2">使い方</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• 投稿したいテーマを入力</li>
          <li>• お好みのトーンを選択</li>
          <li>• 生成されたテキストをコピーしてSNSに投稿</li>
          <li>• 無料プランは1日3回まで利用可能</li>
        </ul>
      </div>
    </div>
  );
};

export default PostGenerator;