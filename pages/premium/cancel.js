// pages/premium/cancel.js - 決済キャンセルページ
import { useRouter } from 'next/router';

export default function PremiumCancel() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        <div className="text-6xl mb-4">😔</div>
        <h1 className="text-2xl font-bold text-gray-600 mb-4">
          決済がキャンセルされました
        </h1>
        <p className="text-gray-500 mb-6">
          プレミアムプランの購入がキャンセルされました。<br />
          無料プランは引き続きご利用いただけます。
        </p>

        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h2 className="font-semibold text-blue-800 mb-2">無料プランでできること:</h2>
          <ul className="text-sm text-blue-700 text-left">
            <li>• 1日3回のAI投稿生成</li>
            <li>• 高品質な投稿作成</li>
            <li>• 複数のトーン設定</li>
            <li>• プレミアム体験</li>
          </ul>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors w-full"
          >
            無料プランを続ける
          </button>

          <button
            onClick={() => router.push('/premium')}
            className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors w-full"
          >
            プレミアムを再検討
          </button>
        </div>
      </div>
    </div>
  );
}