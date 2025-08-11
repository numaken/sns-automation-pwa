// pages/success.js - 美しい決済完了ページ
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Success() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(true);
  const [upgradeStatus, setUpgradeStatus] = useState('processing');

  useEffect(() => {
    const { session_id } = router.query;

    if (session_id) {
      setSessionId(session_id);

      setTimeout(() => {
        try {
          // プレミアムプランに自動移行
          localStorage.setItem('userPlan', 'premium');
          localStorage.setItem('subscriptionStatus', 'active');
          localStorage.setItem('stripeSessionId', session_id);
          localStorage.setItem('premiumActivatedAt', new Date().toISOString());

          // 無料プランの使用量制限をクリア
          localStorage.removeItem('dailyUsage');

          console.log('✅ プレミアムプランに自動移行完了');

          setUpgradeStatus('success');
          setLoading(false);

        } catch (error) {
          console.error('❌ 自動移行エラー:', error);
          setUpgradeStatus('error');
          setLoading(false);
        }
      }, 1500);
    } else {
      setLoading(false);
      setUpgradeStatus('success');
    }
  }, [router.query]);

  return (
    <>
      <Head>
        <title>🎉 決済完了 - SNS自動化ツール</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div style={styles.container}>
        <div style={styles.card}>
          {/* 成功アイコン */}
          <div style={styles.iconContainer}>
            <div style={styles.successIcon}>🎉</div>
            <div style={styles.sparkles}>✨</div>
          </div>

          {/* メインタイトル */}
          <h1 style={styles.title}>
            決済が完了しました！
          </h1>

          <p style={styles.subtitle}>
            SNS自動化ツール <span style={styles.highlight}>プレミアムプラン</span>へようこそ！<br />
            すべてのプレミアム機能がご利用いただけます。
          </p>

          {/* プレミアムバッジ */}
          <div style={styles.premiumBadge}>
            <span style={styles.crown}>👑</span>
            PREMIUM MEMBER
          </div>

          {/* ステータス表示 */}
          {loading && (
            <div style={styles.statusContainer}>
              <div style={styles.loader}></div>
              <p style={styles.statusText}>プレミアム機能を有効化中...</p>
            </div>
          )}

          {upgradeStatus === 'success' && !loading && (
            <div style={styles.statusContainer}>
              <div style={styles.successCheck}>✅</div>
              <p style={styles.statusText}>プレミアム機能が有効になりました！</p>
            </div>
          )}

          {/* 機能一覧 */}
          <div style={styles.featuresContainer}>
            <h3 style={styles.featuresTitle}>🚀 プレミアム機能</h3>
            <div style={styles.featuresList}>
              <div style={styles.feature}>
                <span style={styles.featureIcon}>♾️</span>
                <span>無制限AI投稿生成</span>
              </div>
              <div style={styles.feature}>
                <span style={styles.featureIcon}>🐦</span>
                <span>Twitter自動投稿</span>
              </div>
              <div style={styles.feature}>
                <span style={styles.featureIcon}>📱</span>
                <span>Threads自動投稿</span>
              </div>
              <div style={styles.feature}>
                <span style={styles.featureIcon}>⚡</span>
                <span>高速生成（専用API）</span>
              </div>
              <div style={styles.feature}>
                <span style={styles.featureIcon}>🚫</span>
                <span>広告なしクリーンUI</span>
              </div>
              <div style={styles.feature}>
                <span style={styles.featureIcon}>🎯</span>
                <span>優先サポート</span>
              </div>
            </div>
          </div>

          {/* セッション情報 */}
          {sessionId && (
            <div style={styles.sessionInfo}>
              <small>セッションID: {sessionId.substring(0, 20)}...</small>
            </div>
          )}

          {/* アクションボタン */}
          <div style={styles.actionContainer}>
            <button
              onClick={() => router.push('/')}
              style={styles.primaryButton}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-3px)';
                e.target.style.boxShadow = '0 20px 40px rgba(56, 189, 248, 0.4)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 10px 25px rgba(56, 189, 248, 0.3)';
              }}
            >
              ✨ プレミアム機能を使い始める
            </button>

            <p style={styles.helpText}>
              何かご不明点がございましたら、<br />
              <a href="mailto:numaken@gmail.com" style={styles.link}>
                numaken@gmail.com
              </a> までお気軽にお問い合わせください。
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  card: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '24px',
    padding: '50px 40px',
    maxWidth: '600px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    position: 'relative',
    overflow: 'hidden',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: '30px',
  },
  successIcon: {
    fontSize: '80px',
    display: 'block',
    animation: 'bounce 2s infinite',
  },
  sparkles: {
    position: 'absolute',
    top: '-10px',
    right: '30%',
    fontSize: '30px',
    animation: 'twinkle 1.5s ease-in-out infinite',
  },
  title: {
    fontSize: '36px',
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: '20px',
    background: 'linear-gradient(45deg, #667eea, #764ba2)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    lineHeight: '1.2',
  },
  subtitle: {
    fontSize: '18px',
    color: '#6b7280',
    marginBottom: '30px',
    lineHeight: '1.6',
  },
  highlight: {
    background: 'linear-gradient(45deg, #fbbf24, #f59e0b)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    fontWeight: 'bold',
  },
  premiumBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'linear-gradient(45deg, #fbbf24, #f59e0b)',
    color: 'white',
    padding: '15px 30px',
    borderRadius: '50px',
    fontWeight: 'bold',
    fontSize: '20px',
    marginBottom: '30px',
    boxShadow: '0 10px 25px rgba(251, 191, 36, 0.3)',
  },
  crown: {
    marginRight: '10px',
    fontSize: '24px',
  },
  statusContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '30px',
    padding: '20px',
    background: 'rgba(59, 130, 246, 0.1)',
    borderRadius: '16px',
    border: '1px solid rgba(59, 130, 246, 0.2)',
  },
  loader: {
    width: '24px',
    height: '24px',
    border: '3px solid #e5e7eb',
    borderTop: '3px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginRight: '15px',
  },
  successCheck: {
    fontSize: '24px',
    marginRight: '15px',
  },
  statusText: {
    color: '#3b82f6',
    fontWeight: '600',
    margin: 0,
  },
  featuresContainer: {
    background: 'rgba(248, 250, 252, 0.8)',
    borderRadius: '20px',
    padding: '30px',
    marginBottom: '30px',
  },
  featuresTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '20px',
    margin: '0 0 20px 0',
  },
  featuresList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '15px',
  },
  feature: {
    display: 'flex',
    alignItems: 'center',
    color: '#374151',
    fontSize: '16px',
    fontWeight: '500',
  },
  featureIcon: {
    fontSize: '20px',
    marginRight: '12px',
    width: '24px',
  },
  sessionInfo: {
    background: 'rgba(243, 244, 246, 0.8)',
    borderRadius: '12px',
    padding: '15px',
    marginBottom: '30px',
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  actionContainer: {
    marginTop: '20px',
  },
  primaryButton: {
    background: 'linear-gradient(45deg, #3b82f6, #1d4ed8)',
    color: 'white',
    border: 'none',
    padding: '18px 36px',
    borderRadius: '16px',
    fontSize: '18px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 10px 25px rgba(56, 189, 248, 0.3)',
    marginBottom: '25px',
  },
  helpText: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.5',
    margin: 0,
  },
  link: {
    color: '#3b82f6',
    textDecoration: 'none',
    fontWeight: '600',
  },
};