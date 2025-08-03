// SettingsPanel.jsx - 無料版専用安全版（プレミアム要素完全削除）

import React from 'react';

const SettingsPanel = () => {
  // プレミアム機能は一時的に完全無効化
  const PREMIUM_FEATURES_ENABLED = false;

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">⚙️ 設定</h1>
        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
          📱 無料プラン
        </div>
      </div>

      {/* プラン詳細 */}
      <div className="mb-8 p-4 border border-gray-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">📊 プラン詳細</h2>
        
        <div className="text-sm text-gray-700 mb-3">
          <strong>現在のプラン: 無料プラン</strong>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center text-sm">
            <span className="text-green-600">✅</span>
            <span className="ml-2">1日3回まで投稿生成</span>
          </div>
          <div className="flex items-center text-sm">
            <span className="text-green-600">✅</span>
            <span className="ml-2">高品質AI生成 (GPT-3.5-turbo)</span>
          </div>
          <div className="flex items-center text-sm">
            <span className="text-green-600">✅</span>
            <span className="ml-2">APIキー設定不要</span>
          </div>
          <div className="flex items-center text-sm">
            <span className="text-green-600">✅</span>
            <span className="ml-2">品質評価機能</span>
          </div>
          
          {/* プレミアム機能（無効化表示） */}
          <div className="mt-4 pt-3 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-2">今後追加予定の機能:</p>
            <div className="flex items-center text-sm text-gray-400">
              <span className="text-gray-400">❌</span>
              <span className="ml-2">無制限投稿生成</span>
            </div>
            <div className="flex items-center text-sm text-gray-400">
              <span className="text-gray-400">❌</span>
              <span className="ml-2">直接SNS投稿機能</span>
            </div>
            <div className="flex items-center text-sm text-gray-400">
              <span className="text-gray-400">❌</span>
              <span className="ml-2">広告なしクリーンUI</span>
            </div>
          </div>
        </div>

        {/* プレミアム準備中メッセージ（アップグレードボタンなし） */}
        {!PREMIUM_FEATURES_ENABLED && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <span className="text-blue-600">🚧</span>
              <span className="ml-2 text-sm text-blue-800 font-medium">
                追加機能開発中
              </span>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              より便利な機能を開発中です。リリースまでしばらくお待ちください。
            </p>
          </div>
        )}
      </div>

      {/* データ・プライバシー */}
      <div className="mb-8 p-4 border border-gray-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">🔒 データ・プライバシー</h2>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center">
            <span className="text-green-600">🛡️</span>
            <span className="ml-2">APIキーはブラウザのローカルストレージに保存</span>
          </div>
          <div className="flex items-center">
            <span className="text-green-600">🔐</span>
            <span className="ml-2">通信は全てHTTPS暗号化</span>
          </div>
          <div className="flex items-center">
            <span className="text-green-600">📝</span>
            <span className="ml-2">生成された投稿はサーバーに保存されません</span>
          </div>
          <div className="flex items-center">
            <span className="text-green-600">👁️</span>
            <span className="ml-2">個人情報の収集は最小限</span>
          </div>
          <div className="flex items-center">
            <span className="text-green-600">📋</span>
            <span className="ml-2">データ削除はいつでも可能</span>
          </div>
        </div>
      </div>

      {/* その他の設定 */}
      <div className="mb-8 p-4 border border-gray-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">🔧 その他の設定</h2>
        <div className="space-y-3">
          <label className="flex items-center">
            <input type="checkbox" className="mr-2" defaultChecked />
            <span className="text-sm">生成履歴をブラウザに保存</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" className="mr-2" defaultChecked />
            <span className="text-sm">品質評価を表示</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" className="mr-2" />
            <span className="text-sm">アップデート通知を受け取る</span>
          </label>
        </div>
      </div>

      {/* アプリ情報 */}
      <div className="p-4 border border-gray-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">ℹ️ アプリ情報</h2>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>バージョン:</span>
            <span>v2.0.0 - 無料版</span>
          </div>
          <div className="flex justify-between">
            <span>最終更新:</span>
            <span>2025年8月3日</span>
          </div>
          <div className="flex justify-between">
            <span>サポート:</span>
            <span>numaken@gmail.com</span>
          </div>
        </div>

        {/* 使い方ガイド */}
        <div className="mt-4 pt-3 border-t border-gray-200">
          <h3 className="font-medium text-gray-800 mb-2">💡 使い方のコツ</h3>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• 具体的なテーマを入力するとより良い投稿が生成されます</li>
            <li>• トーンを変えることで投稿の雰囲気を調整できます</li>
            <li>• 1日3回の制限は日本時間の深夜0時にリセットされます</li>
            <li>• 生成された投稿はコピーボタンで簡単にコピーできます</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
