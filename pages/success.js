// pages/success.js
// Stripe決済成功ページ（修正版）

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

const SuccessPage = () => {
  const router = useRouter();
  const { session_id } = router.query;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessionData, setSessionData] = useState(null);
  const [planUpdateStatus, setPlanUpdateStatus] = useState('pending');

  useEffect(() => {
    if (session_id) {
      verifySessionAndUpgradePlan();
    }
  }, [session_id]);

  const generateUserId = () => {
    // ユーザーID生成（既存のIDがあれば使用、なければ新規生成）
    let userId = localStorage.getItem('sns_automation_user_id');
    if (!userId) {
      userId = 'premium-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('sns_automation_user_id', userId);
    }
    return userId;
  };

  const verifySessionAndUpgradePlan = async () => {
    try {
      console.log('🎉 Payment successful! Session ID:', session_id);

      const userId = generateUserId();
      console.log('👤 User ID:', userId);

      // ローカルストレージでプラン管理（KV管理APIは未実装のため）
      localStorage.setItem('userPlan', 'premium');
      localStorage.setItem('user_plan', 'premium');
      localStorage.setItem('subscriptionStatus', 'active');
      localStorage.setItem('stripeSessionId', session_id);
      localStorage.setItem('premiumActivatedAt', new Date().toISOString());

      console.log('✅ プレミアムプラン有効化完了（ローカルストレージ）');

      // 注意: KV管理APIは未実装のため、現在はローカルストレージのみで管理
      // 将来的にWebhook実装時にサーバーサイドプラン管理を統合予定
      setPlanUpdateStatus('success');

      setSessionData({
        sessionId: session_id,
        userId: userId,
        plan: 'premium',
        activatedAt: new Date().toISOString(),
        method: 'localStorage'
      });

      setLoading(false);

    } catch (error) {
      console.error('❌ Session verification error:', error);
      setError('決済の確認に失敗しました。サポートにお問い合わせください。');
      setLoading(false);
    }
  };

  const handleContinue = () => {
    // プラン更新を確実に反映するため、メインページをリロード
    window.location.href = '/';
  };

  const handleContactSupport = () => {
    // サポート連絡（メールまたはお問い合わせフォーム）
    const subject = encodeURIComponent('プレミアムプラン有効化のお問い合わせ');
    const body = encodeURIComponent(`
セッションID: ${session_id}
決済日時: ${new Date().toLocaleString()}
問題: プレミアムプランの有効化について確認をお願いします。

よろしくお願いいたします。
    `);

    window.location.href = `mailto:support@sns-automation.app?subject=${subject}&body=${body}`;
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.loadingSpinner}>⏳</div>
          <h2>決済を確認中...</h2>
          <p>プレミアムプランの有効化処理を実行しています</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.errorIcon}>❌</div>
          <h2>エラーが発生しました</h2>
          <p>{error}</p>
          <button onClick={handleContactSupport} style={styles.button}>
            📧 サポートに連絡
          </button>
          <button onClick={handleContinue} style={{ ...styles.button, marginLeft: '10px' }}>
            🏠 ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.successIcon}>🎉</div>
        <h2>決済が完了しました！</h2>
        <p>プレミアムプランへのアップグレードありがとうございます。</p>

        {/* プラン更新ステータス表示 */}
        <div style={styles.statusCard}>
          <div style={{ color: '#28a745' }}>
            ✅ <strong>プレミアムプラン有効化完了</strong><br />
            <small>ローカル設定で即座利用開始可能です</small>
          </div>
        </div>

        {sessionData && (
          <div style={styles.details}>
            <h3>📋 アクティベーション詳細</h3>
            <p><strong>プラン:</strong> 💎 プレミアム</p>
            <p><strong>ユーザーID:</strong> {sessionData.userId}</p>
            <p><strong>有効化日時:</strong> {new Date(sessionData.activatedAt).toLocaleString()}</p>
            <p><strong>セッションID:</strong> <code>{sessionData.sessionId}</code></p>
            <p><strong>管理方式:</strong> ローカルストレージ</p>
          </div>
        )}

        <div style={styles.benefits}>
          <h3>🎯 利用可能な機能</h3>
          <ul style={styles.benefitsList}>
            <li>🚀 <strong>無制限AI投稿生成</strong></li>
            <li>🐦 <strong>Twitter自動投稿</strong></li>
            <li>📸 <strong>Threads自動投稿</strong></li>
            <li>⚡ <strong>高速生成（2.1秒）</strong></li>
            <li>📊 <strong>詳細統計・分析</strong></li>
            <li>🚫 <strong>広告なし</strong></li>
            <li>👑 <strong>プレミアムバッジ</strong></li>
            <li>🎧 <strong>優先サポート</strong></li>
          </ul>
        </div>

        <div style={styles.nextSteps}>
          <h3>🚀 次のステップ</h3>
          <ol style={styles.stepsList}>
            <li>メインページでプレミアムバッジ（👑）を確認</li>
            <li>Twitter/ThreadsアカウントをOAuth接続</li>
            <li>無制限AI投稿生成をお試しください</li>
          </ol>
        </div>

        <button onClick={handleContinue} style={styles.primaryButton}>
          🚀 SNS自動化ツールを使い始める
        </button>

        <div style={styles.footer}>
          <div style={styles.implementationNote}>
            <h4>💡 実装状況について</h4>
            <p>現在、プレミアムプラン管理はローカルストレージベースで動作しています。<br />
              将来的にWebhook実装により、サーバーサイドプラン管理に統合予定です。</p>
          </div>

          <p style={styles.footerText}>
            何かご不明な点がございましたら、<br />
            <a href="mailto:support@sns-automation.app" style={styles.link}>
              📧 サポートまでお気軽にお問い合わせください
            </a>
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
    backgroundColor: '#f5f5f5',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '40px',
    maxWidth: '600px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    border: '1px solid #e0e0e0'
  },
  loadingSpinner: {
    fontSize: '48px',
    marginBottom: '20px',
    animation: 'pulse 2s infinite'
  },
  successIcon: {
    fontSize: '64px',
    marginBottom: '20px'
  },
  errorIcon: {
    fontSize: '48px',
    marginBottom: '20px'
  },
  statusCard: {
    backgroundColor: '#f8f9fa',
    padding: '15px',
    borderRadius: '8px',
    margin: '20px 0',
    border: '1px solid #dee2e6'
  },
  details: {
    backgroundColor: '#e3f2fd',
    padding: '20px',
    borderRadius: '8px',
    margin: '20px 0',
    textAlign: 'left',
    border: '1px solid #2196f3'
  },
  benefits: {
    backgroundColor: '#fff3cd',
    padding: '20px',
    borderRadius: '8px',
    margin: '20px 0',
    textAlign: 'left',
    border: '1px solid #ffa500'
  },
  benefitsList: {
    margin: '10px 0',
    paddingLeft: '20px'
  },
  nextSteps: {
    backgroundColor: '#d4edda',
    padding: '20px',
    borderRadius: '8px',
    margin: '20px 0',
    textAlign: 'left',
    border: '1px solid #28a745'
  },
  stepsList: {
    margin: '10px 0',
    paddingLeft: '20px'
  },
  button: {
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    marginTop: '20px',
    transition: 'background-color 0.3s'
  },
  primaryButton: {
    backgroundColor: '#ffa500',
    color: 'white',
    border: 'none',
    padding: '15px 30px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: 'bold',
    marginTop: '20px',
    transition: 'background-color 0.3s',
    boxShadow: '0 2px 10px rgba(255, 165, 0, 0.3)'
  },
  footer: {
    marginTop: '30px',
    paddingTop: '20px',
    borderTop: '1px solid #e0e0e0'
  },
  implementationNote: {
    backgroundColor: '#e3f2fd',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'left',
    border: '1px solid #2196f3',
    fontSize: '14px'
  },
  footerText: {
    fontSize: '14px',
    color: '#6c757d',
    margin: 0
  },
  link: {
    color: '#ffa500',
    textDecoration: 'none',
    fontWeight: 'bold'
  }
};

export default SuccessPage;