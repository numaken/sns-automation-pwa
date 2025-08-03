// PostGenerator.jsx - 美しいスタイル版（inline styles併用）

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

  // インラインスタイル定義（Tailwindが効かない場合の緊急対応）
  const styles = {
    container: {
      maxWidth: '42rem',
      margin: '0 auto',
      padding: '1.5rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    planBadge: {
      marginBottom: '1rem',
      padding: '0.75rem',
      backgroundColor: '#dbeafe',
      border: '1px solid #93c5fd',
      borderRadius: '0.5rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    planText: {
      fontWeight: '500',
      color: '#1e40af'
    },
    usageText: {
      fontSize: '0.875rem',
      color: '#3730a3'
    },
    preparingText: {
      fontSize: '0.75rem',
      color: '#3730a3',
      marginTop: '0.25rem'
    },
    formContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    },
    label: {
      display: 'block',
      fontSize: '0.875rem',
      fontWeight: '500',
      marginBottom: '0.5rem',
      color: '#374151'
    },
    textarea: {
      width: '100%',
      padding: '0.75rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.5rem',
      fontSize: '1rem',
      lineHeight: '1.5',
      resize: 'vertical',
      outline: 'none',
      transition: 'border-color 0.2s',
      fontFamily: 'inherit'
    },
    textareaFocus: {
      borderColor: '#3b82f6',
      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
    },
    select: {
      width: '100%',
      padding: '0.75rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.5rem',
      fontSize: '1rem',
      backgroundColor: 'white',
      outline: 'none'
    },
    button: {
      width: '100%',
      backgroundColor: '#3b82f6',
      color: 'white',
      padding: '0.75rem 1.5rem',
      borderRadius: '0.5rem',
      fontWeight: '500',
      border: 'none',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      fontSize: '1rem'
    },
    buttonHover: {
      backgroundColor: '#2563eb'
    },
    buttonDisabled: {
      backgroundColor: '#9ca3af',
      cursor: 'not-allowed'
    },
    errorBox: {
      marginTop: '1rem',
      padding: '0.75rem',
      backgroundColor: '#fef2f2',
      border: '1px solid #fca5a5',
      borderRadius: '0.5rem',
      color: '#dc2626'
    },
    successBox: {
      marginTop: '1.5rem',
      padding: '1rem',
      backgroundColor: '#f0fdf4',
      border: '1px solid #bbf7d0',
      borderRadius: '0.5rem'
    },
    successHeader: {
      fontWeight: '500',
      color: '#15803d',
      marginBottom: '0.5rem'
    },
    successContent: {
      color: '#166534',
      whiteSpace: 'pre-wrap',
      lineHeight: '1.6'
    },
    qualityScore: {
      marginTop: '0.5rem',
      fontSize: '0.875rem',
      color: '#15803d'
    },
    copyButton: {
      marginTop: '0.5rem',
      padding: '0.25rem 0.75rem',
      backgroundColor: '#16a34a',
      color: 'white',
      fontSize: '0.875rem',
      borderRadius: '0.375rem',
      border: 'none',
      cursor: 'pointer'
    },
    guideBox: {
      marginTop: '2rem',
      padding: '1rem',
      backgroundColor: '#f9fafb',
      borderRadius: '0.5rem'
    },
    guideHeader: {
      fontWeight: '500',
      color: '#374151',
      marginBottom: '0.5rem'
    },
    guideList: {
      fontSize: '0.875rem',
      color: '#6b7280',
      margin: '0',
      paddingLeft: '1rem'
    },
    limitMessage: {
      textAlign: 'center',
      fontSize: '0.875rem',
      color: '#6b7280',
      marginTop: '0.5rem'
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
      {/* プラン表示 */}
      <div style={styles.planBadge}>
        <div>
          <span style={styles.planText}>📱 無料プラン</span>
          <div style={styles.usageText}>
            残り {usage.remaining}/3回（本日分）
          </div>
        </div>
      </div>

      {!PREMIUM_FEATURES_ENABLED && (
        <div style={styles.preparingText}>
          プレミアムプラン（無制限生成）は準備中です
        </div>
      )}

      {/* 投稿生成フォーム */}
      <div style={styles.formContainer}>
        <div>
          <label style={styles.label}>
            投稿のテーマ
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="投稿したい内容やテーマを入力してください..."
            style={styles.textarea}
            rows={3}
          />
        </div>

        <div>
          <label style={styles.label}>
            トーン
          </label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            style={styles.select}
          >
            <option value="カジュアル">カジュアル</option>
            <option value="フォーマル">フォーマル</option>
            <option value="フレンドリー">フレンドリー</option>
            <option value="プロフェッショナル">プロフェッショナル</option>
          </select>
        </div>

        <button
          onClick={generatePostWithSharedAPI}
          disabled={isGenerating || !prompt.trim() || usage.remaining === 0}
          style={{
            ...styles.button,
            ...(isGenerating || !prompt.trim() || usage.remaining === 0 ? styles.buttonDisabled : {})
          }}
        >
          {isGenerating ? '🤖 生成中...' :
            usage.remaining === 0 ? '本日の無料生成完了（明日リセット）' :
              '🚀 AI投稿を生成'}
        </button>

        {usage.remaining === 0 && (
          <div style={styles.limitMessage}>
            無料プランは1日3回まで生成可能です。<br />
            明日朝にリセットされます。
          </div>
        )}
      </div>

      {/* エラー表示 */}
      {error && (
        <div style={styles.errorBox}>
          ⚠️ {error}
        </div>
      )}

      {/* 生成された投稿表示 */}
      {generatedPost && (
        <div style={styles.successBox}>
          <h3 style={styles.successHeader}>✨ 生成された投稿</h3>
          <p style={styles.successContent}>{generatedPost}</p>
          {quality && (
            <div style={styles.qualityScore}>
              📊 品質スコア: {quality}/100
            </div>
          )}

          <button
            onClick={() => navigator.clipboard.writeText(generatedPost)}
            style={styles.copyButton}
          >
            📋 コピー
          </button>
        </div>
      )}

      {/* 使用方法説明 */}
      <div style={styles.guideBox}>
        <h3 style={styles.guideHeader}>💡 使い方</h3>
        <ul style={styles.guideList}>
          <li>投稿したいテーマを入力</li>
          <li>お好みのトーンを選択</li>
          <li>生成されたテキストをコピーしてSNSに投稿</li>
          <li>無料プランは1日3回まで利用可能</li>
        </ul>
      </div>
    </div>
  );
};

export default PostGenerator;