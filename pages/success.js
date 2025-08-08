// pages/success.js または src/pages/Success.js
// 引き継ぎ書指定: 決済成功ページ

import React, { useEffect, useState } from 'react';
import { Crown, CheckCircle, Twitter, Zap } from 'lucide-react';

const Success = () => {
  const [sessionId, setSessionId] = useState('');
  const [isProcessing, setIsProcessing] = useState(true);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    // URLパラメータからsession_idを取得
    const urlParams = new URLSearchParams(window.location.search);
    const session = urlParams.get('session_id');

    if (session) {
      setSessionId(session);
      // ローカルストレージからユーザーIDを取得
      const storedUserId = localStorage.getItem('sns_automation_user_id');
      if (storedUserId) {
        setUserId(storedUserId);
        // プレミアムプランに設定（手動設定 - Webhookの代替）
        updateUserPlan(storedUserId);
      }
    }

    setTimeout(() => setIsProcessing(false), 2000);
  }, []);

  const updateUserPlan = async (userId) => {
    try {
      // 注意: 本来はWebhookで処理すべきですが、
      // 簡易実装として手動でプラン更新
      localStorage.setItem('user_plan', 'premium');
      console.log('User plan updated to premium');
    } catch (error) {
      console.error('Plan update error:', error);
    }
  };

  const handleContinue = () => {
    window.location.href = '/';
  };

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <Crown className="h-16 w-16 text-yellow-500 mx-auto mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            決済処理中...
          </h2>
          <p className="text-gray-600">プレミアムプランを有効化しています</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center">
      <div className="max-w-md mx-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            決済完了！
          </h1>

          <div className="flex items-center justify-center mb-4">
            <Crown className="h-6 w-6 text-yellow-500 mr-2" />
            <span className="text-xl font-semibold text-yellow-600">
              プレミアムプラン
            </span>
          </div>

          <p className="text-gray-600 mb-6">
            ありがとうございます！プレミアムプランが有効になりました。
          </p>

          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-yellow-800 mb-3">
              利用可能になった機能
            </h3>
            <ul className="text-sm text-yellow-700 space-y-2">
              <li className="flex items-center">
                <Crown className="h-4 w-4 mr-2" />
                無制限の投稿生成
              </li>
              <li className="flex items-center">
                <Twitter className="h-4 w-4 mr-2" />
                Twitter自動投稿
              </li>
              <li className="flex items-center">
                <Zap className="h-4 w-4 mr-2" />
                高速生成・優先サポート
              </li>
            </ul>
          </div>

          <button
            onClick={handleContinue}
            className="w-full bg-yellow-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-yellow-600 transition-colors"
          >
            プレミアム機能を使い始める
          </button>

          <p className="text-xs text-gray-400 mt-4">
            セッションID: {sessionId}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Success;