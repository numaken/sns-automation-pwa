import React, { useState, useEffect } from 'react';
import SnsPostButtons from './SnsPostButtons';
import './PostGenerator.css';
import './SnsPostButtons.css';

const PostGenerator = ({ userPlan = 'premium' }) => {
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState('casual');
  const [platform, setPlatform] = useState('Twitter');
  const [generatedPost, setGeneratedPost] = useState('');
  const [quality, setQuality] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [usage, setUsage] = useState({ remaining: 5 });
  const [postResults, setPostResults] = useState({}); // SNS投稿結果管理

  // API endpoint (Vercel deployment URL)
  const API_ENDPOINT = process.env.REACT_APP_API_URL || window.location.origin;

  useEffect(() => {
    // 初回読み込み時に使用状況を取得
    fetchUsageStatus();
  }, []);

  const fetchUsageStatus = async () => {
    if (userPlan !== 'free') return;

    try {
      const response = await fetch(`${API_ENDPOINT}/api/usage-status`);
      if (response.ok) {
        const data = await response.json();
        setUsage({ remaining: data.remaining });
      }
    } catch (error) {
      console.error('Usage status fetch error:', error);
    }
  };

  const generatePost = async () => {
    if (!prompt.trim()) {
      setError('投稿のテーマを入力してください');
      return;
    }

    setIsLoading(true);
    setError('');
    setGeneratedPost('');
    setQuality(null);
    setPostResults({}); // 投稿結果をリセット

    try {
      const response = await fetch(`${API_ENDPOINT}/api/generate-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          tone,
          platform,
          userType: userPlan
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setError(data.message || 'レート制限に達しました');
          setUsage({ remaining: 0 });
        } else {
          setError(data.message || '投稿生成に失敗しました');
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
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedPost);
      // 簡易フィードバック表示
      const button = document.querySelector('.copy-button');
      if (button) {
        const original = button.textContent;
        button.textContent = 'コピー完了！';
        setTimeout(() => {
          button.textContent = original;
        }, 2000);
      }
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const shareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(generatedPost)}`;
    window.open(url, '_blank');
  };

  // SNS投稿結果のハンドリング
  const handlePostResult = (platform, result) => {
    setPostResults(prev => ({
      ...prev,
      [platform]: result
    }));
  };

  const getQualityColor = (grade) => {
    const colors = {
      'A': '#4CAF50',
      'B': '#2196F3',
      'C': '#FF9800',
      'D': '#F44336'
    };
    return colors[grade] || '#757575';
  };

  const canGenerate = userPlan === 'premium' || usage.remaining > 0;

  return (
    <div className="post-generator">
      <div className="generator-header">
        <h2>✨ AI投稿生成</h2>
        {userPlan === 'free' && (
          <div className="usage-display">
            <span className={`usage-count ${usage.remaining === 0 ? 'depleted' : ''}`}>
              残り {usage.remaining}/5回
            </span>
          </div>
        )}
      </div>

      <div className="input-section">
        <div className="input-group">
          <label htmlFor="prompt">投稿のテーマ・内容</label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="例: 新しいカフェを見つけた感想、読書の習慣について、週末の過ごし方..."
            rows="3"
            disabled={isLoading}
          />
        </div>

        <div className="options-grid">
          <div className="input-group">
            <label htmlFor="tone">トーン</label>
            <select
              id="tone"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              disabled={isLoading}
            >
              <option value="casual">カジュアル</option>
              <option value="professional">プロフェッショナル</option>
              <option value="friendly">フレンドリー</option>
              <option value="enthusiastic">熱意的</option>
              <option value="thoughtful">思慮深い</option>
            </select>
          </div>

          <div className="input-group">
            <label htmlFor="platform">プラットフォーム</label>
            <select
              id="platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              disabled={isLoading}
            >
              <option value="Twitter">Twitter</option>
              <option value="Instagram">Instagram</option>
              <option value="Facebook">Facebook</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Threads">Threads</option>
            </select>
          </div>
        </div>

        <button
          className={`generate-button ${!canGenerate ? 'disabled' : ''}`}
          onClick={generatePost}
          disabled={isLoading || !canGenerate}
        >
          {isLoading ? (
            <>
              <span className="loading-spinner"></span>
              生成中...
            </>
          ) : canGenerate ? (
            '🚀 投稿を生成'
          ) : (
            '本日の無料生成を使い切りました'
          )}
        </button>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
          {error.includes('レート制限') && userPlan === 'free' && (
            <div className="error-action">
              <a href="#premium" className="upgrade-link">
                プレミアムプランで無制限生成 →
              </a>
            </div>
          )}
        </div>
      )}

      {generatedPost && (
        <div className="result-section">
          <div className="result-header">
            <h3>生成された投稿</h3>
            {quality && (
              <div className="quality-badge" style={{ backgroundColor: getQualityColor(quality.grade) }}>
                <span className="quality-grade">{quality.grade}</span>
                <span className="quality-score">{quality.score}/100</span>
              </div>
            )}
          </div>

          <div className="generated-post">
            {generatedPost}
          </div>

          {quality && (
            <div className="quality-feedback">
              <strong>品質評価:</strong> {quality.feedback}
            </div>
          )}

          <div className="action-buttons">
            <button
              className="copy-button secondary-button"
              onClick={copyToClipboard}
            >
              📋 コピー
            </button>

            {platform === 'Twitter' && (
              <button
                className="share-button secondary-button"
                onClick={shareToTwitter}
              >
                🐦 Twitterで投稿
              </button>
            )}
          </div>

          {/* SNS投稿機能統合 */}
          <SnsPostButtons
            generatedPost={generatedPost}
            userPlan={userPlan}
            platform={platform}
            onPostResult={handlePostResult}
            className="integrated-sns-buttons"
          />
        </div>
      )}

      {userPlan === 'free' && !error && (
        <div className="upgrade-promotion">
          <div className="promo-content">
            <h4>🎯 プレミアムプランでできること</h4>
            <ul>
              <li>✅ 無制限の投稿生成</li>
              <li>✅ 直接SNS投稿機能</li>
              <li>✅ Twitter・Threads同時投稿</li>
              <li>✅ より高品質なAI生成</li>
              <li>✅ 広告なしのクリーンUI</li>
            </ul>
            <button className="upgrade-button">
              月額¥980でアップグレード →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostGenerator;