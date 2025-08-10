// src/components/SubscriptionManager.jsx - サブスクリプション管理UI

import React, { useState, useEffect } from 'react';
import { Crown, Calendar, AlertTriangle, CheckCircle, XCircle, RefreshCw, Settings } from 'lucide-react';

const SubscriptionManager = ({ userId, onPlanChange }) => {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (userId) {
      fetchSubscriptionStatus();
    }
  }, [userId]);

  const fetchSubscriptionStatus = async () => {
    try {
      setLoading(true);
      setError('');

      // 既存のローカルストレージシステムと統合
      const userPlan = localStorage.getItem('userPlan') || 'free';

      if (userPlan === 'free') {
        setSubscription({ plan: 'free', subscription: null });
        setLoading(false);
        return;
      }

      // プレミアムプランの場合、詳細情報を構築
      const subscriptionData = {
        plan: 'premium',
        subscription: {
          id: localStorage.getItem('stripeSessionId') || localStorage.getItem('checkoutSessionId'),
          status: 'active',
          current_period_start: Math.floor(new Date(localStorage.getItem('premiumActivatedAt') || Date.now()).getTime() / 1000),
          current_period_end: Math.floor((new Date(localStorage.getItem('premiumActivatedAt') || Date.now()).getTime() + 30 * 24 * 60 * 60 * 1000) / 1000), // 30日後
          cancel_at_period_end: false,
          canceled_at: null,
          plan: {
            amount: 980,
            currency: 'jpy',
            interval: 'month'
          }
        }
      };

      setSubscription(subscriptionData);

    } catch (error) {
      console.error('Fetch subscription status error:', error);
      setError('サブスクリプション情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };


  const handleCancel = async (cancelType = 'at_period_end') => {
    try {
      setActionLoading(true);
      setError('');
      setSuccess('');

      if (cancelType === 'immediately') {
        // 即座解約：ローカルストレージをクリア
        const keysToRemove = [
          'userPlan', 'user_plan', 'plan', 'subscriptionStatus',
          'premiumActivatedAt', 'stripeSessionId', 'checkoutSessionId',
          'authToken', 'premiumToken'
        ];

        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
        });

        // 無料プランに設定
        localStorage.setItem('userPlan', 'free');

        setSuccess('プレミアムプランを解約しました。無料プランに戻りました。');
        if (onPlanChange) onPlanChange('free');

      } else {
        // 期間終了時解約：解約予定フラグを設定
        localStorage.setItem('cancelAtPeriodEnd', 'true');
        localStorage.setItem('cancelScheduledAt', new Date().toISOString());

        setSuccess('期間終了時に解約予定として設定されました。現在の期間中は引き続きプレミアム機能をご利用いただけます。');
      }

      setShowCancelConfirm(false);
      await fetchSubscriptionStatus();

    } catch (error) {
      console.error('Cancel subscription error:', error);
      setError('解約処理でエラーが発生しました');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async () => {
    try {
      setActionLoading(true);
      setError('');
      setSuccess('');

      // 解約予定をキャンセル
      localStorage.removeItem('cancelAtPeriodEnd');
      localStorage.removeItem('cancelScheduledAt');

      setSuccess('サブスクリプションが再開されました。引き続きプレミアム機能をご利用いただけます。');
      await fetchSubscriptionStatus();

    } catch (error) {
      console.error('Reactivate subscription error:', error);
      setError('再開処理でエラーが発生しました');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center">
          <RefreshCw className="animate-spin h-5 w-5 mr-2" />
          サブスクリプション情報を読み込み中...
        </div>
      </div>
    );
  }

  if (subscription?.plan === 'free') {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Settings className="h-5 w-5 mr-2" />
          サブスクリプション管理
        </h3>
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🆓</div>
          <h4 className="text-xl font-semibold mb-2">無料プランをご利用中</h4>
          <p className="text-gray-600 mb-6">
            1日3回まで高品質AI投稿生成をお楽しみいただけます。<br />
            より多くの機能をお求めの場合は、プレミアムプランをご検討ください。
          </p>

          <div className="bg-yellow-50 rounded-lg p-4 mb-6">
            <h5 className="font-semibold text-yellow-800 mb-2">🚀 プレミアムプランの特典</h5>
            <ul className="text-sm text-yellow-700 text-left space-y-1">
              <li>• 無制限AI投稿生成</li>
              <li>• Twitter・Threads自動投稿</li>
              <li>• 高速生成・広告なし</li>
              <li>• 優先サポート</li>
            </ul>
          </div>

          <button
            onClick={() => {
              // 既存のアップグレード処理を呼び出し
              const upgradeButton = document.querySelector('.upgrade-button');
              if (upgradeButton) {
                upgradeButton.click();
              } else {
                // フォールバック：既存のupgradeToPremium関数を探して実行
                if (window.upgradeToPremium) {
                  window.upgradeToPremium();
                } else {
                  alert('アップグレード機能を初期化中です。少し待ってからもう一度お試しください。');
                }
              }
            }}
            className="bg-yellow-500 text-white px-6 py-3 rounded-lg hover:bg-yellow-600 transition-colors"
          >
            <Crown className="h-4 w-4 inline mr-2" />
            プレミアムプランにアップグレード（¥980/月）
          </button>
        </div>
      </div>
    );
  }



  // プレミアムプランの場合
  const cancelAtPeriodEnd = localStorage.getItem('cancelAtPeriodEnd') === 'true';

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Crown className="h-5 w-5 mr-2 text-yellow-500" />
        プレミアム サブスクリプション管理
      </h3>

      {/* ステータス表示 */}
      <div className="mb-6">
        <div className="flex items-center mb-2">
          {!cancelAtPeriodEnd ? (
            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
          )}
          <span className="font-medium">
            ステータス: {!cancelAtPeriodEnd ? 'アクティブ' : '解約予定'}
          </span>
        </div>

        {cancelAtPeriodEnd && (
          <div className="flex items-center text-orange-600 mb-2">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <span className="text-sm">
              {formatDate(subscription.subscription?.current_period_end)}に解約予定
            </span>
          </div>
        )}

        <div className="text-sm text-gray-600 space-y-1">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            開始日: {formatDate(subscription.subscription?.current_period_start)}
          </div>
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            次回更新日: {formatDate(subscription.subscription?.current_period_end)}
          </div>
          <div>
            月額: ¥980（税込）
          </div>
        </div>
      </div>

      {/* エラー・成功メッセージ */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      {/* アクションボタン */}
      <div className="space-y-3">
        {cancelAtPeriodEnd ? (
          // 解約予約中の場合
          <button
            onClick={handleReactivate}
            disabled={actionLoading}
            className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            {actionLoading ? (
              <RefreshCw className="animate-spin h-4 w-4 inline mr-2" />
            ) : (
              <CheckCircle className="h-4 w-4 inline mr-2" />
            )}
            サブスクリプションを再開
          </button>
        ) : (
          // アクティブな場合
          <button
            onClick={() => setShowCancelConfirm(true)}
            disabled={actionLoading}
            className="w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            <XCircle className="h-4 w-4 inline mr-2" />
            サブスクリプションを解約
          </button>
        )}

        <button
          onClick={fetchSubscriptionStatus}
          disabled={actionLoading}
          className="w-full bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className="h-4 w-4 inline mr-2" />
          ステータスを更新
        </button>
      </div>

      {/* 解約確認モーダル */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h4 className="text-lg font-semibold mb-4">サブスクリプション解約</h4>
            <p className="text-gray-600 mb-6">
              解約のタイミングを選択してください。
            </p>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => handleCancel('at_period_end')}
                disabled={actionLoading}
                className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors text-left"
              >
                <div className="font-medium">期間終了時に解約</div>
                <div className="text-sm opacity-90">
                  {formatDate(subscription.subscription?.current_period_end)}まで利用可能
                </div>
              </button>

              <button
                onClick={() => handleCancel('immediately')}
                disabled={actionLoading}
                className="w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors text-left"
              >
                <div className="font-medium">即座に解約</div>
                <div className="text-sm opacity-90">すぐに無料プランに戻ります</div>
              </button>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                disabled={actionLoading}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionManager;