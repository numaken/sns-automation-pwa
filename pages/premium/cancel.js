import React from 'react';
import { useRouter } from 'next/router';

const PremiumCancel = () => {
  const router = useRouter();

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.cancelIcon}>😔</div>
        <h1>決済がキャンセルされました</h1>
        <p>プレミアムプランの購入がキャンセルされました。</p>
        
        <div style={styles.freeFeatures}>
          <h3>🆓 無料プランでできること</h3>
          <ul>
            <li>📝 1日3回のAI投稿生成</li>
            <li>✨ 高品質な投稿作成</li>
            <li>🎨 複数のトーン設定</li>
          </ul>
        </div>

        <div style={styles.buttons}>
          <button onClick={() => router.push('/')} style={styles.primaryButton}>
            無料プランを続ける
          </button>
          <button onClick={() => router.push('/premium')} style={styles.secondaryButton}>
            プレミアムを再検討
          </button>
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
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  cancelIcon: {
    fontSize: '64px',
    marginBottom: '20px'
  },
  freeFeatures: {
    backgroundColor: '#dbeafe',
    padding: '20px',
    borderRadius: '8px',
    margin: '20px 0',
    textAlign: 'left'
  },
  buttons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '20px'
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px'
  },
  secondaryButton: {
    backgroundColor: '#e5e7eb',
    color: '#374151',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px'
  }
};

export default PremiumCancel;
