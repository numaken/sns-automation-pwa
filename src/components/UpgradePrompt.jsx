import React, { useState } from 'react';
import { Crown, Zap, Infinity, X, CreditCard } from 'lucide-react';

const UpgradePrompt = ({ isVisible, onClose, remainingUses = 0 }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isVisible) return null;

  // Stripe Checkout開始
  const handleUpgrade = async () => {
    setIsLoading(true);
    setError('');

    try {
      // ユーザーIDの生成または取得
      let userId = localStorage.getItem('sns_automation_user_id');
      if (!userId) {
        userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('sns_automation_user_id', userId);
      }

      // Stripe Checkout Session作成
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '決済セッションの作成に失敗しました');
      }

      if (data.success && data.url) {
        // Stripe Checkoutページにリダイレクト
        window.location.href = data.url;
      } else {
        throw new Error('決済URLの取得に失敗しました');
      }

    } catch (error) {
      console.error('Upgrade error:', error);
      setError(error.message || '決済の開始に失敗しました。しばらく待ってから再試行してください。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full relative">
        {/* ヘッダー */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Crown className="h-6 w-6 text-yellow-500 mr-2" />
              <h2 className="text-xl font-bold text-gray-900">
                プレミアムプラン
              </h2>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="p-6">
          {remainingUses === 0 ? (
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🎯</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                本日の無料生成完了！
              </h3>
              <p className="text-gray-600 text-sm">
                もっと投稿を生成したい場合は、プレミアムプランをお試しください
              </p>
            </div>
          ) : (
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">✨</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                さらに生成しませんか？
              </h3>
              <p className="text-gray-600 text-sm">
                残り{remainingUses}回の無料生成があります
              </p>
            </div>
          )}

          {/* プレミアム機能一覧 */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-yellow-800 mb-3 text-center">
              🚀 プレミアムで解放される機能
            </h4>
            <ul className="space-y-2 text-sm text-yellow-700">
              <li className="flex items-center">
                <Infinity className="h-4 w-4 mr-3 flex-shrink-0" />
                <span>無制限の投稿生成</span>
              </li>
              <li className="flex items-center">
                <Zap className="h-4 w-4 mr-3 flex-shrink-0" />
                <span>Twitter・Threads自動投稿</span>
              </li>
              <li className="flex items-center">
                <Crown className="h-4 w-4 mr-3 flex-shrink-0" />
                <span>高速生成・広告なし</span>
              </li>
              <li className="flex items-center">
                <CreditCard className="h-4 w-4 mr-3 flex-shrink-0" />
                <span>優先サポート</span>
              </li>
            </ul>
          </div>

          {/* 価格表示 */}
          <div className="text-center mb-4">
            <div className="text-3xl font-bold text-gray-900">¥980</div>
            <div className="text-sm text-gray-500">月額（税込）</div>
            <div className="text-xs text-gray-400 mt-1">いつでもキャンセル可能</div>
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* アクションボタン */}
          <div className="space-y-3">
            <button
              onClick={handleUpgrade}
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-yellow-500 hover:bg-yellow-600'
                }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  決済ページに移動中...
                </div>
              ) : (
                '🚀 プレミアムプランを開始'
              )}
            </button>

            <button
              onClick={onClose}
              disabled={isLoading}
              className="w-full text-gray-500 py-2 px-4 text-sm hover:text-gray-700 transition-colors disabled:opacity-50"
            >
              {remainingUses === 0 ? '明日まで待つ' : '後で決める'}
            </button>
          </div>

          {/* セキュリティ情報 */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center">
              🔒 Stripe決済で安全・安心<br />
              個人情報は暗号化して保護されています
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradePrompt;