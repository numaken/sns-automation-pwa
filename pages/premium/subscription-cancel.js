import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const SubscriptionCancel = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userPlan, setUserPlan] = useState('free');
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);

  useEffect(() => {
    // ユーザープラン確認
    const plan = localStorage.getItem('userPlan') || 'free';
    setUserPlan(plan);

    if (plan !== 'premium') {
      router.push('/');
      return;
    }

    // サブスクリプション情報取得
    fetchSubscriptionInfo();
  }, []);

  const fetchSubscriptionInfo = async () => {
    try {
      const userId = localStorage.getItem('sns_automation_user_id');
      const response = await fetch(`/api/check-user-plan?userId=${userId}`);
      const data = await response.json();
      setSubscriptionInfo(data);
    } catch (error) {
      console.error('Failed to fetch subscription info:', error);
    }
  };

  const handleCancelSubscription = async () => {
    const confirmMessage = `本当にプレミアムプランを解約しますか？

解約すると以下の機能が使用できなくなります：
- 無制限AI投稿生成
- Twitter/Threads自動投稿
- 高速生成機能
- 広告なしの体験

解約後は1日3回制限の無料プランに戻ります。`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setLoading(true);
    try {
      const userId = localStorage.getItem('sns_automation_user_id');
      const response = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // ローカルストレージ更新
        localStorage.setItem('userPlan', 'free');
        localStorage.removeItem('subscriptionId');

        alert('プレミアムプランを解約しました。ご利用ありがとうございました。');
        router.push('/');
      } else {
        alert(`解約処理でエラーが発生しました: ${result.error || '不明なエラー'}`);
      }
    } catch (error) {
      console.error('Cancellation error:', error);
      alert('解約処理に失敗しました。サポートにお問い合わせください。');
    } finally {
      setLoading(false);
    }
  };

  if (userPlan !== 'premium') {
    return <div>アクセス権限がありません</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.warningIcon}>⚠️</div>
        <h1 style={styles.title}>プレミアムプラン解約</h1>

        <div style={styles.currentPlan}>
          <h3>👑 現在のプラン: プレミアム</h3>
          <p>月額 ¥980</p>
          {subscriptionInfo && (
            <p>次回請求日: {new Date(subscriptionInfo.next_billing_date).toLocaleDateString('ja-JP')}</p>
          )}
        </div>

        <div style={styles.lossWarning}>
          <h3>🚫 解約すると失われる機能</h3>
          <ul style={styles.featureList}>
            <li>🚀 無制限AI投稿生成</li>
            <li>📱 Twitter/Threads自動投稿</li>
            <li>⚡ 高速生成機能</li>
            <li>🎯 広告なしの体験</li>
            <li>📊 詳細統計情報</li>
          </ul>
        </div>

        <div style={styles.freeFeatures}>
          <h3>🆓 解約後の無料プラン</h3>
          <ul style={styles.featureList}>
            <li>📝 1日3回のAI投稿生成</li>
            <li>✨ 高品質な投稿作成</li>
            <li>🎨 複数のトーン設定</li>
          </ul>
        </div>

        <div style={styles.buttons}>
          <button
            onClick={handleCancelSubscription}
            disabled={loading}
            style={{
              ...styles.cancelButton,
              opacity: loading ? 0.5 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? '解約処理中...' : 'プレミアムプランを解約する'}
          </button>

          <button
            onClick={() => router.push('/')}
            style={styles.keepButton}
          >
            プレミアムプランを継続する
          </button>
        </div>

        <div style={styles.support}>
          <p style={styles.supportText}>
            解約に関するご質問は
            <a href="mailto:numaken@gmail.com" style={styles.emailLink}>
              numaken@gmail.com
            </a>
            までお問い合わせください
          </p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    padding: '20px'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '40px',
    maxWidth: '600px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  warningIcon: {
    fontSize: '64px',
    marginBottom: '20px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '20px',
    color: '#dc2626'
  },
  currentPlan: {
    backgroundColor: '#fef3c7',
    padding: '20px',
    borderRadius: '8px',
    margin: '20px 0',
    border: '2px solid #f59e0b'
  },
  lossWarning: {
    backgroundColor: '#fee2e2',
    padding: '20px',
    borderRadius: '8px',
    margin: '20px 0',
    textAlign: 'left',
    border: '2px solid #dc2626'
  },
  freeFeatures: {
    backgroundColor: '#dbeafe',
    padding: '20px',
    borderRadius: '8px',
    margin: '20px 0',
    textAlign: 'left'
  },
  featureList: {
    listStyle: 'none',
    padding: 0,
    margin: '10px 0'
  },
  buttons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    marginTop: '30px'
  },
  cancelButton: {
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    padding: '15px 30px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold'
  },
  keepButton: {
    backgroundColor: '#059669',
    color: 'white',
    border: 'none',
    padding: '15px 30px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold'
  },
  support: {
    marginTop: '30px',
    paddingTop: '20px',
    borderTop: '1px solid #e5e7eb'
  },
  supportText: {
    fontSize: '14px',
    color: '#6b7280'
  },
  emailLink: {
    color: '#3b82f6',
    textDecoration: 'none'
  }
};

export default SubscriptionCancel;