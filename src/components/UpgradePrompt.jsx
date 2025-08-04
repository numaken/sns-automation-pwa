import React from 'react';

const UpgradePrompt = ({ isVisible, onClose, onUpgrade, remainingUses }) => {
  if (!isVisible) return null;

  // PostGenerator.jsxと同じカラーパレット
  const colors = {
    primary: '#3b82f6',
    primaryHover: '#2563eb',
    primaryLight: '#dbeafe',
    primaryDark: '#1e40af',
    success: '#10b981',
    successLight: '#d1fae5',
    warning: '#f59e0b',
    warningLight: '#fef3c7',
    error: '#ef4444',
    errorLight: '#fee2e2',
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827'
    }
  };

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    },
    modal: {
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '2rem',
      maxWidth: '28rem',
      width: '100%',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      border: `1px solid ${colors.gray[200]}`,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    },
    header: {
      textAlign: 'center',
      marginBottom: '1.5rem'
    },
    crown: {
      fontSize: '3rem',
      marginBottom: '0.5rem'
    },
    title: {
      fontSize: '1.5rem',
      fontWeight: '700',
      color: colors.gray[900],
      marginBottom: '0.5rem'
    },
    subtitle: {
      fontSize: '0.875rem',
      color: colors.gray[600]
    },
    featuresCard: {
      background: `linear-gradient(135deg, ${colors.warningLight} 0%, #fef3c7 100%)`,
      borderRadius: '12px',
      padding: '1.5rem',
      marginBottom: '1.5rem',
      border: `1px solid ${colors.warning}`
    },
    featuresTitle: {
      fontWeight: '600',
      color: colors.gray[800],
      marginBottom: '1rem',
      fontSize: '1rem',
      textAlign: 'center'
    },
    featuresList: {
      listStyle: 'none',
      padding: 0,
      margin: 0
    },
    featureItem: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: '0.75rem',
      fontSize: '0.875rem',
      color: colors.gray[700]
    },
    featureIcon: {
      fontSize: '1.125rem',
      marginRight: '0.75rem',
      width: '1.5rem'
    },
    message: {
      textAlign: 'center',
      fontSize: '0.875rem',
      color: colors.gray[600],
      marginBottom: '1.5rem',
      lineHeight: '1.5'
    },
    buttonContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem'
    },
    upgradeButton: {
      width: '100%',
      background: `linear-gradient(135deg, ${colors.warning} 0%, #f59e0b 100%)`,
      color: 'white',
      padding: '0.875rem 1.5rem',
      borderRadius: '8px',
      fontWeight: '600',
      fontSize: '1rem',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 12px 0 rgba(245, 158, 11, 0.3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem'
    },
    laterButton: {
      width: '100%',
      backgroundColor: 'transparent',
      color: colors.gray[500],
      padding: '0.75rem 1rem',
      fontSize: '0.875rem',
      border: 'none',
      cursor: 'pointer',
      transition: 'color 0.2s ease'
    },
    priceHighlight: {
      background: `linear-gradient(135deg, ${colors.warning} 0%, #f59e0b 100%)`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      fontWeight: '700'
    }
  };

  const handleUpgradeClick = () => {
    onUpgrade();
    onClose();
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.crown}>👑</div>
          <h2 style={styles.title}>
            {remainingUses === 0 ? '本日の無料生成完了！' : 'もっと生成しませんか？'}
          </h2>
          <p style={styles.subtitle}>
            プレミアムプランで制限なしの体験を
          </p>
        </div>

        <div style={styles.featuresCard}>
          <h3 style={styles.featuresTitle}>
            プレミアムで解放される機能
          </h3>
          <ul style={styles.featuresList}>
            <li style={styles.featureItem}>
              <span style={styles.featureIcon}>∞</span>
              無制限の投稿生成
            </li>
            <li style={styles.featureItem}>
              <span style={styles.featureIcon}>⚡</span>
              高速生成（専用APIキー）
            </li>
            <li style={styles.featureItem}>
              <span style={styles.featureIcon}>📱</span>
              直接SNS投稿機能
            </li>
            <li style={styles.featureItem}>
              <span style={styles.featureIcon}>✨</span>
              広告なしのクリーンUI
            </li>
          </ul>
        </div>

        <p style={styles.message}>
          {remainingUses === 0
            ? '明日も無料で3回生成できますが、今すぐ無制限で使いませんか？'
            : `残り${remainingUses}回の無料生成があります。無制限でさらに効率的に！`
          }
        </p>

        <div style={styles.buttonContainer}>
          <button
            onClick={handleUpgradeClick}
            style={styles.upgradeButton}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 6px 20px 0 rgba(245, 158, 11, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px 0 rgba(245, 158, 11, 0.3)';
            }}
          >
            <span>👑</span>
            月額<span style={styles.priceHighlight}>¥980</span>でアップグレード
          </button>
          <button
            onClick={onClose}
            style={styles.laterButton}
            onMouseEnter={(e) => {
              e.target.style.color = colors.gray[700];
            }}
            onMouseLeave={(e) => {
              e.target.style.color = colors.gray[500];
            }}
          >
            {remainingUses === 0 ? '明日まで待つ' : '後で決める'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpgradePrompt;