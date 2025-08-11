// 新規作成: public/payment-success.html
// または: src/components/PaymentSuccess.jsx（実装ロードマップ通り）

const PaymentSuccess = () => {
  const startOAuth = (platform) => {
    if (platform === 'twitter') {
      window.location.href = '/api/auth/twitter/authorize';
    } else if (platform === 'threads') {
      window.location.href = '/api/auth/threads/authorize';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          🎉 プレミアム登録完了！
        </h1>
        <p className="text-gray-600 mb-6">
          SNS投稿機能をすぐに使い始めましょう
        </p>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">
            📱 SNSアカウント接続（2分で完了）
          </h2>

          <button
            onClick={() => startOAuth('twitter')}
            className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg hover:bg-blue-600 flex items-center justify-center space-x-2"
          >
            <Twitter className="w-5 h-5" />
            <span>Twitterを接続する</span>
          </button>

          <button
            onClick={() => startOAuth('threads')}
            className="w-full bg-purple-500 text-white py-3 px-6 rounded-lg hover:bg-purple-600 flex items-center justify-center space-x-2"
          >
            <MessageCircle className="w-5 h-5" />
            <span>Threadsを接続する</span>
          </button>

          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-gray-100 text-gray-700 py-2 px-6 rounded-lg hover:bg-gray-200"
          >
            後で設定する
          </button>
        </div>
      </div>
    </div>
  );
};