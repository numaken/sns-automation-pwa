// UpgradeButton.jsx - 完全無効化安全版

import React from 'react';

const UpgradeButton = ({ className = '', children, ...props }) => {
  // プレミアム機能は一時的に完全無効化
  const PREMIUM_FEATURES_ENABLED = false;

  // プレミアム機能が無効の場合は何も表示しない
  if (!PREMIUM_FEATURES_ENABLED) {
    return null;
  }

  // 万が一の場合の安全な表示（実際には表示されない）
  return (
    <div className="p-3 bg-gray-100 border border-gray-300 rounded-lg text-center">
      <div className="text-gray-500 text-sm">
        🚧 機能開発中です
      </div>
      <div className="text-xs text-gray-400 mt-1">
        しばらくお待ちください
      </div>
    </div>
  );
};

export default UpgradeButton;
