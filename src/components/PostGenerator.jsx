import React, { useState, useEffect } from 'react';
import { useUserPlan } from '../hooks/useUserPlan';
import UpgradePrompt from './UpgradePrompt';
import './PostGenerator.css';

const PostGenerator = () => {
  // プラン管理
  const { userPlan, isPremium, isLoading: planLoading, refreshPlan } = useUserPlan();

  // 状態管理
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState('カジュアル');
  const [generatedPost, setGeneratedPost] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [quality, setQuality] = useState(null);
  const [usage, setUsage] = useState({ remaining: 3 });
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // SNS投稿関連
  const [isPostingToSNS, setIsPostingToSNS] = useState({
    twitter: false,
    threads: false
  });
  const [snsPostResults, setSnsPostResults] = useState({
    twitter: null,
    threads: null
  });

  // 統計情報
  const [stats, setStats] = useState({
    totalGenerations: 0,
    averageQuality: 0,
    averageTime: 0
  });

  // コンポーネント初期化
  useEffect(() => {
    loadStats();
    loadUsage();
  }, []);

  // プラン変更時の処理
  useEffect(() => {
    if (userPlan === 'premium') {
      setUsage({ remaining: 'unlimited' });
    }
  }, [userPlan]);

  // 統計情報読み込み
  const loadStats = () => {
    try {
      const savedStats = localStorage.getItem('generationStats');
      if (savedStats) {
        setStats(JSON.parse(savedStats));
      }
    } catch (error) {
      console.error('Stats loading error:', error);
    }
  };

  // 使用量読み込み
  const loadUsage = () => {
    try {
      const savedUsage = localStorage.getItem('dailyUsage');
      const today = new Date().toISOString().split('T')[0];

      if (savedUsage) {
        const usageData = JSON.parse(savedUsage);
        if (usageData.date === today) {
          setUsage({ remaining: Math.max(0, 3 - usageData.count) });
        }
      }
    } catch (error) {
      console.error('Usage loading error:', error);
    }
  };

  // AI投稿生成（プラン別処理）
  const handleGenerateClick = () => {
    if (isPremium) {
      // プレミアムプランは無制限（個人APIキー使用）
      generatePost();
    } else {
      // 無料プランは共有APIキー使用
      generatePostWithSharedAPI();
    }
  };

  // プレミアム版生成（個人APIキー使用）
  const generatePost = async () => {
    if (!prompt.trim()) {
      setError('投稿のテーマを入力してください');
      return;
    }

    setIsLoading(true);
    setError('');
    setGeneratedPost('');
    const startTime = Date.now();

    try {
      const response = await fetch('/api/generate-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          tone,
          userType: 'premium'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '投稿生成に失敗しました');
      }

      const generationTime = Date.now() - startTime;

      setGeneratedPost(data.post);
      setQuality(data.quality);

      // 統計更新
      updateStats(data.quality, generationTime);

    } catch (error) {
      console.error('Generate post error:', error);
      setError('ネットワークエラーが発生しました。しばらく待ってから再試行してください。');
    } finally {
      setIsLoading(false);
    }
  };

  // 無料版生成（共有APIキー使用）
  const generatePostWithSharedAPI = async () => {
    if (!prompt.trim()) {
      setError('投稿のテーマを入力してください');
      return;
    }

    setIsLoading(true);
    setError('');
    setGeneratedPost('');
    const startTime = Date.now();

    try {
      const response = await fetch('/api/generate-post-shared', {
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
          setError('1日の無料生成回数を超えました。プレミアムプランで無制限生成！');
          setUsage({ remaining: 0 });
          setShowUpgradePrompt(true);
        } else if (response.status === 503) {
          setError('システム負荷により一時的に利用できません。しばらく後にお試しください。');
        } else {
          throw new Error(data.error || '投稿生成に失敗しました');
        }
        return;
      }

      const generationTime = Date.now() - startTime;

      setGeneratedPost(data.post);
      setQuality(data.quality);

      if (data.usage) {
        setUsage(data.usage);
        // ローカルストレージに使用量保存
        saveDailyUsage(3 - data.usage.remaining);
      }

      // 統計更新
      updateStats(data.quality, generationTime);

      // 使用量表示の更新
      if (data.usage.remaining <= 1) {
        setShowUpgradePrompt(true);
      }

    } catch (error) {
      console.error('Generate post error:', error);
      setError('ネットワークエラーが発生しました。しばらく待ってから再試行してください。');
    } finally {
      setIsLoading(false);
    }
  };

  // SNS投稿関数
  const postToSNS = async (platform) => {
    if (!generatedPost) {
      setError('投稿するコンテンツがありません。まず投稿を生成してください。');
      return;
    }

    // プレミアムプランチェック
    if (!isPremium) {
      setError(`${platform === 'twitter' ? 'Twitter' : 'Threads'}投稿はプレミアムプラン限定機能です。`);
      setShowUpgradePrompt(true);
      return;
    }

    // SNS設定チェック
    const requiredSettings = getSNSRequiredSettings(platform);
    if (!hasRequiredSNSSettings(platform, requiredSettings)) {
      setError(`${platform === 'twitter' ? 'Twitter' : 'Threads'}の設定が不完全です。設定画面で認証情報を入力してください。`);
      return;
    }

    try {
      setIsPostingToSNS({ ...isPostingToSNS, [platform]: true });
      setError('');
      setSnsPostResults({ ...snsPostResults, [platform]: null });

      const authToken = getAuthToken();
      if (!authToken) {
        throw new Error('認証情報が見つかりません。ログインし直してください。');
      }

      const apiEndpoint = platform === 'twitter' ? '/api/post-to-twitter' : '/api/post-to-threads';
      const payload = buildSNSPayload(platform, generatedPost, requiredSettings);

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        handleSNSError(platform, response.status, data);
        return;
      }

      // 成功処理
      setSnsPostResults({
        ...snsPostResults,
        [platform]: {
          success: true,
          message: data.message,
          id: data.tweet_id || data.post_id,
          posted_at: data.posted_at,
          url: data.tweet_url || data.post_url
        }
      });

      // 統計更新
      updateSNSPostStats(platform);

    } catch (error) {
      console.error(`${platform} post error:`, error);
      handleSNSNetworkError(platform, error);
    } finally {
      setIsPostingToSNS({ ...isPostingToSNS, [platform]: false });
    }
  };

  // エラーハンドリング関数
  const handleSNSError = (platform, status, data) => {
    const platformName = platform === 'twitter' ? 'Twitter' : 'Threads';

    switch (status) {
      case 401:
        setSnsPostResults({
          ...snsPostResults,
          [platform]: {
            success: false,
            error: '認証エラー',
            message: `${platformName}の認証情報を確認してください。`,
            code: data.code
          }
        });
        break;

      case 403:
        setSnsPostResults({
          ...snsPostResults,
          [platform]: {
            success: false,
            error: 'プレミアム限定',
            message: data.message,
            upgrade_required: true
          }
        });
        setShowUpgradePrompt(true);
        break;

      case 400:
        setSnsPostResults({
          ...snsPostResults,
          [platform]: {
            success: false,
            error: '設定エラー',
            message: data.message || `${platformName}の設定を確認してください。`,
            details: data.required,
            code: data.code
          }
        });
        break;

      case 503:
        setSnsPostResults({
          ...snsPostResults,
          [platform]: {
            success: false,
            error: 'サービス一時停止',
            message: data.message || 'しばらく待ってから再試行してください。',
            retry_after: data.retry_after
          }
        });
        break;

      default:
        setSnsPostResults({
          ...snsPostResults,
          [platform]: {
            success: false,
            error: `${platformName}投稿エラー`,
            message: data.message || `${platformName}への投稿に失敗しました。`,
            code: data.code
          }
        });
    }
  };

  // ネットワークエラーハンドリング
  const handleSNSNetworkError = (platform, error) => {
    const platformName = platform === 'twitter' ? 'Twitter' : 'Threads';

    let errorMessage = 'ネットワークエラーが発生しました';
    let errorDetails = '';

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      errorMessage = 'インターネット接続を確認してください';
      errorDetails = 'ネットワーク接続に問題があります';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'タイムアウトが発生しました';
      errorDetails = 'しばらく待ってから再試行してください';
    } else {
      errorDetails = error.message;
    }

    setSnsPostResults({
      ...snsPostResults,
      [platform]: {
        success: false,
        error: errorMessage,
        message: errorDetails,
        platform: platformName
      }
    });
  };

  // ユーティリティ関数
  const getSNSRequiredSettings = (platform) => {
    const settings = JSON.parse(localStorage.getItem('snsSettings') || '{}');

    if (platform === 'twitter') {
      return {
        apiKey: settings.twitterApiKey,
        apiSecret: settings.twitterApiSecret,
        accessToken: settings.twitterAccessToken,
        accessTokenSecret: settings.twitterAccessTokenSecret
      };
    } else if (platform === 'threads') {
      return {
        accessToken: settings.threadsAccessToken
      };
    }

    return {};
  };

  const hasRequiredSNSSettings = (platform, settings) => {
    if (platform === 'twitter') {
      return settings.apiKey && settings.apiSecret &&
        settings.accessToken && settings.accessTokenSecret;
    } else if (platform === 'threads') {
      return settings.accessToken;
    }
    return false;
  };

  const buildSNSPayload = (platform, text, settings) => {
    if (platform === 'twitter') {
      return {
        text,
        apiKey: settings.apiKey,
        apiSecret: settings.apiSecret,
        accessToken: settings.accessToken,
        accessTokenSecret: settings.accessTokenSecret
      };
    } else if (platform === 'threads') {
      return {
        text,
        accessToken: settings.accessToken
      };
    }
    return { text };
  };

  const getAuthToken = () => {
    return localStorage.getItem('authToken') ||
      localStorage.getItem('userToken') ||
      'test-premium-token'; // 開発用
  };


  // 同時投稿関数 - PostGenerator.jsx内に追加

  // 同時投稿関数（全SNSに一括投稿）
  const postToAllSNS = async () => {
    if (!generatedPost) {
      setError('投稿するコンテンツがありません。まず投稿を生成してください。');
      return;
    }

    // プレミアムプランチェック
    if (!isPremium) {
      setError('同時投稿機能はプレミアムプラン限定です。TwitterとThreadsに一括投稿できます！');
      setShowUpgradePrompt(true);
      return;
    }

    // 既に投稿中の場合はスキップ
    if (isPostingToSNS.twitter || isPostingToSNS.threads) {
      setError('投稿処理中です。しばらくお待ちください。');
      return;
    }

    try {
      setError('');

      // Twitter と Threads に同時投稿
      const platforms = ['twitter', 'threads'];
      const promises = platforms.map(platform => postToSNS(platform));

      // 両方の投稿を並行実行
      await Promise.allSettled(promises);

      // 結果を確認
      const twitterSuccess = snsPostResults.twitter?.success;
      const threadsSuccess = snsPostResults.threads?.success;

      if (twitterSuccess && threadsSuccess) {
        // 両方成功
        setError(''); // 成功時はエラーをクリア
      } else if (twitterSuccess || threadsSuccess) {
        // 一部成功
        const successPlatform = twitterSuccess ? 'Twitter' : 'Threads';
        const failedPlatform = twitterSuccess ? 'Threads' : 'Twitter';
        setError(`${successPlatform}への投稿は成功しましたが、${failedPlatform}への投稿に失敗しました。個別投稿で再試行してください。`);
      } else {
        // 両方失敗
        setError('同時投稿に失敗しました。個別投稿で再試行してください。');
      }

    } catch (error) {
      console.error('Simultaneous post error:', error);
      setError('同時投稿でエラーが発生しました。個別投稿で再試行してください。');
    }
  };

  // 統計更新関数
  const updateStats = (newQuality, generationTime) => {
    const newStats = {
      totalGenerations: stats.totalGenerations + 1,
      averageQuality: Math.round(((stats.averageQuality * stats.totalGenerations) + newQuality) / (stats.totalGenerations + 1)),
      averageTime: Math.round(((stats.averageTime * stats.totalGenerations) + generationTime) / (stats.totalGenerations + 1))
    };

    setStats(newStats);
    localStorage.setItem('generationStats', JSON.stringify(newStats));
  };

  const updateSNSPostStats = (platform) => {
    const snsStats = JSON.parse(localStorage.getItem('snsPostStats') || '{}');
    const today = new Date().toISOString().split('T')[0];

    if (!snsStats[today]) {
      snsStats[today] = {};
    }

    snsStats[today][platform] = (snsStats[today][platform] || 0) + 1;
    localStorage.setItem('snsPostStats', JSON.stringify(snsStats));
  };

  const saveDailyUsage = (count) => {
    const today = new Date().toISOString().split('T')[0];
    const usageData = {
      date: today,
      count: count
    };
    localStorage.setItem('dailyUsage', JSON.stringify(usageData));
  };

  // クリップボードコピー
  const copyToClipboard = () => {
    if (generatedPost) {
      navigator.clipboard.writeText(generatedPost);
      // 成功メッセージ表示（一時的）
      const originalText = generatedPost;
      setGeneratedPost('📋 コピーしました！');
      setTimeout(() => setGeneratedPost(originalText), 1000);
    }
  };

  // 品質グレード計算
  const getQualityGrade = (score) => {
    if (score >= 90) return 'S';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    return 'D';
  };

  // レンダリング
  if (planLoading) {
    return <div className="loading-container">プラン情報を読み込み中...</div>;
  }

  return (
    <div className="post-generator">
      {/* ヘッダー */}
      <div className="header">
        <h1>📝 SNS自動化ツール</h1>
        {isPremium && (
          <div className="premium-badge">
            <span className="crown">👑</span>
            <span>PREMIUM MEMBER</span>
          </div>
        )}
      </div>

      {/* プラン情報 */}
      <div className={`plan-info ${isPremium ? 'premium' : 'free'}`}>
        <div className="plan-header">
          {isPremium ? (
            <>
              <span className="plan-title">無制限AI投稿生成</span>
              <span className="plan-badge premium">無制限</span>
            </>
          ) : (
            <>
              <span className="plan-title">今日の生成残数</span>
              <span className="plan-badge free">{usage.remaining}/3回</span>
            </>
          )}
        </div>
      </div>

      {/* 投稿生成フォーム */}
      <div className="generation-form">
        <div className="form-group">
          <label>📝 投稿のテーマ</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="投稿したい内容やテーマを入力してください..."
            rows={4}
            maxLength={500}
          />
        </div>

        <div className="form-group">
          <label>🎭 トーン</label>
          <select value={tone} onChange={(e) => setTone(e.target.value)}>
            <option value="カジュアル">😊 カジュアル</option>
            <option value="プロフェッショナル">💼 プロフェッショナル</option>
            <option value="フレンドリー">🤝 フレンドリー</option>
            <option value="エネルギッシュ">⚡ エネルギッシュ</option>
          </select>
        </div>

        <button
          onClick={handleGenerateClick}
          disabled={isLoading || !prompt.trim()}
          className={`generate-button ${isPremium ? 'premium' : 'free'}`}
        >
          {isLoading ? (
            <>
              <span className="loading-spinner">⏳</span>
              生成中...
            </>
          ) : (
            <>
              ⚡ 高速AI生成
              {isPremium && <span className="premium-label">無制限</span>}
            </>
          )}
        </button>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {/* 生成結果 */}
      {generatedPost && (
        <div className="generated-content">
          <h3>生成された投稿</h3>
          <div className="post-content">
            <p>{generatedPost}</p>

            {quality && (
              <div className="quality-info">
                <span className="quality-score">
                  ⭐ 品質スコア: {quality}点/100
                </span>
                <span className="quality-grade">
                  {getQualityGrade(quality)}グレード
                </span>
              </div>
            )}
          </div>

          <div className="action-buttons">
            <button onClick={copyToClipboard} className="copy-button">
              📋 クリップボードにコピー
            </button>
          </div>
        </div>
      )}

      {/* SNS投稿セクション */}
      {generatedPost && (
        <div className="sns-posting">
          <h3>同時投稿</h3>

          {/* 同時投稿ボタン（メイン） */}
          <div className="simultaneous-posting">
            <button
              onClick={() => postToAllSNS()}
              disabled={!generatedPost || (!isPremium) || isPostingToSNS.twitter || isPostingToSNS.threads}
              className={`simultaneous-post-button ${!isPremium ? 'premium-required' : ''}`}
            >
              {isPremium ? (
                <>
                  🚀 全SNSに同時投稿
                  {(isPostingToSNS.twitter || isPostingToSNS.threads) && <span className="loading-spinner">⏳</span>}
                </>
              ) : (
                <>
                  👑 全SNSに同時投稿（プレミアム限定）
                </>
              )}
            </button>

            {!isPremium && (
              <p className="premium-hint">
                プレミアムプランで Twitter・Threads に一括投稿できます
              </p>
            )}
          </div>

          {/* 個別投稿セクション */}
          <div className="individual-posting">
            <h4>個別投稿</h4>

            {/* Twitter */}
            <div className="sns-platform">
              <div className="platform-header">
                <span className="platform-icon">🐦</span>
                <span className="platform-name">Twitter</span>
                {!isPremium && <span className="premium-required-badge">プレミアム限定</span>}
                {isPostingToSNS.twitter && (
                  <span className="posting-indicator">投稿中...</span>
                )}
              </div>

              {snsPostResults.twitter ? (
                <SNSResultMessage
                  platform="twitter"
                  result={snsPostResults.twitter}
                  onRetry={() => postToSNS('twitter')}
                  onClearResult={() => setSnsPostResults({ ...snsPostResults, twitter: null })}
                />
              ) : (
                <button
                  onClick={() => postToSNS('twitter')}
                  disabled={!generatedPost || isPostingToSNS.twitter}
                  className={`sns-post-button ${!isPremium ? 'premium-required' : ''}`}
                >
                  {isPremium ? 'Twitterに投稿' : 'Twitterに投稿（プレミアム限定）'}
                </button>
              )}
            </div>

            {/* Threads */}
            <div className="sns-platform">
              <div className="platform-header">
                <span className="platform-icon">📸</span>
                <span className="platform-name">Threads</span>
                {!isPremium && <span className="premium-required-badge">プレミアム限定</span>}
                {isPostingToSNS.threads && (
                  <span className="posting-indicator">投稿中...</span>
                )}
              </div>

              {snsPostResults.threads ? (
                <SNSResultMessage
                  platform="threads"
                  result={snsPostResults.threads}
                  onRetry={() => postToSNS('threads')}
                  onClearResult={() => setSnsPostResults({ ...snsPostResults, threads: null })}
                />
              ) : (
                <button
                  onClick={() => postToSNS('threads')}
                  disabled={!generatedPost || isPostingToSNS.threads}
                  className={`sns-post-button ${!isPremium ? 'premium-required' : ''}`}
                >
                  {isPremium ? 'Threadsに投稿' : 'Threadsに投稿（プレミアム限定）'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 統計情報（プレミアム限定） */}
      {isPremium && stats.totalGenerations > 0 && (
        <div className="stats-section">
          <h3>📊 統計情報</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-value">{stats.totalGenerations}</span>
              <span className="stat-label">生成回数</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.averageQuality}</span>
              <span className="stat-label">平均品質</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{(stats.averageTime / 1000).toFixed(1)}s</span>
              <span className="stat-label">平均生成時間</span>
            </div>
          </div>
        </div>
      )}

      {/* 使い方ガイド */}
      <div className="usage-guide">
        <h3>💡 使い方ガイド</h3>
        <ol>
          <li>投稿したいテーマを具体的に入力</li>
          <li>お好みのトーンを選択</li>
          <li>⚡ 高速AI生成ボタンをクリック</li>
          <li>生成されたテキストをコピーしてSNSに投稿</li>
        </ol>
      </div>

      {/* プレミアム促進（無料プランのみ） */}
      {!isPremium && (
        <div className="premium-promotion">
          <div className="promotion-header">
            <span className="crown">👑</span>
            <h3>1回生成して気に入ったら無制限利用中</h3>
          </div>
          <button
            onClick={() => setShowUpgradePrompt(true)}
            className="upgrade-button"
          >
            1日生成数0 | 無制限利用中
          </button>
        </div>
      )}

      {/* アップグレードプロンプト */}
      <UpgradePrompt
        isVisible={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        onUpgrade={() => {
          // アップグレード処理
          window.location.href = '/upgrade';
        }}
        remainingUses={typeof usage.remaining === 'number' ? usage.remaining : 0}
      />
    </div>
  );
};

// SNS結果メッセージコンポーネント
const SNSResultMessage = ({ platform, result, onRetry, onClearResult }) => {
  const platformName = platform === 'twitter' ? 'Twitter' : 'Threads';

  if (result.success) {
    return (
      <div className="sns-result success">
        <div className="success-icon">✅</div>
        <div className="success-content">
          <strong>{platformName}投稿成功</strong>
          <p>{result.message}</p>
          {result.url && (
            <a href={result.url} target="_blank" rel="noopener noreferrer" className="post-link">
              投稿を確認
            </a>
          )}
          <button onClick={onClearResult} className="clear-button">
            ×
          </button>
        </div>
      </div>
    );
  }

  // エラー表示
  return (
    <div className="sns-result error">
      <div className="error-icon">❌</div>
      <div className="error-content">
        <strong>{result.error}</strong>
        <p>{result.message}</p>

        {/* エラー種別に応じた追加情報 */}
        {result.code === 'PREMIUM_REQUIRED' && (
          <div className="upgrade-suggestion">
            <button className="upgrade-button-small">
              プレミアムにアップグレード
            </button>
          </div>
        )}

        {result.code === 'INCOMPLETE_TWITTER_CONFIG' && result.details && (
          <div className="config-suggestion">
            <p>必要な設定項目:</p>
            <ul>
              {result.details.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
            <button className="config-button">
              設定を完了する
            </button>
          </div>
        )}

        {(result.code === 'NETWORK_ERROR' || result.code === 'INTERNAL_ERROR') && (
          <div className="retry-suggestion">
            <button onClick={onRetry} className="retry-button">
              再試行
            </button>
          </div>
        )}

        <button onClick={onClearResult} className="clear-button">
          ×
        </button>
      </div>
    </div>
  );
};

export default PostGenerator;