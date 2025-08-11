// pages/success.js - Next.js版決済成功ページ
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Success() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // URLパラメータからセッションIDを取得
    const { session_id } = router.query;

    if (session_id) {
      setSessionId(session_id);

      try {
        // プレミアムプランに自動移行
        localStorage.setItem('userPlan', 'premium');
        localStorage.setItem('subscriptionStatus', 'active');
        localStorage.setItem('stripeSessionId', session_id);
        localStorage.setItem('premiumActivatedAt', new Date().toISOString());

        // 無料プランの使用量制限をクリア
        localStorage.removeItem('dailyUsage');

        console.log('✅ プレミアムプランに自動移行完了');
        console.log('セッションID:', session_id);

        setTimeout(() => {
          setLoading(false);
        }, 2000);

      } catch (error) {
        console.error('❌ 自動移行エラー:', error);
        setError(error.message);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [router.query]);

  const handleReturnToApp = () => {
    router.push('/');
  };

  return (
    <>
      <Head>
        <title>決済完了 - SNS自動化ツール</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div style={styles.body}>
        <div style={styles.container}>
          <div style={styles.successIcon}>🎉</div>
          <h1 style={styles.title}>決済が完了しました！</h1>
          <p style={styles.subtitle}>
            SNS自動化ツール プレミアムプランへようこそ！<br />
            プレミアム機能が利用できるようになりました。
          </p>

          <div style={styles.premiumBadge}>
            <span style={styles.crown}>👑</span>
            PREMIUM MEMBER
          </div>

          <div style={styles.featureList}>
            <div style={styles.featureItem}>
              <span style={styles.check}>✅</span>
              無制限AI投稿生成
            </div>
            <div style={styles.featureItem}>
              <span style={styles.check}>✅</span>
              Twitter/Threads自動投稿
            </div>
            <div style={styles.featureItem}>
              <span style={styles.check}>✅</span>
              高速生成（専用APIキー）
            </div>
            <div style={styles.featureItem}>
              <span style={styles.check}>✅</span>
              広告なしのクリーンUI
            </div>
            <div style={styles.featureItem}>
              <span style={styles.check}>✅</span>
              優先サポート
            </div>
          </div>

          {sessionId && (
            <div style={styles.sessionInfo}>
              セッションID: {sessionId}
            </div>
          )}

          {loading && (
            <div style={styles.loading}>
              プレミアムプランに移行中... ⏳
            </div>
          )}

          {error && (
            <div style={styles.error}>
              自動移行に失敗しました: {error}
              <br />
              手動移行コード：
              <code style={styles.code}>
                localStorage.setItem('userPlan', 'premium');
                localStorage.setItem('subscriptionStatus', 'active');
                window.location.href = '/';
              </code>
            </div>
          )}

          <button
            onClick={handleReturnToApp}
            style={styles.button}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 10px 15px -3px rgba(59, 130, 246, 0.4)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            {loading ? 'プレミアム機能を準備中...' : '✨ プレミアム機能を使う'}
          </button>
        </div>
      </div>
    </>
  );
}

const styles = {
  body: {
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    margin: 0,
    padding: 0,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    background: 'white',
    borderRadius: '16px',
    padding: '40px',
    textAlign: 'center',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    maxWidth: '500px',
    margin: '20px',
  },
  successIcon: {
    fontSize: '64px',
    marginBottom: '20px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '16px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#6b7280',
    marginBottom: '32px',
    lineHeight: '1.6',
  },
  premiumBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'linear-gradient(45deg, #fbbf24, #f59e0b)',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '25px',
    fontWeight: 'bold',
    marginBottom: '24px',
    fontSize: '18px',
  },
  crown: {
    marginRight: '8px',
  },
  featureList: {
    textAlign: 'left',
    background: '#f8fafc',
    borderRadius: '12px',
    padding: '24px',
    margin: '24px 0',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '12px',
    color: '#374151',
  },
  check: {
    color: '#10b981',
    marginRight: '12px',
    fontWeight: 'bold',
  },
  button: {
    background: 'linear-gradient(45deg, #3b82f6, #1d4ed8)',
    color: 'white',
    border: 'none',
    padding: '16px 32px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  sessionInfo: {
    background: '#f3f4f6',
    borderRadius: '8px',
    padding: '16px',
    margin: '20px 0',
    fontFamily: 'monospace',
    fontSize: '14px',
    color: '#6b7280',
  },
  loading: {
    color: '#6b7280',
    margin: '20px 0',
  },
  error: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    padding: '16px',
    borderRadius: '8px',
    margin: '20px 0',
  },
  code: {
    background: '#f3f4f6',
    padding: '8px',
    borderRadius: '4px',
    display: 'block',
    margin: '8px 0',
    fontFamily: 'monospace',
    fontSize: '12px',
  },
};