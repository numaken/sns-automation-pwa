// SettingsPanel.jsx - 完全美化版（PostCSS不使用、インラインスタイルのみ）

import React from 'react';
import { useUserPlan } from '../hooks/useUserPlan';


// SettingsPanel関数の最初に追加
const SettingsPanel = () => {
  const { userPlan, isLoading } = useUserPlan();
  const isPremium = userPlan === 'premium';


  const PREMIUM_FEATURES_ENABLED = false;

  // 美しいカラーシステム
  const colors = {
    primary: '#3b82f6',
    primaryLight: '#dbeafe',
    primaryDark: '#1e40af',
    success: '#10b981',
    successLight: '#d1fae5',
    successDark: '#047857',
    warning: '#f59e0b',
    warningLight: '#fef3c7',
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
    container: {
      maxWidth: '48rem',
      margin: '0 auto',
      padding: '2rem 1.5rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      lineHeight: '1.6',
      color: colors.gray[800]
    },

    // ヘッダー
    header: {
      textAlign: 'center',
      marginBottom: '3rem'
    },
    title: {
      fontSize: '2.5rem',
      fontWeight: '700',
      color: colors.gray[900],
      marginBottom: '0.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.75rem'
    },
    planBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '0.75rem 1.5rem',
      backgroundColor: colors.successLight,
      color: colors.successDark,
      borderRadius: '50px',
      fontSize: '1rem',
      fontWeight: '600',
      gap: '0.5rem',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    },

    // カードスタイル
    card: {
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '2rem',
      marginBottom: '2rem',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      border: `1px solid ${colors.gray[200]}`
    },
    cardHeader: {
      fontSize: '1.5rem',
      fontWeight: '600',
      color: colors.gray[800],
      marginBottom: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem'
    },
    planStatus: {
      fontSize: '1.125rem',
      fontWeight: '600',
      color: colors.gray[700],
      marginBottom: '1.5rem'
    },

    // 機能リスト
    featureList: {
      listStyle: 'none',
      padding: '0',
      margin: '0'
    },
    featureItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.75rem 0',
      borderBottom: `1px solid ${colors.gray[100]}`
    },
    featureItemLast: {
      borderBottom: 'none'
    },
    featureIcon: {
      fontSize: '1.25rem',
      width: '1.5rem',
      textAlign: 'center'
    },
    featureText: {
      fontSize: '0.875rem',
      color: colors.gray[700],
      flex: 1
    },
    featureTextEnabled: {
      color: colors.gray[800],
      fontWeight: '500'
    },
    featureTextDisabled: {
      color: colors.gray[500]
    },

    // 今後の機能セクション
    futureSection: {
      marginTop: '2rem',
      paddingTop: '1.5rem',
      borderTop: `1px solid ${colors.gray[200]}`
    },
    futureSectionHeader: {
      fontSize: '1rem',
      fontWeight: '500',
      color: colors.gray[600],
      marginBottom: '1rem'
    },

    // 開発中メッセージ
    developmentCard: {
      padding: '1.5rem',
      backgroundColor: colors.primaryLight,
      border: `1px solid ${colors.primary}`,
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '1rem'
    },
    developmentIcon: {
      fontSize: '1.5rem',
      color: colors.primary
    },
    developmentContent: {
      flex: 1
    },
    developmentTitle: {
      fontSize: '1rem',
      fontWeight: '600',
      color: colors.primaryDark,
      marginBottom: '0.5rem'
    },
    developmentText: {
      fontSize: '0.875rem',
      color: colors.primaryDark,
      lineHeight: '1.5'
    },

    // セキュリティ情報
    securityIcon: {
      color: colors.success
    },
    securityText: {
      fontSize: '0.875rem',
      color: colors.gray[600]
    },

    // 設定項目
    settingItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '1rem 0',
      borderBottom: `1px solid ${colors.gray[100]}`
    },
    checkbox: {
      width: '1.125rem',
      height: '1.125rem',
      accentColor: colors.primary
    },
    settingLabel: {
      fontSize: '0.875rem',
      color: colors.gray[700],
      flex: 1,
      cursor: 'pointer'
    },

    // アプリ情報
    infoRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.75rem 0',
      borderBottom: `1px solid ${colors.gray[100]}`,
      fontSize: '0.875rem'
    },
    infoLabel: {
      color: colors.gray[600],
      fontWeight: '500'
    },
    infoValue: {
      color: colors.gray[800],
      fontWeight: '600'
    },
    emailLink: {
      color: colors.primary,
      textDecoration: 'none',
      fontWeight: '600'
    },

    // 使い方のコツ
    tipsList: {
      listStyle: 'none',
      padding: '0',
      margin: '0'
    },
    tipItem: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.75rem',
      marginBottom: '0.75rem',
      padding: '0.75rem',
      backgroundColor: colors.gray[50],
      borderRadius: '8px'
    },
    tipBullet: {
      color: colors.primary,
      fontWeight: '600',
      fontSize: '0.875rem'
    },
    tipText: {
      fontSize: '0.75rem',
      color: colors.gray[600],
      lineHeight: '1.5'
    }
  };

  return (
    <div style={styles.container}>
      {/* ヘッダー */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          <span>⚙️</span>
          設定
        </h1>
        <div style={styles.planBadge}>
          <span>{isPremium ? '👑' : '📱'}</span>
          {isPremium ? 'プレミアムプラン' : '無料プラン'}
        </div>
      </div>

      {/* プラン詳細 */}
      <div style={styles.card}>
        <h2 style={styles.cardHeader}>
          <span>📊</span>
          プラン詳細
        </h2>

        <div style={styles.planStatus}>
          現在のプラン: {isPremium ? 'プレミアムプラン' : '無料プラン'}
        </div>

        <ul style={styles.featureList}>
          <li style={styles.featureItem}>
            <span style={{ ...styles.featureIcon, color: colors.success }}>✅</span>
            <span style={{ ...styles.featureText, ...styles.featureTextEnabled }}>
              1日3回まで投稿生成
            </span>
          </li>
          <li style={styles.featureItem}>
            <span style={{ ...styles.featureIcon, color: colors.success }}>✅</span>
            <span style={{ ...styles.featureText, ...styles.featureTextEnabled }}>
              高品質AI生成
            </span>
          </li>
          <li style={styles.featureItem}>
            <span style={{ ...styles.featureIcon, color: colors.success }}>✅</span>
            <span style={{ ...styles.featureText, ...styles.featureTextEnabled }}>
              APIキー設定不要
            </span>
          </li>
          <li style={{ ...styles.featureItem, ...styles.featureItemLast }}>
            <span style={{ ...styles.featureIcon, color: colors.success }}>✅</span>
            <span style={{ ...styles.featureText, ...styles.featureTextEnabled }}>
              品質評価機能
            </span>
          </li>
        </ul>

        {/* 今後追加予定の機能 */}
        <div style={styles.futureSection}>
          <p style={styles.futureSectionHeader}>今後追加予定の機能:</p>
          <ul style={styles.featureList}>
            <li style={styles.featureItem}>
              <span style={{ ...styles.featureIcon, color: colors.gray[400] }}>❌</span>
              <span style={{ ...styles.featureText, ...styles.featureTextDisabled }}>
                無制限投稿生成
              </span>
            </li>
            <li style={styles.featureItem}>
              <span style={{ ...styles.featureIcon, color: colors.gray[400] }}>❌</span>
              <span style={{ ...styles.featureText, ...styles.featureTextDisabled }}>
                直接SNS投稿機能
              </span>
            </li>
            <li style={{ ...styles.featureItem, ...styles.featureItemLast }}>
              <span style={{ ...styles.featureIcon, color: colors.gray[400] }}>❌</span>
              <span style={{ ...styles.featureText, ...styles.featureTextDisabled }}>
                広告なしクリーンUI
              </span>
            </li>
          </ul>
        </div>

        {/* 開発中メッセージ */}
        {!PREMIUM_FEATURES_ENABLED && (
          <div style={styles.developmentCard}>
            <span style={styles.developmentIcon}>🚧</span>
            <div style={styles.developmentContent}>
              <div style={styles.developmentTitle}>
                追加機能開発中
              </div>
              <p style={styles.developmentText}>
                より便利な機能を開発中です。リリースまでしばらくお待ちください。
              </p>
            </div>
          </div>
        )}
      </div>

      {/* データ・プライバシー */}
      <div style={styles.card}>
        <h2 style={styles.cardHeader}>
          <span>🔒</span>
          データ・プライバシー
        </h2>
        <ul style={styles.featureList}>
          <li style={styles.featureItem}>
            <span style={{ ...styles.featureIcon, ...styles.securityIcon }}>🛡️</span>
            <span style={styles.securityText}>
              APIキーはブラウザのローカルストレージに保存
            </span>
          </li>
          <li style={styles.featureItem}>
            <span style={{ ...styles.featureIcon, ...styles.securityIcon }}>🔐</span>
            <span style={styles.securityText}>
              通信は全てHTTPS暗号化
            </span>
          </li>
          <li style={styles.featureItem}>
            <span style={{ ...styles.featureIcon, ...styles.securityIcon }}>📝</span>
            <span style={styles.securityText}>
              生成された投稿はサーバーに保存されません
            </span>
          </li>
          <li style={styles.featureItem}>
            <span style={{ ...styles.featureIcon, ...styles.securityIcon }}>👁️</span>
            <span style={styles.securityText}>
              個人情報の収集は最小限
            </span>
          </li>
          <li style={{ ...styles.featureItem, ...styles.featureItemLast }}>
            <span style={{ ...styles.featureIcon, ...styles.securityIcon }}>📋</span>
            <span style={styles.securityText}>
              データ削除はいつでも可能
            </span>
          </li>
        </ul>
      </div>

      {/* その他の設定 */}
      <div style={styles.card}>
        <h2 style={styles.cardHeader}>
          <span>🔧</span>
          その他の設定
        </h2>
        <div>
          <label style={styles.settingItem}>
            <input type="checkbox" style={styles.checkbox} defaultChecked />
            <span style={styles.settingLabel}>生成履歴をブラウザに保存</span>
          </label>
          <label style={styles.settingItem}>
            <input type="checkbox" style={styles.checkbox} defaultChecked />
            <span style={styles.settingLabel}>品質評価を表示</span>
          </label>
          <label style={{ ...styles.settingItem, borderBottom: 'none' }}>
            <input type="checkbox" style={styles.checkbox} />
            <span style={styles.settingLabel}>アップデート通知を受け取る</span>
          </label>
        </div>
      </div>

      {/* アプリ情報 */}
      <div style={styles.card}>
        <h2 style={styles.cardHeader}>
          <span>ℹ️</span>
          アプリ情報
        </h2>
        <div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>バージョン:</span>
            <span style={styles.infoValue}>v2.0.0 - 無料版</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>最終更新:</span>
            <span style={styles.infoValue}>2025年8月3日</span>
          </div>
          <div style={{ ...styles.infoRow, borderBottom: 'none' }}>
            <span style={styles.infoLabel}>サポート:</span>
            <a href="mailto:hello@panolabollc.com" style={styles.emailLink}>
              hello@panolabollc.com
            </a>
          </div>
        </div>

        {/* 使い方のコツ */}
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: `1px solid ${colors.gray[200]}` }}>
          <h3 style={{ ...styles.cardHeader, fontSize: '1.125rem', marginBottom: '1rem' }}>
            <span>💡</span>
            使い方のコツ
          </h3>
          <ul style={styles.tipsList}>
            <li style={styles.tipItem}>
              <span style={styles.tipBullet}>•</span>
              <span style={styles.tipText}>
                具体的なテーマを入力するとより良い投稿が生成されます
              </span>
            </li>
            <li style={styles.tipItem}>
              <span style={styles.tipBullet}>•</span>
              <span style={styles.tipText}>
                トーンを変えることで投稿の雰囲気を調整できます
              </span>
            </li>
            <li style={styles.tipItem}>
              <span style={styles.tipBullet}>•</span>
              <span style={styles.tipText}>
                1日3回の制限は日本時間の深夜0時にリセットされます
              </span>
            </li>
            <li style={styles.tipItem}>
              <span style={styles.tipBullet}>•</span>
              <span style={styles.tipText}>
                生成された投稿はコピーボタンで簡単にコピーできます
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;