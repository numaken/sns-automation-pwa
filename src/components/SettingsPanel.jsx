// src/components/SettingsPanel.jsx - 設定管理パネル
import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Key, Twitter, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { validateTwitterTokens, initiateTwitterAuth } from '../utils/twitter';

const SettingsPanel = ({ settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showTwitterTokens, setShowTwitterTokens] = useState(false);
  const [validationStatus, setValidationStatus] = useState({
    openai: null,
    twitter: null
  });
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // 設定の保存
  const handleSave = () => {
    onSave(localSettings);
    alert('設定を保存しました！');
  };

  // OpenAI API キーの検証
  const validateOpenAIKey = async () => {
    if (!localSettings.openaiKey) {
      setValidationStatus(prev => ({ ...prev, openai: { valid: false, error: 'APIキーが入力されていません' } }));
      return;
    }

    setIsValidating(true);
    try {
      // 簡易的な検証（実際のAPI呼び出しは投稿生成時に行う）
      if (localSettings.openaiKey.startsWith('sk-') && localSettings.openaiKey.length > 45) {
        setValidationStatus(prev => ({ ...prev, openai: { valid: true } }));
      } else {
        setValidationStatus(prev => ({ ...prev, openai: { valid: false, error: 'APIキーの形式が正しくありません' } }));
      }
    } catch (error) {
      setValidationStatus(prev => ({ ...prev, openai: { valid: false, error: error.message } }));
    } finally {
      setIsValidating(false);
    }
  };

  // Twitter認証の検証
  const validateTwitterAuth = async () => {
    if (!localSettings.twitterTokens?.bearerToken) {
      setValidationStatus(prev => ({ ...prev, twitter: { valid: false, error: 'Bearer Tokenが入力されていません' } }));
      return;
    }

    setIsValidating(true);
    try {
      const result = await validateTwitterTokens(localSettings.twitterTokens);
      setValidationStatus(prev => ({ ...prev, twitter: result }));
    } catch (error) {
      setValidationStatus(prev => ({ ...prev, twitter: { valid: false, error: error.message } }));
    } finally {
      setIsValidating(false);
    }
  };

  // Twitter認証の開始
  const handleTwitterAuth = () => {
    initiateTwitterAuth();
  };

  return (
    <div className="space-y-6">
      {/* OpenAI設定 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center space-x-2 mb-4">
          <Key className="h-5 w-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">OpenAI API設定</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              APIキー
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={localSettings.openaiKey || ''}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, openaiKey: e.target.value }))}
                placeholder="sk-proj-..."
                className="w-full p-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={validateOpenAIKey}
              disabled={isValidating}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isValidating ? '検証中...' : '検証'}
            </button>

            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <span>APIキー取得</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          {validationStatus.openai && (
            <div className={`flex items-center space-x-2 p-3 rounded-lg ${validationStatus.openai.valid
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
              }`}>
              {validationStatus.openai.valid ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span className="text-sm">
                {validationStatus.openai.valid
                  ? 'APIキーは有効です'
                  : validationStatus.openai.error
                }
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Twitter設定 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center space-x-2 mb-4">
          <Twitter className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-900">Twitter API設定</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bearer Token
            </label>
            <div className="relative">
              <input
                type={showTwitterTokens ? 'text' : 'password'}
                value={localSettings.twitterTokens?.bearerToken || ''}
                onChange={(e) => setLocalSettings(prev => ({
                  ...prev,
                  twitterTokens: {
                    ...prev.twitterTokens,
                    bearerToken: e.target.value
                  }
                }))}
                placeholder="AAAAAAAAAAAAAAAAAAAAAMLheAAAAAAA..."
                className="w-full p-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowTwitterTokens(!showTwitterTokens)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              >
                {showTwitterTokens ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={validateTwitterAuth}
              disabled={isValidating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isValidating ? '検証中...' : '検証'}
            </button>

            <button
              onClick={handleTwitterAuth}
              className="flex items-center space-x-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <span>認証設定</span>
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>

          {validationStatus.twitter && (
            <div className={`flex items-center space-x-2 p-3 rounded-lg ${validationStatus.twitter.valid
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
              }`}>
              {validationStatus.twitter.valid ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span className="text-sm">
                {validationStatus.twitter.valid
                  ? `認証成功: @${validationStatus.twitter.user?.username}`
                  : validationStatus.twitter.error
                }
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 設定手順ガイド */}
      <div className="bg-blue-50 rounded-xl p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-3">🚀 初期設定ガイド</h3>
        <div className="space-y-3 text-sm text-blue-800">
          <div>
            <div className="font-medium">1. OpenAI APIキー取得</div>
            <div className="text-xs text-blue-600 mt-1">
              • platform.openai.com でアカウント作成<br />
              • Billing設定で課金設定（最低$5〜）<br />
              • API Keys でシークレットキー生成
            </div>
          </div>

          <div>
            <div className="font-medium">2. Twitter API設定</div>
            <div className="text-xs text-blue-600 mt-1">
              • developer.twitter.com でアプリ作成<br />
              • Keys and Tokens でBearer Token取得<br />
              • App permissions を Read and write に設定
            </div>
          </div>
        </div>
      </div>

      {/* 保存ボタン */}
      <div className="sticky bottom-6">
        <button
          onClick={handleSave}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          設定を保存
        </button>
      </div>

      {/* リセット・その他 */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">その他の設定</h3>
        <div className="space-y-3">
          <button
            onClick={() => {
              if (confirm('全ての設定をリセットしますか？')) {
                localStorage.clear();
                window.location.reload();
              }
            }}
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
          >
            全設定をリセット
          </button>

          <button
            onClick={() => {
              if (confirm('投稿履歴を削除しますか？')) {
                localStorage.removeItem('twitter_post_history');
                alert('投稿履歴を削除しました');
              }
            }}
            className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            投稿履歴を削除
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;