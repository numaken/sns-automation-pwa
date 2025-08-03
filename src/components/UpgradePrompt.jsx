import React from 'react';
import { Crown, Zap, Infinity } from 'lucide-react';

const UpgradePrompt = ({ isVisible, onClose, onUpgrade, remainingUses }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md mx-4">
        <div className="text-center">
          <div className="mb-4">
            <Crown className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
            <h2 className="text-xl font-bold text-gray-900">
              {remainingUses === 0 ? '本日の無料生成完了！' : 'もっと生成しませんか？'}
            </h2>
          </div>

          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-yellow-800 mb-2">
              プレミアムで解放される機能
            </h3>
            <ul className="text-sm text-yellow-700 space-y-1 text-left">
              <li className="flex items-center">
                <Infinity className="h-4 w-4 mr-2" />
                無制限の投稿生成
              </li>
              <li className="flex items-center">
                <Zap className="h-4 w-4 mr-2" />
                高速生成（専用APIキー）
              </li>
              <li className="flex items-center">
                <Crown className="h-4 w-4 mr-2" />
                広告なしのクリーンUI
              </li>
            </ul>
          </div>

          <p className="text-gray-600 text-sm mb-4">
            {remainingUses === 0
              ? '明日も無料で3回生成できますが、今すぐ無制限で使いませんか？'
              : `残り${remainingUses}回の無料生成があります。`
            }
          </p>

          <div className="space-y-2">
            <button
              onClick={onUpgrade}
              className="w-full bg-yellow-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-yellow-600 transition-colors"
            >
              月額¥980でアップグレード
            </button>
            <button
              onClick={onClose}
              className="w-full text-gray-500 py-2 px-4 text-sm hover:text-gray-700"
            >
              {remainingUses === 0 ? '明日まで待つ' : '後で決める'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradePrompt;