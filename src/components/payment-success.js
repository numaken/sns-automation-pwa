// ===============================================
// 4. pages/payment-success.js - 完全修正版
// ===============================================
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const PaymentSuccess = () => {
  const router = useRouter();
  const { session_id } = router.query;
  const [status, setStatus] = useState('loading');
  const [userInfo, setUserInfo] = useState(null);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (session_id) {
      handlePaymentConfirmation(session_id);
    }
  }, [session_id]);

  // カウントダウン処理
  useEffect(() => {
    if (status === 'success' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (status === 'success' && countdown === 0) {
      // 自動リダイレクト
      router.push('/?premium=activated&setup=oauth');
    }
  }, [status, countdown, router]);

  const handlePaymentConfirmation = async (sessionId) => {
    try {
      setStatus('confirming');

      console.log('🔍 Confirming payment...', sessionId);

      // 決済確認とプレミアム移行
      const response = await fetch('/api/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Payment confirmed:', data);

        // ローカルストレージにプレミアム状態設定
        localStorage.setItem('userPlan', 'premium');
        localStorage.setItem('subscriptionStatus', 'active');
        localStorage.setItem('paymentDate', new Date().toISOString());
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('paymentAmount', data.paymentAmount);

        setUserInfo(data);
        setStatus('success');

      } else {
        const errorData = await response.json();
        console.error('❌ Payment confirmation failed:', errorData);
        setError(errorData.error || '決済確認に失敗しました');
        setStatus('error');
      }
    } catch (error) {
      console.error('❌ Payment confirmation error:', error);
      setError('決済確認中にエラーが発生しました');
      setStatus('error');
    }
  };

  const startOAuth = (platform) => {
    const userId = userInfo?.userId || localStorage.getItem('userId');
    if (platform === 'twitter') {
      window.location.href = `/api/auth/twitter/authorize?userId=${userId}`;
    } else if (platform === 'threads') {
      window.location.href = `/api/auth/threads/authorize?userId=${userId}`;
    }
  };

  const skipToApp = () => {
    router.push('/?premium=activated');
  };

  // ローディング状態
  if (status === 'loading' || status === 'confirming') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <div className="max-w-md mx-auto text-center p-8 bg-white rounded-2xl shadow-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            {status === 'loading' ? '決済情報を確認中...' : 'プレミアムプランを設定中...'}
          </h1>
          <p className="text-gray-600">少々お待ちください</p>
        </div>
      </div>
    );
  }

  // エラー状態
  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="max-w-md mx-auto text-center p-8 bg-white rounded-2xl shadow-lg">
          <div className="mb-4">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">決済確認エラー</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              再試行
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors"
            >
              ホームに戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 成功状態
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* 成功アイコン */}
        <div className="mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 relative">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <div className="absolute -top-1 -right-1">
              <svg className="w-6 h-6 text-yellow-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
              </svg>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🎉 決済完了！
          </h1>
          <p className="text-gray-600 mb-2">
            PostPilot Proプレミアムプランへようこそ
          </p>
          {userInfo && (
            <p className="text-sm text-green-600 font-medium">
              お支払い額: ¥{userInfo.paymentAmount?.toLocaleString()}
            </p>
          )}
        </div>

        {/* プレミアム特典表示 */}
        <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl p-6 mb-6">
          <h3 className="font-bold text-purple-800 mb-3">✨ プレミアム特典が利用可能</h3>
          <div className="grid grid-cols-2 gap-3 text-sm text-purple-700">
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✅</span>
              無制限AI生成
            </div>
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✅</span>
              Twitter自動投稿
            </div>
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✅</span>
              Threads自動投稿
            </div>
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✅</span>
              高速生成（2秒）
            </div>
          </div>
        </div>

        {/* SNS接続セクション */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            📱 SNSアカウント接続
          </h2>
          <p className="text-gray-600 mb-4 text-sm">
            投稿機能を使うために、SNSアカウントを接続しましょう
          </p>

          <div className="space-y-3">
            <button
              onClick={() => startOAuth('twitter')}
              className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg hover:bg-blue-600 flex items-center justify-center space-x-2 transition-all transform hover:scale-105"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>Twitterを接続する</span>
            </button>

            <button
              onClick={() => startOAuth('threads')}
              className="w-full bg-purple-500 text-white py-3 px-6 rounded-lg hover:bg-purple-600 flex items-center justify-center space-x-2 transition-all transform hover:scale-105"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21.327 8.566c0-4.339-3.35-7.84-7.691-7.84-4.339 0-7.688 3.501-7.688 7.84 0 4.34 3.349 7.84 7.688 7.84 4.341 0 7.691-3.5 7.691-7.84z" />
              </svg>
              <span>Threadsを接続する</span>
            </button>
          </div>
        </div>

        {/* 自動リダイレクト */}
        <div className="border-t pt-4">
          <div className="bg-blue-50 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800">
              {countdown > 0 ? (
                <>⏰ {countdown}秒後に自動でアプリに移動します</>
              ) : (
                <>🚀 移動中...</>
              )}
            </p>
          </div>

          <button
            onClick={skipToApp}
            className="w-full bg-gray-100 text-gray-700 py-2 px-6 rounded-lg hover:bg-gray-200 transition-colors"
          >
            すぐにアプリを使い始める
          </button>

          <p className="text-xs text-gray-500 mt-2">
            💡 設定画面からいつでもSNS接続できます
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
