import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

const PremiumSuccess = () => {
  const router = useRouter();
  const { session_id } = router.query;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.successIcon}>🎉</div>
        <h1>プレミアムプラン開始！</h1>
        <p>ご購入ありがとうございます！</p>
        
        <div style={styles.benefits}>
          <h3>🎯 利用可能な機能</h3>
          <ul>
            <li>🚀 無制限AI投稿生成</li>
            <li>🐦 Twitter自動投稿</li>
            <li>📸 Threads自動投稿</li>
            <li>⚡ 高速生成</li>
            <li>🚫 広告なし</li>
          </ul>
        </div>

        <button onClick={() => router.push('/')} style={styles.button}>
          🚀 SNS自動化ツールを使い始める
        </button>
        
        {session_id && (
          <p style={styles.sessionId}>Session: {session_id}</p>
        )}
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
    backgroundColor: '#f0f9ff',
    padding: '20px'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '40px',
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  successIcon: {
    fontSize: '64px',
    marginBottom: '20px'
  },
  benefits: {
    backgroundColor: '#dcfce7',
    padding: '20px',
    borderRadius: '8px',
    margin: '20px 0',
    textAlign: 'left'
  },
  button: {
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    padding: '15px 30px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: 'bold',
    marginTop: '20px'
  },
  sessionId: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '20px',
    wordBreak: 'break-all'
  }
};

export default PremiumSuccess;
