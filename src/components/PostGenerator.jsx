// PostGenerator.jsx - 完全美化版（PostCSS不使用、インラインスタイルのみ）

import React, { useState, useEffect } from 'react';

const PostGenerator = () => {
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState('カジュアル');
  const [generatedPost, setGeneratedPost] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [usage, setUsage] = useState({ remaining: 3 });
  const [quality, setQuality] = useState(null);

  const userPlan = 'free';
  const PREMIUM_FEATURES_ENABLED = false;

  const API_ENDPOINT = process.env.NODE_ENV === 'production'
    ? 'https://sns-automation-pwa.vercel.app'
    : '';

  // 美しいカラーパレット & スタイルシステム
  const colors = {
    primary: '#3b82f6',
    primaryHover: '#2563eb',
    primaryLight: '#dbeafe',
    primaryDark: '#1e40af',
    success: '#10b981',
    successLight: '#d1fae5',
    successDark: '#047857',
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

  // モダンスタイルシステム
  const styles = {
    container: {
      maxWidth: '48rem',
      margin: '0 auto',
      padding: '2rem 1.5rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      lineHeight: '1.6',
      color: colors.gray[800]
    },

    // ヘッダーセクション
    header: {
      textAlign: 'center',
      marginBottom: '3rem'
    },
    title: {
      fontSize: '2.5rem',
      fontWeight: '700',
      color: colors.gray[900],
      marginBottom: '0.5rem',
      background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text'
    },
    subtitle: {
      fontSize: '1.125rem',
      color: colors.gray[600],
      fontWeight: '400'
    },

    // プランバッジ
    planBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '0.75rem 1.5rem',
      backgroundColor: colors.primaryLight,
      border: `2px solid ${colors.primary}`,
      borderRadius: '50px',
      marginBottom: '2rem',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      transition: 'all 0.3s ease'
    },
    planIcon: {
      fontSize: '1.25rem',
      marginRight: '0.5rem'
    },
    planText: {
      fontWeight: '600',
      color: colors.primaryDark,
      fontSize: '1rem'
    },
    usageContainer: {
      marginTop: '1rem',
      padding: '1rem',
      backgroundColor: 'white',
      borderRadius: '12px',
      border: `1px solid ${colors.gray[200]}`,
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
    },
    usageText: {
      fontSize: '0.875rem',
      color: colors.gray[600],
      textAlign: 'center'
    },
    preparingBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '0.5rem 1rem',
      backgroundColor: colors.warningLight,
      color: colors.warning,
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: '500',
      marginTop: '0.5rem'
    },

    // フォームスタイル
    formCard: {
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '2rem',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      border: `1px solid ${colors.gray[200]}`,
      marginBottom: '2rem'
    },
    formGroup: {
      marginBottom: '1.5rem'
    },
    label: {
      display: 'block',
      fontSize: '0.875rem',
      fontWeight: '600',
      color: colors.gray[700],
      marginBottom: '0.5rem'
    },
    textarea: {
      width: '100%',
      padding: '1rem',
      border: `2px solid ${colors.gray[200]}`,
      borderRadius: '12px',
      fontSize: '1rem',
      lineHeight: '1.5',
      resize: 'vertical',
      outline: 'none',
      transition: 'all 0.3s ease',
      fontFamily: 'inherit',
      backgroundColor: colors.gray[50]
    },
    textareaFocus: {
      borderColor: colors.primary,
      backgroundColor: 'white',
      boxShadow: `0 0 0 3px ${colors.primaryLight}`
    },
    select: {
      width: '100%',
      padding: '1rem',
      border: `2px solid ${colors.gray[200]}`,
      borderRadius: '12px',
      fontSize: '1rem',
      backgroundColor: 'white',
      outline: 'none',
      transition: 'all 0.3s ease',
      cursor: 'pointer'
    },

    // ボタンスタイル
    button: {
      width: '100%',
      background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryHover} 100%)`,
      color: 'white',
      padding: '1rem 2rem',
      borderRadius: '12px',
      fontWeight: '600',
      fontSize: '1.125rem',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 15px 0 rgba(59, 130, 246, 0.3)',
      transform: 'translateY(0)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem'
    },
    buttonHover: {
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 25px 0 rgba(59, 130, 246, 0.4)'
    },
    buttonDisabled: {
      background: colors.gray[400],
      cursor: 'not-allowed',
      transform: 'none',
      boxShadow: 'none'
    },

    // メッセージカード
    errorCard: {
      marginTop: '1.5rem',
      padding: '1rem 1.5rem',
      backgroundColor: colors.errorLight,
      border: `1px solid ${colors.error}`,
      borderRadius: '12px',
      color: colors.error,
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.75rem'
    },
    successCard: {
      marginTop: '2rem',
      padding: '1.5rem',
      backgroundColor: colors.successLight,
      border: `1px solid ${colors.success}`,
      borderRadius: '16px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    },
    successHeader: {
      fontWeight: '600',
      color: colors.successDark,
      marginBottom: '1rem',
      fontSize: '1.125rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    successContent: {
      color: colors.gray[800],
      whiteSpace: 'pre-wrap',
      lineHeight: '1.7',
      fontSize: '1rem',
      padding: '1rem',
      backgroundColor: 'white',
      borderRadius: '8px',
      border: `1px solid ${colors.gray[200]}`
    },
    qualityBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      marginTop: '1rem',
      padding: '0.5rem 1rem',
      backgroundColor: colors.primaryLight,
      color: colors.primaryDark,
      borderRadius: '20px',
      fontSize: '0.875rem',
      fontWeight: '500'
    },
    copyButton: {
      marginTop: '1rem',
      padding: '0.75rem 1.5rem',
      backgroundColor: colors.success,
      color: 'white',
      fontSize: '0.875rem',
      fontWeight: '500',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },

    // ガイドセクション
    guideCard: {
      marginTop: '2rem',
      padding: '1.5rem',
      backgroundColor: 'white',
      borderRadius: '16px',
      border: `1px solid ${colors.gray[200]}`,
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    },
    guideHeader: {
      fontWeight: '600',
      color: colors.gray[800],
      marginBottom: '1rem',
      fontSize: '1.125rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    guideList: {
      listStyle: 'none',
      padding: '0',
      margin: '0'
    },
    guideItem: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.75rem',
      marginBottom: '0.75rem',
      padding: '0.75rem',
      backgroundColor: colors.gray[50],
      borderRadius: '8px'
    },
    guideNumber: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '1.5rem',
      height: '1.5rem',
      backgroundColor: colors.primary,
      color: 'white',
      borderRadius: '50%',
      fontSize: '0.75rem',
      fontWeight: '600',
      flexShrink: 0
    },
    guideText: {
      fontSize: '0.875rem',
      color: colors.gray[700],
      lineHeight: '1.5'
    },

    // 制限メッセージ
    limitCard: {
      textAlign: 'center',
      padding: '1.5rem',
      backgroundColor: colors.warningLight,
      borderRadius: '12px',
      marginTop: '1rem',
      border: `1px solid ${colors.warning}`
    },
    limitText: {
      color: colors.warning,
      fontWeight: '500',
      fontSize: '0.875rem'
    }
  };

  const generatePostWithSharedAPI = async () => {
    if (!prompt.trim()) {
      setError('投稿のテーマを入力してください');
      return;
    }

    setIsGenerating(true);
    setError('');
    setGeneratedPost('');

    try {
      const response = await fetch(`${API_ENDPOINT}/api/generate-post-shared`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          tone,
          userType: 'free'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setError('1日の無料生成回数（3回）を超えました。明日またお試しください！');
          setUsage({ remaining: 0 });
        } else if (response.status === 503) {
          setError('システム負荷により一時的に利用できません。しばらく後にお試しください。');
        } else {
          throw new Error(data.error || '投稿生成に失敗しました');
        }
        return;
      }

      setGeneratedPost(data.post);
      setQuality(data.quality);

      if (data.usage) {
        setUsage(data.usage);
      }

    } catch (error) {
      console.error('Generate post error:', error);
      setError('ネットワークエラーが発生しました。しばらく待ってから再試行してください。');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* ヘッダー */}
      <div style={styles.header}>
        <h1 style={styles.title}>🚀 SNS自動化</h1>
        <p style={styles.subtitle}>設定不要でAI投稿生成</p>

        {/* プランバッジ */}
        <div style={styles.planBadge}>
          <span style={styles.planIcon}>📱</span>
          <span style={styles.planText}>無料プラン</span>
        </div>

        {!PREMIUM_FEATURES_ENABLED && (
          <div style={styles.preparingBadge}>
            🚧 プレミアムプラン（無制限生成）準備中
          </div>
        )}
      </div>

      {/* 使用量表示 */}
      <div style={styles.usageContainer}>
        <div style={styles.usageText}>
          本日の残り生成回数: <strong>{usage.remaining}/3回</strong>
        </div>
      </div>

      {/* 投稿生成フォーム */}
      <div style={styles.formCard}>
        <div style={styles.formGroup}>
          <label style={styles.label}>
            💭 投稿のテーマ
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="投稿したい内容やテーマを入力してください..."
            style={{
              ...styles.textarea,
              ...(document.activeElement === event?.target ? styles.textareaFocus : {})
            }}
            rows={4}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>
            🎭 トーン
          </label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            style={styles.select}
          >
            <option value="カジュアル">😊 カジュアル</option>
            <option value="フォーマル">🎩 フォーマル</option>
            <option value="フレンドリー">🤝 フレンドリー</option>
            <option value="プロフェッショナル">💼 プロフェッショナル</option>
          </select>
        </div>

        <button
          onClick={generatePostWithSharedAPI}
          disabled={isGenerating || !prompt.trim() || usage.remaining === 0}
          style={{
            ...styles.button,
            ...(isGenerating || !prompt.trim() || usage.remaining === 0 ? styles.buttonDisabled : {})
          }}
          onMouseEnter={(e) => {
            if (!isGenerating && prompt.trim() && usage.remaining > 0) {
              Object.assign(e.target.style, styles.buttonHover);
            }
          }}
          onMouseLeave={(e) => {
            Object.assign(e.target.style, styles.button);
          }}
        >
          {isGenerating ? (
            <>🤖 AI生成中...</>
          ) : usage.remaining === 0 ? (
            <>⏰ 本日の無料生成完了（明日リセット）</>
          ) : (
            <>✨ AI投稿を生成</>
          )}
        </button>

        {usage.remaining === 0 && (
          <div style={styles.limitCard}>
            <div style={styles.limitText}>
              📅 無料プランは1日3回まで生成可能です<br />
              明日の朝にリセットされます
            </div>
          </div>
        )}
      </div>

      {/* エラー表示 */}
      {error && (
        <div style={styles.errorCard}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* 生成された投稿表示 */}
      {generatedPost && (
        <div style={styles.successCard}>
          <h3 style={styles.successHeader}>
            <span>✨</span>
            生成された投稿
          </h3>
          <div style={styles.successContent}>{generatedPost}</div>

          {quality && (
            <div style={styles.qualityBadge}>
              <span>📊</span>
              品質スコア: {quality}/100
            </div>
          )}

          <button
            onClick={() => {
              navigator.clipboard.writeText(generatedPost);
              // コピー成功の視覚フィードバック可能
            }}
            style={styles.copyButton}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#059669';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = colors.success;
            }}
          >
            <span>📋</span>
            クリップボードにコピー
          </button>
        </div>
      )}

      {/* 使用方法ガイド */}
      <div style={styles.guideCard}>
        <h3 style={styles.guideHeader}>
          <span>💡</span>
          使い方ガイド
        </h3>
        <ul style={styles.guideList}>
          {[
            '投稿したいテーマを具体的に入力',
            'お好みのトーンを選択',
            'AI生成ボタンをクリック',
            '生成されたテキストをコピーしてSNSに投稿'
          ].map((text, index) => (
            <li key={index} style={styles.guideItem}>
              <div style={styles.guideNumber}>{index + 1}</div>
              <div style={styles.guideText}>{text}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default PostGenerator;