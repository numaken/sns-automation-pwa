// src/components/PostGenerator.jsx
// 🆕 サブスクリプション管理機能統合完全版

import React, { useState, useEffect } from 'react';
import { Settings, ArrowLeft } from 'lucide-react';
import { useUserPlan } from '../hooks/useUserPlan';
import UpgradePrompt from './UpgradePrompt';
import SubscriptionManager from './SubscriptionManager';

// 🔧 重要: CSSファイルのインポート（先頭に配置）
import './PostGenerator.css';


const PostGenerator = () => {
  // 🆕 ビュー管理（メイン画面 or 設定画面）
  const [currentView, setCurrentView] = useState('generator'); // 'generator' | 'subscription'

  // プラン管理
  const { userPlan, isPremium, isLoading: planLoading, refreshPlan, upgradeTopremium } = useUserPlan();

  // 🆕 ユーザーID管理（Stripe統合用）
  const [userId, setUserId] = useState('');

  // 他の既存のstate...
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

  // 🆕 プレミアムボタン緊急修正（引き継ぎ書類指示）
  useEffect(() => {
    const fixPremiumButton = () => {
      const button = document.querySelector('.upgrade-button');
      if (button && !button.dataset.fixed) {
        console.log('🔧 プレミアムボタンの緊急修正を実行中...');

        // 既存ボタンをクローンして置き換え
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);

        // 修正済みマークを付与
        newButton.dataset.fixed = 'true';

        // 新しいクリックハンドラーを設定
        newButton.onclick = function (e) {
          e.preventDefault();
          e.stopPropagation();

          // ボタンを無効化して処理中表示
          this.disabled = true;
          this.innerHTML = '⏳ 決済画面を準備中...';

          // Stripe決済セッション作成
          fetch('https://sns-automation-pwa.vercel.app/api/create-checkout-session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              userId: 'button-fix-' + Date.now()
            })
          })
            .then(res => res.json())
            .then(data => {
              console.log('✅ Stripe セッション作成成功:', data);
              if (data.url) {
                // 決済画面にリダイレクト
                window.location.href = data.url;
              } else {
                throw new Error('決済URLが取得できませんでした');
              }
            })
            .catch(err => {
              console.error('❌ 決済セッション作成エラー:', err);
              // ボタンを元に戻す
              this.disabled = false;
              this.innerHTML = '💎 プレミアムプランを見る（¥980/月）';
              alert('決済画面の準備でエラーが発生しました。もう一度お試しください。');
            });
        };

        console.log('✅ プレミアムボタンの修正完了');
      }
    };

    // DOM読み込み後に修正実行
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fixPremiumButton);
    } else {
      fixPremiumButton();
    }

    // React rendering後にもう一度実行
    const timeoutId = setTimeout(fixPremiumButton, 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  // コンポーネント初期化
  useEffect(() => {
    loadStats();
    loadUsage();
  }, []);

  // 🆕 ユーザーID初期化（Stripe統合用）
  useEffect(() => {
    const storedUserId = localStorage.getItem('sns_automation_user_id');
    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      const newUserId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('sns_automation_user_id', newUserId);
      setUserId(newUserId);
    }
  }, []);

  // プラン変更時の処理
  useEffect(() => {
    if (userPlan === 'premium') {
      setUsage({ remaining: 'unlimited' });
    }
  }, [userPlan]);

  // 🆕 プラン変更ハンドラー
  const handlePlanChange = (newPlan) => {
    console.log('🔄 Plan changed to:', newPlan);
    localStorage.setItem('userPlan', newPlan);

    if (refreshPlan) {
      refreshPlan();
    }

    if (newPlan === 'premium') {
      setUsage({ remaining: 'unlimited' });
    } else {
      loadUsage();
    }
  };

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
  // 基本的な関数群（引き継ぎ書類から）
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

  // 🆕 修正されたupgradeToPremium関数（引き継ぎ書類指示）
  const upgradeToPremium = async () => {
    try {
      console.log('🚀 upgradeToPremium 関数が呼び出されました');

      const response = await fetch('https://sns-automation-pwa.vercel.app/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId || 'upgrade-' + Date.now()
        }),
      });

      const data = await response.json();
      console.log('✅ Stripe レスポンス:', data);

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('❌ 決済URLが見つかりません:', data);
        alert('決済画面の準備でエラーが発生しました。');
      }
    } catch (error) {
      console.error('❌ upgradeToPremium エラー:', error);
      alert('決済機能でエラーが発生しました。');
    }
  };

  // レンダリング
  if (planLoading) {
    return (
      <div className="post-generator">
        <div className="loading-container">プラン情報を読み込み中...</div>
      </div>
    );
  }


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

  // 1. プレミアム版生成関数（PWAエラー対策追加）
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
      // PWAエラー対策: タイムアウト付きリクエスト
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

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
        signal: controller.signal
      });

      clearTimeout(timeoutId);
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

      // PWAエラー対策: 詳細なエラーハンドリング
      if (error.name === 'AbortError') {
        setError('リクエストがタイムアウトしました。再試行してください。');
      } else if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
        setError('ネットワークエラーです。接続を確認してください。');
      } else if (error.message.includes('message channel closed')) {
        setError('PWAエラーが発生しました。ページを更新して再試行してください。');
      } else {
        setError('投稿生成でエラーが発生しました。再試行してください。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 2. 無料版生成関数（PWAエラー対策追加）
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
      // PWAエラー対策: タイムアウト付きリクエスト
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

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
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setError('1日の無料生成回数を超えました。プレミアムプランで無制限生成！');
          setUsage({ remaining: 0 });
          setShowUpgradePrompt(true);
        } else if (response.status === 503) {
          setError('システム負荷により一時的に利用できません。しばらく後にお試行してください。');
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

      // PWAエラー対策: 詳細なエラーハンドリング
      if (error.name === 'AbortError') {
        setError('リクエストがタイムアウトしました。再試行してください。');
      } else if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
        setError('ネットワークエラーです。接続を確認してください。');
      } else if (error.message.includes('message channel closed')) {
        setError('PWAエラーが発生しました。ページを更新して再試行してください。');
      } else {
        setError('投稿生成でエラーが発生しました。再試行してください。');
      }
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

  // 🆕 サブスクリプション管理画面の表示
  if (currentView === 'subscription') {
    return (
      <div className="post-generator">
        {/* 設定画面ヘッダー */}
        <div className="header">
          <div className="header-content">
            <h1>⚙️ アカウント設定</h1>
            <button
              onClick={() => setCurrentView('generator')}
              className="back-button"
            >
              <ArrowLeft className="back-icon" />
              メインに戻る
            </button>
          </div>
        </div>

        {/* サブスクリプション管理コンポーネント */}
        <SubscriptionManager
          userId={userId}
          onPlanChange={handlePlanChange}
        />
      </div>
    );
  }


  // メインの投稿生成画面
  return (
    <div className="post-generator">
      {/* ヘッダー - 設定ボタン統合版 */}
      <div className="header">
        <div className="header-content">
          <h1>📝 SNS自動化ツール</h1>
          <div className="header-controls">
            {isPremium && (
              <div className="premium-badge">
                <span className="crown">👑</span>
                <span>PREMIUM MEMBER</span>
              </div>
            )}

            {/* 🆕 設定ボタン */}
            <button
              onClick={() => {
                console.log('🔧 設定ボタンがクリックされました');
                setCurrentView('subscription');
              }}
              className="settings-button"
              title="アカウント設定・サブスクリプション管理"
            >
              <Settings className="settings-icon" />
              設定
            </button>
          </div>
        </div>
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
          onClick={() => console.log('生成ボタンクリック')}
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
            <h3>もっと生成したい方へ</h3>
          </div>
          <p className="promotion-description">
            プレミアムプランで無制限生成＋SNS自動投稿をお楽しみください
          </p>
          <button
            onClick={upgradeToPremium}
            className="upgrade-button"
          >
            💎 プレミアムプランを見る（¥980/月）
          </button>

          <div className="current-usage">
            <span className="usage-text">
              今日の残り生成数: {typeof usage.remaining === 'number' ? usage.remaining : 0}回/3回
            </span>
          </div>
        </div>
      )}
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