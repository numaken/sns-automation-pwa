import React, { useState } from 'react';

function PostGenerator() {
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState('professional');
  const [platform, setPlatform] = useState('Twitter');
  const [generatedPost, setGeneratedPost] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [usage, setUsage] = useState({ remaining: 5, limit: 5, used: 0 }); // 3→5に変更
  const [quality, setQuality] = useState(null);
  const [betaMessage, setBetaMessage] = useState(''); // ベータメッセージ用state追加
  const userPlan = 'free';

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!prompt.trim()) {
      setError('投稿内容を入力してください');
      return;
    }

    setIsLoading(true);
    setError('');
    setBetaMessage(''); // ベータメッセージリセット

    try {
      const response = await fetch('/api/generate-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          tone,
          platform,
          userType: userPlan
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // ベータテスト満員時の特別処理
        if (response.status === 403 && data.isWaitlist) {
          setError(data.message);
          return;
        }

        // レート制限エラー処理
        if (response.status === 429) {
          setError(data.message);
          setUsage({ remaining: 0, limit: 5, used: 5 }); // 3→5に変更
          return;
        }

        throw new Error(data.message || '投稿生成に失敗しました');
      }

      setGeneratedPost(data.post);
      setQuality(data.quality);

      // 使用状況更新
      if (data.usage) {
        setUsage({
          remaining: data.usage.remaining,
          limit: data.usage.limit || 5, // デフォルト5に変更
          used: data.usage.used || (5 - data.usage.remaining) // 3→5に変更
        });
      }

      // ベータメッセージ表示
      if (data.betaMessage) {
        setBetaMessage(data.betaMessage);
      }

    } catch (err) {
      setError(err.message || '予期しないエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPost);
    alert('投稿内容をクリップボードにコピーしました！');
  };

  return (
    <div className="post-generator">
      <div className="header">
        <h1>📱 SNS投稿生成AI</h1>
        <p>AIがあなたのアイデアを魅力的なSNS投稿に変換します</p>
        {userPlan === 'free' && (
          <div className="usage-info">
            <span className="usage-count">
              残り {usage.remaining}/{usage.limit}回 🧪 ベータ
            </span>
          </div>
        )}
      </div>

      {/* ベータメッセージ表示エリア */}
      {betaMessage && (
        <div className="beta-message">
          <span className="beta-icon">🎉</span>
          {betaMessage}
        </div>
      )}

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
          {error.includes('レート制限') && userPlan === 'free' && (
            <div className="error-action">
              <a href="mailto:numaken@gmail.com?subject=プレミアムプラン問い合わせ" className="upgrade-link">
                プレミアムプランで無制限利用 →
              </a>
            </div>
          )}
          {error.includes('ベータテスト中') && (
            <div className="error-action">
              <a href="mailto:numaken@gmail.com?subject=正式リリース通知希望" className="waitlist-link">
                📧 正式リリース通知を受け取る
              </a>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="generator-form">
        <div className="form-group">
          <label htmlFor="prompt">💡 投稿したい内容・アイデア</label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="例: 新商品のマーケティング戦略について考えていること"
            rows={4}
            className="prompt-input"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="tone">🎭 トーン</label>
            <select
              id="tone"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="tone-select"
            >
              <option value="professional">プロフェッショナル</option>
              <option value="casual">カジュアル</option>
              <option value="friendly">フレンドリー</option>
              <option value="enthusiastic">熱意的</option>
              <option value="informative">情報提供型</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="platform">📱 プラットフォーム</label>
            <select
              id="platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="platform-select"
            >
              <option value="Twitter">Twitter</option>
              <option value="Instagram">Instagram</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Facebook">Facebook</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || (userPlan === 'free' && usage.remaining <= 0)}
          className="generate-button"
        >
          {isLoading ? '生成中...' : '投稿を生成する'}
        </button>
      </form>

      {generatedPost && (
        <div className="result-section">
          <div className="result-header">
            <h3>✨ 生成された投稿</h3>
            {quality && (
              <div className="quality-badge">
                <span className="grade">品質: {quality.grade}</span>
                <span className="score">({quality.score}点)</span>
              </div>
            )}
          </div>

          <div className="generated-post">
            <p>{generatedPost}</p>
            <button onClick={copyToClipboard} className="copy-button">
              📋 コピー
            </button>
          </div>

          {quality && quality.feedback && (
            <div className="quality-feedback">
              <span className="feedback-icon">💬</span>
              {quality.feedback}
            </div>
          )}
        </div>
      )}

      <div className="features">
        <h3>🚀 機能</h3>
        <div className="feature-grid">
          <div className="feature-item">
            <span className="feature-icon">🎯</span>
            <h4>プラットフォーム最適化</h4>
            <p>各SNSの特性に合わせた投稿を生成</p>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🎨</span>
            <h4>トーン調整</h4>
            <p>目的に応じて投稿のトーンを調整</p>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📊</span>
            <h4>品質評価</h4>
            <p>生成された投稿の品質を自動評価</p>
          </div>
          <div className="feature-item">
            <span className="feature-icon">⚡</span>
            <h4>高速生成</h4>
            <p>数秒で魅力的な投稿を作成</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PostGenerator;