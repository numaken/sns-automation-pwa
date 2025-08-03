// UpgradePrompt.jsx - 完全無効化安全版

import React from 'react';

const UpgradePrompt = ({ isVisible, onClose, onUpgrade, remainingUses }) => {
  // プレミアム機能は一時的に完全無効化
  const PREMIUM_FEATURES_ENABLED = false;

  // プレミアム機能が無効の場合は何も表示しない
  if (!PREMIUM_FEATURES_ENABLED || !isVisible) {
    return null;
  }

  // 万が一の場合の安全な表示（実際には表示されない）
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md mx-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            🚧 機能開発中
          </h2>
          
          <p className="text-gray-600 text-sm mb-4">
            より便利な機能を開発中です。<br />
            リリースまでしばらくお待ちください。
          </p>
          
          <button
            onClick={onClose}
            className="w-full bg-gray-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-600"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpgradePrompt;
