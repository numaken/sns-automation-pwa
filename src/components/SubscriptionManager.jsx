// src/components/SubscriptionManager.jsx - インラインスタイル版（緊急対処）

import React, { useState, useEffect } from 'react';
import { Crown, Calendar, AlertTriangle, CheckCircle, XCircle, RefreshCw, Settings } from 'lucide-react';

const SubscriptionManager = ({ userId, onPlanChange }) => {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 🎨 インラインスタイル定義
  const styles = {
    container: {
      maxWidth: '600px',
      margin: '0 auto',
      padding: '1rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
    },
    card: {
      background: 'white',
      borderRadius: '1rem',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      overflow: 'hidden',
      border: '2px solid #e5e7eb'
    },
    cardPremium: {
      background: 'linear-gradient(135deg, #fefce8 0%, #ffffff 100%)',
      border: '2px solid #fbbf24'
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '1.5rem 1.5rem 1rem',
      borderBottom: '1px solid #f3f4f6'
    },
    headerPremium: {
      background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
      color: 'white',
      borderBottom: 'none'
    },
    headerIcon: {
      width: '1.5rem',
      height: '1.5rem',
      color: '#6b7280'
    },
    headerIconPremium: {
      color: '#fef3c7'
    },
    headerTitle: {
      margin: 0,
      fontSize: '1.25rem',
      fontWeight: 600,
      color: '#1f2937'
    },
    headerTitlePremium: {
      color: 'white'
    },
    planStatus: {
      textAlign: 'center',
      padding: '2rem 1.5rem 1.5rem'
    },
    planIcon: {
      fontSize: '4rem',
      marginBottom: '1rem'
    },
    planTitle: {
      margin: '0 0 1rem',
      fontSize: '1.5rem',
      fontWeight: 600,
      color: '#1f2937'
    },
    planDescription: {
      margin: '0 0 1.5rem',
      color: '#6b7280',
      lineHeight: 1.6
    },
    featuresContainer: {
      padding: '0 1.5rem 1.5rem'
    },
    featuresTitle: {
      margin: '0 0 1rem',
      fontSize: '1.125rem',
      fontWeight: 600,
      color: '#f59e0b',
      textAlign: 'center'
    },
    featuresGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '0.75rem',
      marginBottom: '1.5rem'
    },
    featureItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.75rem',
      background: '#fef3c7',
      borderRadius: '0.5rem',
      fontSize: '0.875rem',
      color: '#92400e'
    },
    featureIcon: {
      width: '1rem',
      height: '1rem',
      flexShrink: 0
    },
    pricingSection: {
      textAlign: 'center',
      padding: '0 1.5rem 1.5rem'
    },
    priceDisplay: {
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'center',
      gap: '0.25rem',
      marginBottom: '0.5rem'
    },
    price: {
      fontSize: '2.5rem',
      fontWeight: 700,
      color: '#1f2937'
    },
    period: {
      fontSize: '1.125rem',
      color: '#6b7280'
    },
    pricingNote: {
      margin: 0,
      fontSize: '0.875rem',
      color: '#6b7280'
    },
    statusSection: {
      padding: '1.5rem'
    },
    statusMain: {
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      marginBottom: '1rem'
    },
    statusIcon: {
      width: '1.5rem',
      height: '1.5rem'
    },
    statusIconSuccess: {
      color: '#10b981'
    },
    statusIconWarning: {
      color: '#f59e0b'
    },
    statusText: {
      display: 'flex',
      flexDirection: 'column'
    },
    statusLabel: {
      fontSize: '0.875rem',
      color: '#6b7280',
      marginBottom: '0.25rem'
    },
    statusValue: {
      fontSize: '1.125rem',
      fontWeight: 600,
      color: '#1f2937'
    },
    cancelNotice: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.75rem',
      background: '#fef3c7',
      borderRadius: '0.5rem',
      color: '#92400e',
      fontSize: '0.875rem'
    },
    noticeIcon: {
      width: '1rem',
      height: '1rem'
    },
    billingSection: {
      padding: '0 1.5rem 1.5rem'
    },
    billingTitle: {
      margin: '0 0 1rem',
      fontSize: '1.125rem',
      fontWeight: 600,
      color: '#1f2937'
    },
    billingDetails: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem'
    },
    billingItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.75rem',
      background: '#f9fafb',
      borderRadius: '0.5rem'
    },
    billingIcon: {
      width: '1.25rem',
      height: '1.25rem',
      color: '#6b7280'
    },
    billingInfo: {
      display: 'flex',
      flexDirection: 'column'
    },
    billingLabel: {
      fontSize: '0.875rem',
      color: '#6b7280',
      marginBottom: '0.25rem'
    },
    billingValue: {
      fontSize: '1rem',
      fontWeight: 500,
      color: '#1f2937'
    },
    messageSection: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.75rem 1.5rem',
      margin: '0 1.5rem 1.5rem',
      borderRadius: '0.5rem',
      fontSize: '0.875rem'
    },
    messageError: {
      background: '#fef2f2',
      border: '1px solid #fecaca',
      color: '#dc2626'
    },
    messageSuccess: {
      background: '#f0fdf4',
      border: '1px solid #bbf7d0',
      color: '#16a34a'
    },
    messageIcon: {
      width: '1.25rem',
      height: '1.25rem'
    },
    actionsSection: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      padding: '0 1.5rem 1.5rem'
    },
    actionButton: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      padding: '0.75rem 1.5rem',
      border: 'none',
      borderRadius: '0.5rem',
      fontSize: '0.875rem',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    buttonPrimary: {
      background: '#10b981',
      color: 'white'
    },
    buttonDanger: {
      background: '#dc2626',
      color: 'white'
    },
    buttonSecondary: {
      background: '#6b7280',
      color: 'white'
    },
    buttonDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed'
    },
    loadingSection: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      color: '#6b7280'
    },
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    },
    modalContent: {
      background: 'white',
      borderRadius: '1rem',
      maxWidth: '500px',
      width: '100%',
      maxHeight: '90vh',
      overflowY: 'auto',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
    },
    modalHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '1.5rem 1.5rem 1rem',
      borderBottom: '1px solid #f3f4f6'
    },
    modalTitle: {
      margin: 0,
      fontSize: '1.25rem',
      fontWeight: 600,
      color: '#1f2937'
    },
    modalClose: {
      background: 'none',
      border: 'none',
      fontSize: '1.5rem',
      color: '#6b7280',
      cursor: 'pointer',
      padding: '0.25rem',
      lineHeight: 1
    },
    modalBody: {
      padding: '1rem 1.5rem'
    },
    modalText: {
      margin: '0 0 1.5rem',
      color: '#6b7280'
    },
    cancelOptions: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    },
    cancelOption: {
      display: 'block',
      width: '100%',
      textAlign: 'left',
      padding: '1rem',
      border: '2px solid #e5e7eb',
      borderRadius: '0.5rem',
      background: 'white',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    cancelOptionRecommended: {
      borderColor: '#10b981',
      background: '#f0fdf4'
    },
    cancelOptionImmediate: {
      borderColor: '#dc2626',
      background: '#fef2f2'
    },
    optionHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '0.5rem'
    },
    optionTitle: {
      fontWeight: 600,
      color: '#1f2937'
    },
    optionBadge: {
      padding: '0.25rem 0.5rem',
      background: '#10b981',
      color: 'white',
      borderRadius: '0.25rem',
      fontSize: '0.75rem',
      fontWeight: 500
    },
    optionDescription: {
      fontSize: '0.875rem',
      color: '#6b7280',
      lineHeight: 1.5
    },
    modalFooter: {
      padding: '1rem 1.5rem 1.5rem',
      borderTop: '1px solid #f3f4f6'
    },
    upgradeButton: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      width: '100%',
      padding: '1rem 1.5rem',
      background: '#fbbf24',
      color: '#92400e',
      border: 'none',
      borderRadius: '0.5rem',
      fontSize: '0.875rem',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    }
  };

  useEffect(() => {
    if (userId) {
      fetchSubscriptionStatus();
    }
  }, [userId]);

  const fetchSubscriptionStatus = async () => {
    try {
      setLoading(true);
      setError('');

      const userPlan = localStorage.getItem('userPlan') || 'free';

      if (userPlan === 'free') {
        setSubscription({ plan: 'free', subscription: null });
        setLoading(false);
        return;
      }

      const subscriptionData = {
        plan: 'premium',
        subscription: {
          id: localStorage.getItem('stripeSessionId') || localStorage.getItem('checkoutSessionId'),
          status: 'active',
          current_period_start: Math.floor(new Date(localStorage.getItem('premiumActivatedAt') || Date.now()).getTime() / 1000),
          current_period_end: Math.floor((new Date(localStorage.getItem('premiumActivatedAt') || Date.now()).getTime() + 30 * 24 * 60 * 60 * 1000) / 1000),
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
        const keysToRemove = [
          'userPlan', 'user_plan', 'plan', 'subscriptionStatus',
          'premiumActivatedAt', 'stripeSessionId', 'checkoutSessionId',
          'authToken', 'premiumToken'
        ];

        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
        });

        localStorage.setItem('userPlan', 'free');
        setSuccess('プレミアムプランを解約しました。無料プランに戻りました。');
        if (onPlanChange) onPlanChange('free');

      } else {
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

  const handleUpgrade = () => {
    const upgradeButton = document.querySelector('.upgrade-button');
    if (upgradeButton) {
      upgradeButton.click();
    } else if (window.upgradeToPremium) {
      window.upgradeToPremium();
    } else {
      alert('アップグレード機能を初期化中です。少し待ってからもう一度お試しください。');
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.card, ...styles.loadingSection }}>
          <RefreshCw style={{ animation: 'spin 1s linear infinite', marginRight: '0.5rem' }} />
          サブスクリプション情報を読み込み中...
        </div>
      </div>
    );
  }

  if (subscription?.plan === 'free') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.header}>
            <Settings style={styles.headerIcon} />
            <h3 style={styles.headerTitle}>サブスクリプション管理</h3>
          </div>

          <div style={styles.planStatus}>
            <div style={styles.planIcon}>🆓</div>
            <h4 style={styles.planTitle}>無料プランをご利用中</h4>
            <p style={styles.planDescription}>
              1日3回まで高品質AI投稿生成をお楽しみいただけます。<br />
              より多くの機能をお求めの場合は、プレミアムプランをご検討ください。
            </p>
          </div>

          <div style={styles.featuresContainer}>
            <h5 style={styles.featuresTitle}>🚀 プレミアムプランの特典</h5>
            <div style={styles.featuresGrid}>
              <div style={styles.featureItem}>
                <Crown style={styles.featureIcon} />
                無制限AI投稿生成
              </div>
              <div style={styles.featureItem}>
                <CheckCircle style={styles.featureIcon} />
                Twitter・Threads自動投稿
              </div>
              <div style={styles.featureItem}>
                <RefreshCw style={styles.featureIcon} />
                高速生成・広告なし
              </div>
              <div style={styles.featureItem}>
                <Settings style={styles.featureIcon} />
                優先サポート
              </div>
            </div>
          </div>

          <div style={styles.pricingSection}>
            <div style={styles.priceDisplay}>
              <span style={styles.price}>¥980</span>
              <span style={styles.period}>/月</span>
            </div>
            <p style={styles.pricingNote}>いつでも解約可能</p>
          </div>

          <div style={styles.actionsSection}>
            <button
              onClick={handleUpgrade}
              style={{ ...styles.upgradeButton }}
            >
              <Crown style={{ width: '1rem', height: '1rem' }} />
              プレミアムプランにアップグレード
            </button>
          </div>
        </div>
      </div>
    );
  }

  // プレミアムプランの場合
  const cancelAtPeriodEnd = localStorage.getItem('cancelAtPeriodEnd') === 'true';

  return (
    <div style={styles.container}>
      <div style={{ ...styles.card, ...styles.cardPremium }}>
        <div style={{ ...styles.header, ...styles.headerPremium }}>
          <Crown style={{ ...styles.headerIcon, ...styles.headerIconPremium }} />
          <h3 style={{ ...styles.headerTitle, ...styles.headerTitlePremium }}>
            プレミアム サブスクリプション管理
          </h3>
        </div>

        {/* ステータス表示 */}
        <div style={styles.statusSection}>
          <div style={styles.statusMain}>
            {!cancelAtPeriodEnd ? (
              <CheckCircle style={{ ...styles.statusIcon, ...styles.statusIconSuccess }} />
            ) : (
              <AlertTriangle style={{ ...styles.statusIcon, ...styles.statusIconWarning }} />
            )}
            <div style={styles.statusText}>
              <span style={styles.statusLabel}>ステータス</span>
              <span style={styles.statusValue}>
                {!cancelAtPeriodEnd ? 'アクティブ' : '解約予定'}
              </span>
            </div>
          </div>

          {cancelAtPeriodEnd && (
            <div style={styles.cancelNotice}>
              <AlertTriangle style={styles.noticeIcon} />
              <span>
                {formatDate(subscription.subscription?.current_period_end)}に解約予定
              </span>
            </div>
          )}
        </div>

        {/* 請求情報 */}
        <div style={styles.billingSection}>
          <h4 style={styles.billingTitle}>請求情報</h4>
          <div style={styles.billingDetails}>
            <div style={styles.billingItem}>
              <Calendar style={styles.billingIcon} />
              <div style={styles.billingInfo}>
                <span style={styles.billingLabel}>開始日</span>
                <span style={styles.billingValue}>
                  {formatDate(subscription.subscription?.current_period_start)}
                </span>
              </div>
            </div>
            <div style={styles.billingItem}>
              <Calendar style={styles.billingIcon} />
              <div style={styles.billingInfo}>
                <span style={styles.billingLabel}>次回更新日</span>
                <span style={styles.billingValue}>
                  {formatDate(subscription.subscription?.current_period_end)}
                </span>
              </div>
            </div>
            <div style={styles.billingItem}>
              <Crown style={styles.billingIcon} />
              <div style={styles.billingInfo}>
                <span style={styles.billingLabel}>月額料金</span>
                <span style={styles.billingValue}>¥980（税込）</span>
              </div>
            </div>
          </div>
        </div>

        {/* エラー・成功メッセージ */}
        {error && (
          <div style={{ ...styles.messageSection, ...styles.messageError }}>
            <XCircle style={styles.messageIcon} />
            {error}
          </div>
        )}

        {success && (
          <div style={{ ...styles.messageSection, ...styles.messageSuccess }}>
            <CheckCircle style={styles.messageIcon} />
            {success}
          </div>
        )}

        {/* アクションボタン */}
        <div style={styles.actionsSection}>
          {cancelAtPeriodEnd ? (
            <button
              onClick={handleReactivate}
              disabled={actionLoading}
              style={{
                ...styles.actionButton,
                ...styles.buttonPrimary,
                ...(actionLoading ? styles.buttonDisabled : {})
              }}
            >
              {actionLoading ? (
                <RefreshCw style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite' }} />
              ) : (
                <CheckCircle style={{ width: '1rem', height: '1rem' }} />
              )}
              サブスクリプションを再開
            </button>
          ) : (
            <button
              onClick={() => setShowCancelConfirm(true)}
              disabled={actionLoading}
              style={{
                ...styles.actionButton,
                ...styles.buttonDanger,
                ...(actionLoading ? styles.buttonDisabled : {})
              }}
            >
              <XCircle style={{ width: '1rem', height: '1rem' }} />
              サブスクリプションを解約
            </button>
          )}

          <button
            onClick={fetchSubscriptionStatus}
            disabled={actionLoading}
            style={{
              ...styles.actionButton,
              ...styles.buttonSecondary,
              ...(actionLoading ? styles.buttonDisabled : {})
            }}
          >
            <RefreshCw style={{ width: '1rem', height: '1rem' }} />
            ステータスを更新
          </button>
        </div>

        {/* 解約確認モーダル */}
        {showCancelConfirm && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <div style={styles.modalHeader}>
                <h4 style={styles.modalTitle}>サブスクリプション解約</h4>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  style={styles.modalClose}
                >
                  ×
                </button>
              </div>

              <div style={styles.modalBody}>
                <p style={styles.modalText}>
                  解約のタイミングを選択してください。
                </p>

                <div style={styles.cancelOptions}>
                  <button
                    onClick={() => handleCancel('at_period_end')}
                    disabled={actionLoading}
                    style={{
                      ...styles.cancelOption,
                      ...styles.cancelOptionRecommended
                    }}
                  >
                    <div style={styles.optionHeader}>
                      <span style={styles.optionTitle}>期間終了時に解約</span>
                      <span style={styles.optionBadge}>推奨</span>
                    </div>
                    <div style={styles.optionDescription}>
                      {formatDate(subscription.subscription?.current_period_end)}まで利用可能
                    </div>
                  </button>

                  <button
                    onClick={() => handleCancel('immediately')}
                    disabled={actionLoading}
                    style={{
                      ...styles.cancelOption,
                      ...styles.cancelOptionImmediate
                    }}
                  >
                    <div style={styles.optionHeader}>
                      <span style={styles.optionTitle}>即座に解約</span>
                    </div>
                    <div style={styles.optionDescription}>
                      すぐに無料プランに戻ります
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionManager;