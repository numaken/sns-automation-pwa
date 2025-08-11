import React, { useState, useEffect } from 'react';
import { CheckCircle, Twitter, MessageCircle, Sparkles, ArrowRight } from 'lucide-react';

const PaymentSuccess = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // プレミアム状態を即座に有効化（ローカルストレージ）
    localStorage.setItem('userPlan', 'premium');
    localStorage.setItem('premiumActivatedAt', new Date().toISOString());
  }, []);

  const startOAuth = async (platform) => {
    setIsConnecting(true);

    try {
      if (platform === 'twitter') {
        // Twitter OAuth開始
        const response = await fetch('/api/auth/twitter/authorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: `premium-user-${Date.now()}`
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.authUrl) {
            window.location.href = data.authUrl;
            return;
          }
        }
      } else if (platform === 'threads') {
        // Threads OAuth開始
        const response = await fetch('/api/auth/threads/authorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: `premium-user-${Date.now()}`
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.authUrl) {
            window.location.href = data.authUrl;
            return;
          }
        }
      }
    } catch (error) {
      console.error(`${platform} OAuth error:`, error);
    }

    setIsConnecting(false);
    // エラー時は手動設定画面へ
    window.location.href = '/settings';
  };

  const skipToApp = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* 成功アイコン */}
        <div className="mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 relative">
            <CheckCircle className="w-10 h-10 text-green-600" />
            <div className="absolute -top-1 -right-1">
              <Sparkles className="w-6 h-6 text-yellow-500 animate-pulse" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            🎉 プレミアム登録完了！
          </h1>
          <p className="text-gray-600">
            SNS投稿機能をすぐに使い始めましょう
          </p>
        </div>

        {/* プレミアム特典表示 */}
        <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-purple-800 mb-2">✨ プレミアム特典が利用可能</h3>
          <div className="text-sm text-purple-700 space-y-1">
            <div>✅ 無制限AI投稿生成</div>
            <div>✅ Twitter自動投稿</div>
            <div>✅ Threads自動投稿</div>
            <div>✅ 高速生成（2-3秒）</div>
          </div>
        </div>

        {/* ステップ表示 */}
        <div className="mb-6">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= 1 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
              1
            </div>
            <div className="w-8 h-1 bg-gray-200 rounded">
              <div className={`h-full bg-green-500 rounded transition-all duration-300 ${currentStep >= 2 ? 'w-full' : 'w-0'
                }`}></div>
            </div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= 2 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
              2
            </div>
          </div>

          <p className="text-sm text-gray-600">
            {currentStep === 1 ? 'SNSアカウント接続（2分で完了）' : '設定完了・利用開始'}
          </p>
        </div>

        {/* SNS接続ボタン */}
        <div className="space-y-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-800">
            📱 SNSアカウント接続
          </h2>

          <button
            onClick={() => startOAuth('twitter')}
            disabled={isConnecting}
            className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center space-x-2 transition-all duration-200 transform hover:scale-105"
          >
            <Twitter className="w-5 h-5" />
            <span>{isConnecting ? '接続中...' : 'Twitterを接続する'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => startOAuth('threads')}
            disabled={isConnecting}
            className="w-full bg-purple-500 text-white py-3 px-6 rounded-lg hover:bg-purple-600 disabled:opacity-50 flex items-center justify-center space-x-2 transition-all duration-200 transform hover:scale-105"
          >
            <MessageCircle className="w-5 h-5" />
            <span>{isConnecting ? '接続中...' : 'Threadsを接続する'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* スキップオプション */}
        <div className="border-t pt-4">
          <button
            onClick={skipToApp}
            className="w-full bg-gray-100 text-gray-700 py-2 px-6 rounded-lg hover:bg-gray-200 transition-colors duration-200"
          >
            後で設定する（アプリを使い始める）
          </button>

          <p className="text-xs text-gray-500 mt-2">
            💡 設定画面からいつでも接続できます
          </p>
        </div>

        {/* 成功メッセージ */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 接続により、AI生成した投稿を瞬時にSNSに投稿できます
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;