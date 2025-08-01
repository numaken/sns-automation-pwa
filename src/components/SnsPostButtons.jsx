import React, { useState } from 'react';
import { Twitter, MessageCircle, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const SnsPostButtons = ({
  generatedPost,
  userPlan = 'free',
  platform,
  onPostResult,
  className = ''
}) => {
  const [postingStates, setPostingStates] = useState({});
  const [postResults, setPostResults] = useState({});

  // API endpoint
  const API_ENDPOINT = process.env.REACT_APP_API_URL || window.location.origin;

  // プラン別の利用可能機能チェック
  const canUseDirectPost = userPlan === 'premium' || userPlan === 'standard';
  const canUseMultiPost = userPlan === 'premium';

  // デバッグログ追加
  console.log('🐛 SnsPostButtons Debug:');
  console.log('🐛 userPlan:', userPlan);
  console.log('🐛 canUseDirectPost:', canUseDirectPost);
  console.log('🐛 canUseMultiPost:', canUseMultiPost);

  // 投稿状態の更新
  const updatePostingState = (platform, state) => {
    setPostingStates(prev => ({ ...prev, [platform]: state }));
  };

  // 投稿結果の更新
  const updatePostResult = (platform, result) => {
    setPostResults(prev => ({ ...prev, [platform]: result }));
    if (onPostResult) {
      onPostResult(platform, result);
    }
  };

  // Twitter投稿
  const postToTwitter = async () => {
    updatePostingState('twitter', 'posting');
    updatePostResult('twitter', null);

    try {
      const response = await fetch(`${API_ENDPOINT}/api/post-to-twitter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: generatedPost,
          options: { maxRetries: 3 }
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        updatePostResult('twitter', {
          success: true,
          url: data.url,
          post_id: data.post_id,
          message: data.message
        });
      } else {
        updatePostResult('twitter', {
          success: false,
          error: data.message || 'Twitter投稿に失敗しました'
        });
      }
    } catch (error) {
      updatePostResult('twitter', {
        success: false,
        error: 'ネットワークエラーが発生しました'
      });
    } finally {
      updatePostingState('twitter', null);
    }
  };

  // Threads投稿
  const postToThreads = async () => {
    updatePostingState('threads', 'posting');
    updatePostResult('threads', null);

    try {
      const response = await fetch(`${API_ENDPOINT}/api/post-to-threads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: generatedPost,
          options: { maxRetries: 3 }
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        updatePostResult('threads', {
          success: true,
          url: data.url,
          post_id: data.post_id,
          message: data.message
        });
      } else {
        updatePostResult('threads', {
          success: false,
          error: data.message || 'Threads投稿に失敗しました'
        });
      }
    } catch (error) {
      updatePostResult('threads', {
        success: false,
        error: 'ネットワークエラーが発生しました'
      });
    } finally {
      updatePostingState('threads', null);
    }
  };

  // 同時投稿
  const postToMultiple = async () => {
    updatePostingState('multiple', 'posting');
    updatePostResult('multiple', null);

    try {
      const response = await fetch(`${API_ENDPOINT}/api/post-to-multiple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: generatedPost,
          platforms: ['twitter', 'threads'],
          options: { maxRetries: 3 }
        }),
      });

      const data = await response.json();

      if (response.ok) {
        updatePostResult('multiple', {
          success: data.success,
          partial_success: data.partial_success,
          summary: data.summary,
          results: data.results,
          errors: data.errors,
          message: data.message
        });
      } else {
        updatePostResult('multiple', {
          success: false,
          error: data.message || '同時投稿に失敗しました'
        });
      }
    } catch (error) {
      updatePostResult('multiple', {
        success: false,
        error: 'ネットワークエラーが発生しました'
      });
    } finally {
      updatePostingState('multiple', null);
    }
  };

  // 投稿ボタンのレンダリング
  const renderPostButton = (platformKey, label, icon, onClick, isPrimary = false) => {
    const isPosting = postingStates[platformKey] === 'posting';
    const result = postResults[platformKey];

    const buttonClass = `post-button ${isPrimary ? 'primary-button' : 'secondary-button'} ${isPosting ? 'posting' : ''
      } ${result?.success ? 'success' : ''} ${result?.success === false ? 'error' : ''}`;

    return (
      <button
        className={buttonClass}
        onClick={onClick}
        disabled={isPosting || !generatedPost}
        title={!canUseDirectPost ? 'スタンダード/プレミアムプランで利用可能' : ''}
      >
        {isPosting ? (
          <>
            <Loader2 className="button-icon spinning" size={16} />
            投稿中...
          </>
        ) : result?.success ? (
          <>
            <CheckCircle className="button-icon" size={16} />
            投稿完了
          </>
        ) : result?.success === false ? (
          <>
            <AlertCircle className="button-icon" size={16} />
            再試行
          </>
        ) : (
          <>
            {icon}
            {label}
          </>
        )}
      </button>
    );
  };

  // 投稿結果の表示
  const renderPostResults = () => {
    const hasResults = Object.keys(postResults).some(key => postResults[key]);

    if (!hasResults) return null;

    return (
      <div className="post-results">
        <h4>投稿結果</h4>
        {Object.entries(postResults).map(([platformKey, result]) => {
          if (!result) return null;

          return (
            <div key={platformKey} className={`result-item ${result.success ? 'success' : 'error'}`}>
              <div className="result-platform">
                {platformKey === 'twitter' && <Twitter size={16} />}
                {platformKey === 'threads' && <MessageCircle size={16} />}
                {platformKey === 'multiple' && <Send size={16} />}
                <span className="platform-name">
                  {platformKey === 'twitter' && 'Twitter'}
                  {platformKey === 'threads' && 'Threads'}
                  {platformKey === 'multiple' && '同時投稿'}
                </span>
              </div>

              <div className="result-content">
                {result.success ? (
                  <>
                    <span className="success-message">{result.message}</span>
                    {result.url && (
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="post-link"
                      >
                        投稿を見る →
                      </a>
                    )}
                    {result.results && (
                      <div className="multiple-results">
                        {result.results.map((platformResult, index) => (
                          <div key={index} className="platform-result">
                            <span>{platformResult.platform}:</span>
                            <a
                              href={platformResult.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="post-link"
                            >
                              投稿を見る
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <span className="error-message">{result.error}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`sns-post-buttons ${className}`}>
      {/* 無料プランの場合は機能制限の説明 */}
      {!canUseDirectPost && (
        <div className="feature-notice">
          <span className="notice-text">
            直接投稿機能はスタンダード/プレミアムプランで利用できます
          </span>
        </div>
      )}

      {/* 投稿ボタン群 */}
      <div className="post-buttons-grid">
        {canUseDirectPost && (
          <>
            {renderPostButton(
              'twitter',
              'Twitterに投稿',
              <Twitter className="button-icon" size={16} />,
              postToTwitter
            )}

            {renderPostButton(
              'threads',
              'Threadsに投稿',
              <MessageCircle className="button-icon" size={16} />,
              postToThreads
            )}
          </>
        )}

        {canUseMultiPost && (
          renderPostButton(
            'multiple',
            '同時投稿',
            <Send className="button-icon" size={16} />,
            postToMultiple,
            true
          )
        )}
      </div>

      {/* 投稿結果表示 */}
      {renderPostResults()}

      {/* プラン別機能説明 */}
      {userPlan === 'free' && (
        <div className="plan-features">
          <div className="feature-list">
            <div className="feature-item">
              <span className="plan-name">スタンダード</span>
              <span className="feature-desc">Twitter・Threads個別投稿</span>
            </div>
            <div className="feature-item">
              <span className="plan-name">プレミアム</span>
              <span className="feature-desc">全機能 + 同時投稿</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SnsPostButtons;