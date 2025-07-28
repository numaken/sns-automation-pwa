// src/components/SettingsPanel.jsx - 設定管理パネル（修正版）
import React, { useState, useEffect } from 'react';
import './SettingsPanel.css';

const SettingsPanel = ({ currentPlan = 'free', onPlanChange }) => {
  const [apiKey, setApiKey] = useState('');
  const [savedApiKey, setSavedApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [usageStats, setUsageStats] = useState(null);
  const [showApiKey, setShowApiKey] = useState(false);

  // API endpoint
  const API_ENDPOINT = process.env.REACT_APP_API_URL || window.location.origin;

  useEffect(() => {
    // 保存されたAPIキーを読み込み（プレミアムプランのみ）
    if (currentPlan === 'premium') {
      const stored = localStorage.getItem('openai_api_key');
      if (stored) {
        setSavedApiKey(stored);
        setApiKey('●'.repeat(20)); // マスクして表示
      }
    }
    
    // 使用統計を取得
    fetchUsageStats();
  }, [currentPlan]);

  const fetchUsageStats = async () => {
    try {
      const response = await fetch(`${API_ENDPOINT}/api/usage-status`);
      if (response.ok) {
        const data = await response.json();
        setUsageStats(data);
      }
    } catch (error) {
      console.error('Usage stats fetch error:', error);
    }
  };

  const saveApiKey = async () => {
    if (!apiKey || apiKey === '●'.repeat(20)) {
      setMessage('APIキーを入力してください');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      // APIキーの検証
      const testResponse = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!testResponse.ok) {
        throw new Error('無効なAPIキーです');
      }

      // 保存
      localStorage.setItem('openai_api_key', apiKey);
      setSavedApiKey(apiKey);
      setApiKey('●'.repeat(20));
      setMessage('✅ APIキーが正常に保存されました');
    } catch (error) {
      setMessage(`❌ エラー: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const removeApiKey = () => {
    localStorage.removeItem('openai_api_key');
    setSavedApiKey('');
    setApiKey('');
    setMessage('APIキーを削除しました');
  };

  const toggleShowApiKey = () => {
    if (showApiKey) {
      setApiKey('●'.repeat(20));
    } else {
      setApiKey(savedApiKey);
    }
    setShowApiKey(!showApiKey);
  };

  const upgradeToPremium = () => {
    // TODO: 実際の決済処理実装
    if (onPlanChange) {
      onPlanChange('premium');
    }
    setMessage('🎉 プレミアムプランにアップグレードしました！');
  };

  const downgradToFree = () => {
    if (onPlanChange) {
      onPlanChange('free');
    }
    removeApiKey();
    setMessage('無料プランに変更しました');
  };

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h2>⚙️ 設定</h2>
        <div className={`plan-badge ${currentPlan}`}>
          {currentPlan === 'free' ? '🆓 無料プラン' : '⭐ プレミアム'}
        </div>
      </div>

      {/* プラン情報セクション */}
      <div className="plan-section">
        <h3>📊 プラン詳細</h3>
        
        {currentPlan === 'free' ? (
          <div className="free-plan-info">
            <div className="plan-features">
              <h4>現在のプラン: 無料プラン</h4>
              <ul>
                <li>✅ 1日3回まで投稿生成</li>
                <li>✅ 真のAI生成（GPT-3.5-turbo）</li>
                <li>✅ APIキー設定不要</li>
                <li>✅ 品質評価機能</li>
                <li>❌ 無制限生成</li>
                <li>❌ 直接SNS投稿</li>
                <li>❌ 広告なし</li>
              </ul>
            </div>
            
            {usageStats && (
              <div className="usage-display">
                <h4>今日の使用状況</h4>
                <div className="usage-bar">
                  <div 
                    className="usage-fill"
                    style={{ width: `${((3 - usageStats.remaining) / 3) * 100}%` }}
                  ></div>
                </div>
                <span>{3 - usageStats.remaining}/3回 使用済み</span>
              </div>
            )}

            <div className="upgrade-promotion">
              <h4>🚀 プレミアムにアップグレード</h4>
              <div className="premium-features">
                <ul>
                  <li>🔥 無制限の投稿生成</li>
                  <li>🎯 独自APIキー使用可能</li>
                  <li>📤 直接SNS投稿機能</li>
                  <li>🎨 広告なしクリーンUI</li>
                  <li>⚡ 優先サポート</li>
                </ul>
              </div>
              <div className="pricing">
                <span className="price">¥980</span>
                <span className="period">/月</span>
              </div>
              <button 
                className="upgrade-button primary-button"
                onClick={upgradeToPremium}
              >
                今すぐアップグレード
              </button>
            </div>
          </div>
        ) : (
          <div className="premium-plan-info">
            <div className="plan-features">
              <h4>現在のプラン: プレミアム ⭐</h4>
              <ul>
                <li>✅ 無制限の投稿生成</li>
                <li>✅ 独自APIキー使用</li>
                <li>✅ 直接SNS投稿機能</li>
                <li>✅ 広告なしUI</li>
                <li>✅ 優先サポート</li>
              </ul>
            </div>

            <div className="api-key-section">
              <h4>🔑 OpenAI APIキー設定</h4>
              <p className="api-key-description">
                プレミアムプランでは独自のAPIキーを使用できます。
                より高いレート制限とコスト効率を実現できます。
              </p>
              
              <div className="api-key-input-group">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="api-key-input"
                  disabled={isLoading}
                />
                <button 
                  className="toggle-visibility-button"
                  onClick={toggleShowApiKey}
                  disabled={!savedApiKey}
                >
                  {showApiKey ? '🙈' : '👁️'}
                </button>
              </div>

              <div className="api-key-actions">
                <button 
                  className="save-button secondary-button"
                  onClick={saveApiKey}
                  disabled={isLoading}
                >
                  {isLoading ? '検証中...' : '💾 保存'}
                </button>
                
                {savedApiKey && (
                  <button 
                    className="remove-button danger-button"
                    onClick={removeApiKey}
                  >
                    🗑️ 削除
                  </button>
                )}
              </div>

              <div className="api-key-help">
                <p>
                  <strong>APIキーの取得方法:</strong>
                </p>
                <ol>
                  <li><a href="https://platform.openai.com" target="_blank" rel="noopener noreferrer">OpenAI Platform</a>にアクセス</li>
                  <li>「API Keys」セクションを開く</li>
                  <li>「Create new secret key」をクリック</li>
                  <li>生成されたキーをコピーして上記に貼り付け</li>
                </ol>
              </div>
            </div>

            <div className="downgrade-section">
              <button 
                className="downgrade-button"
                onClick={downgradToFree}
              >
                無料プランに戻る
              </button>
            </div>
          </div>
        )}
      </div>

      {/* データ・プライバシーセクション */}
      <div className="privacy-section">
        <h3>🔒 データ・プライバシー</h3>
        <div className="privacy-info">
          <ul>
            <li>🛡️ APIキーはブラウザのローカルストレージに保存</li>
            <li>🔐 通信は全てHTTPS暗号化</li>
            <li>📝 生成された投稿はサーバーに保存されません</li>
            <li>👁️ 個人情報の収集は最小限</li>
            <li>🗑️ データ削除はいつでも可能</li>
          </ul>
        </div>
      </div>

      {/* その他の設定 */}
      <div className="other-settings">
        <h3>🔧 その他の設定</h3>
        
        <div className="setting-item">
          <label>
            <input type="checkbox" defaultChecked />
            生成履歴をブラウザに保存
          </label>
        </div>

        <div className="setting-item">
          <label>
            <input type="checkbox" defaultChecked />
            品質評価を表示
          </label>
        </div>

        <div className="setting-item">
          <label>
            <input type="checkbox" />
            アップデート通知を受け取る
          </label>
        </div>
      </div>

      {message && (
        <div className={`message ${message.includes('❌') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {/* アプリ情報 */}
      <div className="app-info">
        <h3>ℹ️ アプリ情報</h3>
        <div className="info-grid">
          <div className="info-item">
            <span className="label">バージョン:</span>
            <span className="value">v2.0.0 - フリーミアム対応</span>
          </div>
          <div className="info-item">
            <span className="label">最終更新:</span>
            <span className="value">2024年7月29日</span>
          </div>
          <div className="info-item">
            <span className="label">サポート:</span>
            <span className="value">
              <a href="mailto:support@example.com">support@example.com</a>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
