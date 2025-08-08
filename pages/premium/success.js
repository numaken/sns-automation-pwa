// pages/premium/success.js - 決済成功ページ
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function PremiumSuccess() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState('');

  useEffect(() => {
    if (router.query.session_id) {
      setSessionId(router.query.session_id);
    }
  }, [router.query]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-green-600 mb-4">
          プレミアムプラン開始！
        </h1>
        <p className="text-gray-600 mb-6">
          ご購入ありがとうございます！<br />
          無制限AI投稿生成とSNS自動投稿をお楽しみください。
        </p>

        <div className="bg-green-50 p-4 rounded-lg mb-6">
          <h2 className="font-semibold text-green-800 mb-2">利用可能な機能:</h2>
          <ul className="text-sm text-green-700 text-left">
            <li>• 無制限AI投稿生成</li>
            <li>• Twitter自動投稿</li>
            <li>• Threads自動投稿</li>
            <li>• 高速生成処理</li>
            <li>• 広告なし</li>
          </ul>
        </div>

        <button
          onClick={() => router.push('/')}
          className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors w-full"
        >
          ツールを使い始める
        </button>

        {sessionId && (
          <p className="text-xs text-gray-400 mt-4">
            Session: {sessionId.substring(0, 20)}...
          </p>
        )}
      </div>
    </div>
  );
}
