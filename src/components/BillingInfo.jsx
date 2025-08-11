import React, { useState, useEffect } from 'react';
import { CheckCircle, Calendar, CreditCard, TrendingUp, Settings, AlertCircle } from 'lucide-react';

const BillingInfo = () => {
  const [userPlan, setUserPlan] = useState('free');
  const [usageStats, setUsageStats] = useState({
    aiGenerations: 156,
    snsDeployments: 89,
    monthlyGenerations: 42
  });
  const [subscriptionStatus, setSubscriptionStatus] = useState('active');

  useEffect(() => {
    // プラン情報を取得
    const plan = localStorage.getItem('userPlan') || 'free';
    setUserPlan(plan);

    // 利用統計を取得（実際はAPIから）
    fetchUsageStats();
  }, []);

  const fetchUsageStats = async () => {
    try {
      // 実装例：管理者APIから統計取得
      const response = await fetch('/api/admin/user-stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('userToken')}`
        }
      });

      if (response.ok) {
        const stats = await response.json();
        setUsageStats(stats);
      }
    } catch (error) {
      console.log('統計取得エラー:', error);
      // デフォルト値を使用
    }
  };

  const handleUpgrade = () => {
    window.location.href = '/#upgrade';
  };

  const handleManageSubscription = () => {
    // Stripe Customer Portalへのリダイレクト
    window.open('https://billing.stripe.com/p/login/test_aEU6qugfCbXo2GY144', '_blank');
  };

  const handleCancelSubscription = () => {
    if (confirm('プレミアムプランを解約しますか？\n\n解約後は無料プラン（1日3回生成）に戻ります。')) {
      // 解約処理実装
      cancelSubscription();
    }
  };

  const cancelSubscription = async () => {
    try {
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('userToken')}`
        }
      });

      if (response.ok) {
        alert('解約手続きが完了しました。次回更新日まではプレミアム機能をご利用いただけます。');
        setSubscriptionStatus('cancelled');
      } else {
        alert('解約処理中にエラーが発生しました。サポートにお問い合わせください。');
      }
    } catch (error) {
      console.error('解約エラー:', error);
      alert('解約処理中にエラーが発生しました。サポートにお問い合わせください。');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* ヘッダー */}
        <div className="border-b border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <CreditCard className="w-6 h-6 mr-2 text-blue-600" />
            📄 契約情報
          </h1>
          <p className="text-gray-600 mt-1">
            プラン詳細と利用状況をご確認いただけます
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* プランステータス */}
          <div className={`rounded-lg p-6 ${userPlan === 'premium'
              ? 'bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200'
              : 'bg-gray-50 border border-gray-200'
            }`}>
            <div className="flex items-center justify-between">
              <div>
                {userPlan === 'premium' ? (
                  <>
                    <span className="inline-block bg-purple-500 text-white px-4 py-2 rounded-full text-sm font-medium">
                      💎 PREMIUM MEMBER
                    </span>
                    <p className="text-sm text-gray-600 mt-2 flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      有効期限: 2025年9月12日
                      {subscriptionStatus === 'cancelled' && (
                        <span className="ml-2 text-red-600 text-xs">(解約済み)</span>
                      )}
                    </p>
                  </>
                ) : (
                  <>
                    <span className="inline-block bg-gray-500 text-white px-4 py-2 rounded-full text-sm font-medium">
                      🆓 FREE PLAN
                    </span>
                    <p className="text-sm text-gray-600 mt-2">
                      1日3回まで無料でAI生成をご利用いただけます
                    </p>
                  </>
                )}
              </div>
              <div className="text-right">
                {userPlan === 'premium' ? (
                  <CheckCircle className="w-10 h-10 text-green-500" />
                ) : (
                  <AlertCircle className="w-10 h-10 text-gray-400" />
                )}
              </div>
            </div>
          </div>

          {/* 利用状況統計 */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              利用状況
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900">AI投稿生成</h3>
                <p className="text-2xl font-bold text-blue-600">{usageStats.aiGenerations}回</p>
                <p className="text-sm text-gray-600">
                  今月（{userPlan === 'premium' ? '無制限' : '最大93回'}）
                </p>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900">SNS投稿</h3>
                <p className="text-2xl font-bold text-purple-600">{usageStats.snsDeployments}回</p>
                <p className="text-sm text-gray-600">
                  今月（{userPlan === 'premium' ? '無制限' : 'プレミアム限定'}）
                </p>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900">月間平均</h3>
                <p className="text-2xl font-bold text-green-600">{usageStats.monthlyGenerations}回</p>
                <p className="text-sm text-gray-600">1日あたり生成数</p>
              </div>
            </div>
          </div>

          {/* 機能比較表 */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">機能比較</h2>

            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">機能</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">無料プラン</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">プレミアムプラン</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900">AI投稿生成</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">1日3回まで</td>
                    <td className="px-4 py-3 text-center text-sm text-green-600 font-medium">無制限</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">SNS自動投稿</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-400">利用不可</td>
                    <td className="px-4 py-3 text-center text-sm text-green-600 font-medium">利用可能</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900">投稿品質</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">高品質（85点）</td>
                    <td className="px-4 py-3 text-center text-sm text-green-600 font-medium">最高品質（95点）</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">優先サポート</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-400">なし</td>
                    <td className="px-4 py-3 text-center text-sm text-green-600 font-medium">あり</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="border-t border-gray-200 pt-6">
            <div className="space-y-3">
              {userPlan === 'free' ? (
                <button
                  onClick={handleUpgrade}
                  className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  プレミアムにアップグレード（¥980/月）
                </button>
              ) : (
                <>
                  <button
                    onClick={handleManageSubscription}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <Settings className="w-4 h-4 inline mr-2" />
                    プラン管理・請求履歴
                  </button>

                  {subscriptionStatus === 'active' && (
                    <button
                      onClick={handleCancelSubscription}
                      className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                      プレミアムプランを解約
                    </button>
                  )}
                </>
              )}

              <button
                onClick={() => window.location.href = '/settings'}
                className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
              >
                アカウント設定に戻る
              </button>
            </div>
          </div>

          {/* サポート情報 */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">📞 サポート情報</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• プラン変更・解約に関するご質問: support@sns-automation.com</p>
              <p>• 技術的なお問い合わせ: tech@sns-automation.com</p>
              <p>• 営業時間: 平日 9:00-18:00</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingInfo;