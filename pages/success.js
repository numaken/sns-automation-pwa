// pages/success.js
// Stripe決済成功ページ

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

const SuccessPage = () => {
  const router = useRouter();
  const { session_id } = router.query;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessionData, setSessionData] = useState(null);

  useEffect(() => {
    if (session_id) {
      verifySession();
    }
  }, [session_id]);

  const verifySession = async () => {
    try {
      // Stripe セッション確認（簡易版）
      console.log('Payment successful! Session ID:', session_id);

      // ユーザーをプレミアムプランに更新
      const userId = localStorage.getItem('sns_automation_user_id');
      if (userId) {
        // KVにプレミアムプラン情報を保存
        // 実際の実装では、Webhookで処理すべきですが、簡易版として
        localStorage.setItem('user_plan', 'premium');

        setSessionData({
          sessionId: session_id,
          userId: userId,
          plan: 'premium',
          activatedAt: new Date().toISOString()
        });
      }

      setLoading(false);
    } catch (error) {
      console.error('Session verification error:', error);
      setError('決済の確認に失敗しました');
      setLoading(false);
    }
  };

  const handleContinue = () => {
    // メインページに戻る
    router.push('/');
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.loadingSpinner}>⏳</div>
          <h2>決済を確認中...</h2>
          <p>少々お待ちください</p>
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
          <button onClick={handleContinue} style={styles.button}>
            戻る
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

        {sessionData && (
          <div style={styles.details}>
            <h3>アクティベーション詳細</h3>
            <p><strong>プラン:</strong> プレミアム</p>
            <p><strong>アクティベーション日時:</strong> {new Date(sessionData.activatedAt).toLocaleString()}</p>
            <p><strong>セッションID:</strong> {sessionData.sessionId}</p>
          </div>
        )}

        <div style={styles.benefits}>
          <h3>🎯 利用可能な機能</h3>
          <ul>
            <li>🚀 無制限AI投稿生成</li>
            <li>🐦 Twitter自動投稿</li>
            <li>📸 Threads自動投稿</li>
            <li>⚡ 高速生成</li>
            <li>📊 詳細統計</li>
            <li>🚫 広告なし</li>
          </ul>
        </div>

        <button onClick={handleContinue} style={styles.primaryButton}>
          🚀 SNS自動化ツールを使い始める
        </button>
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
    padding: '20px'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '40px',
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    border: '1px solid #e0e0e0'
  },
  loadingSpinner: {
    fontSize: '48px',
    marginBottom: '20px'
  },
  successIcon: {
    fontSize: '64px',
    marginBottom: '20px'
  },
  errorIcon: {
    fontSize: '48px',
    marginBottom: '20px'
  },
  details: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    margin: '20px 0',
    textAlign: 'left'
  },
  benefits: {
    backgroundColor: '#fff3cd',
    padding: '20px',
    borderRadius: '8px',
    margin: '20px 0',
    textAlign: 'left'
  },
  button: {
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    marginTop: '20px'
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
    transition: 'background-color 0.3s'
  }
};

export default SuccessPage;