// src/components/PostGenerator.jsx - 完全機能版（削除機能復活）

import React, { useState, useEffect } from 'react';
import { Settings, ArrowLeft } from 'lucide-react';
import { useUserPlan } from '../hooks/useUserPlan';
import SubscriptionManager from './SubscriptionManager';
import './PostGenerator.css';

const PostGenerator = () => {
  // 🔧 プラン管理（修正版useUserPlan使用）
  const {
    userPlan,
    isPremium,
    isLoading: planLoading,
    refreshPlan,
    setPlanManually,
    upgradeTopremium,
    getDebugInfo
  } = useUserPlan();

  // 🔧 ビュー管理（デバッグ強化版）
  const [currentView, setCurrentView] = useState('generator');

  // 🔧 ユーザーID管理
  const [userId, setUserId] = useState('');

  // 基本状態管理
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

  // 🔧 デバッグ情報（開発時のみ表示）
  const [showDebug, setShowDebug] = useState(false);

  // 🔧 コンポーネント初期化
  useEffect(() => {
    loadStats();
    loadUsage();

    // デバッグモード検出
    const isDebugMode = window.location.hostname === 'localhost' ||
      window.location.search.includes('debug=true');
    setShowDebug(isDebugMode);

    console.log('🚀 PostGenerator initialized');
  }, []);

  // 🔧 ユーザーID初期化
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

  // 🔧 プラン変更時のusage更新
  useEffect(() => {
    if (userPlan === 'premium') {
      setUsage({ remaining: 'unlimited' });
    } else {
      loadUsage();
    }
  }, [userPlan]);

  // 🔧 ビュー変更のデバッグ
  useEffect(() => {
    console.log('🔄 Current view changed to:', currentView);

    // DOM要素の確認（デバッグ用）
    setTimeout(() => {
      if (currentView === 'subscription') {
        const subscriptionElements = document.querySelectorAll('.subscription-card, .subscription-manager, [data-component="subscription"]');
        console.log('📋 SubscriptionManager DOM elements found:', subscriptionElements.length);
      } else {
        const settingsButton = document.querySelector('.settings-button');
        const generateButton = document.querySelector('.generate-button');
        console.log('⚙️ Main view DOM elements - Settings:', !!settingsButton, 'Generate:', !!generateButton);
      }
    }, 100);
  }, [currentView]);

  // 🔧 プラン同期問題の修正
  useEffect(() => {
    const storedPlan = localStorage.getItem('userPlan');
    console.log('🔄 Plan sync check:', { userPlan, storedPlan, isPremium });

    // 不整合検出と修正
    if (storedPlan !== userPlan && setPlanManually) {
      console.log('⚠️ Plan mismatch detected, syncing...', { stored: storedPlan, current: userPlan });
      setPlanManually(userPlan);
    }
  }, [userPlan, isPremium, setPlanManually]);

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

  // 🔧 プラン変更ハンドラー（強化版）
  const handlePlanChange = (newPlan) => {
    console.log('🔄 Plan change requested:', newPlan);

    try {
      // localStorage複数キー更新
      localStorage.setItem('userPlan', newPlan);
      localStorage.setItem('user_plan', newPlan);
      localStorage.setItem('plan', newPlan);

      if (newPlan === 'premium') {
        localStorage.setItem('subscriptionStatus', 'active');
        localStorage.setItem('premiumActivatedAt', new Date().toISOString());
        setUsage({ remaining: 'unlimited' });
      } else {
        localStorage.removeItem('subscriptionStatus');
        localStorage.removeItem('premiumActivatedAt');
        localStorage.removeItem('checkoutSessionId');
        localStorage.removeItem('stripeSessionId');
        loadUsage();
      }

      // useUserPlanの更新
      if (refreshPlan) {
        refreshPlan();
      }

      // 手動でも更新
      if (setPlanManually) {
        setPlanManually(newPlan);
      }

      console.log('✅ Plan change completed:', newPlan);

    } catch (error) {
      console.error('❌ Plan change error:', error);
    }
  };

  // 🔧 設定画面切り替え（修正版）
  const handleShowSettings = () => {
    console.log('🔧 Settings button clicked');
    console.log('📊 Current state before switch:', {
      currentView,
      userPlan,
      isPremium,
      userId,
      debugInfo: getDebugInfo ? getDebugInfo() : 'N/A'
    });

    try {
      setCurrentView('subscription');
      console.log('✅ View switched to subscription');
    } catch (error) {
      console.error('❌ View switch error:', error);
    }
  };

  // 🔧 メイン画面に戻る（修正版）
  const handleBackToMain = () => {
    console.log('🔧 Back button clicked');

    try {
      setCurrentView('generator');
      console.log('✅ View switched to generator');
    } catch (error) {
      console.error('❌ View switch error:', error);
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

  // プレミアムアップグレード
  const upgradeToPremium = async () => {
    try {
      console.log('🚀 upgradeToPremium called');
      if (upgradeTopremium) {
        await upgradeTopremium();
      } else {
        console.error('❌ upgradeTopremium function not available');
        alert('アップグレード機能が利用できません。ページを再読み込みしてください。');
      }
    } catch (error) {
      console.error('❌ Upgrade error:', error);
      alert('アップグレード処理でエラーが発生しました。');
    }
  };

  // AI投稿生成（プラン別処理）
  const handleGenerateClick = () => {
    console.log('🔍 Generate click debug:', {
      userPlan,
      isPremium,
      localStorage_userPlan: localStorage.getItem('userPlan'),
      localStorage_subscriptionStatus: localStorage.getItem('subscriptionStatus')
    });

    // 強制的に無料プランとして処理（一時的デバッグ用）
    const actualUserType = 'free'; // 強制的にfreeに設定

    console.log('🔍 Using userType:', actualUserType);

    if (actualUserType === 'premium') {
      console.log('🎯 Calling generatePost (premium)');
      generatePost();
    } else {
      console.log('🎯 Calling generatePostWithSharedAPI (free)');
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
      console.log('🚀 API call to /api/generate-post-shared');

      const requestBody = {
        prompt: prompt.trim(),
        tone,
        userType: 'free' // 強制的にfreeに設定
      };

      console.log('📤 Request body:', requestBody);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch('/api/generate-post-shared', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('📥 Response status:', response.status);

      const data = await response.json();
      console.log('📥 Response data:', data);

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
        console.log('📊 Usage updated:', data.usage);
        saveDailyUsage(3 - data.usage.remaining);
      }

      updateStats(data.quality, generationTime);

      if (data.usage.remaining <= 1) {
        setShowUpgradePrompt(true);
      }

    } catch (error) {
      console.error('❌ Generate post error:', error);

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
    return (
      <div className="post-generator">
        <div className="loading-container">
          プラン情報を読み込み中...
          {showDebug && (
            <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '10px' }}>
              Debug: currentView={currentView}, userPlan={userPlan}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 🔧 サブスクリプション管理画面（修正版）
  if (currentView === 'subscription') {
    console.log('🖥️ Rendering subscription view');

    return (
      <div className="post-generator">
        {/* 設定画面ヘッダー */}
        <div className="header">
          <div className="header-content">
            <h1>⚙️ アカウント設定</h1>
            <button
              onClick={handleBackToMain}
              className="back-button"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500
              }}
            >
              <ArrowLeft style={{ width: '1rem', height: '1rem' }} />
              メインに戻る
            </button>
          </div>
        </div>

        {/* デバッグ情報（開発時のみ） */}
        {showDebug && (
          <div style={{
            background: '#f3f4f6',
            padding: '10px',
            margin: '10px 0',
            borderRadius: '5px',
            fontSize: '0.8rem',
            color: '#374151'
          }}>
            Debug: userId={userId}, userPlan={userPlan}, isPremium={isPremium}
            <details style={{ marginTop: '5px' }}>
              <summary>詳細情報</summary>
              <pre style={{ fontSize: '0.7rem', marginTop: '5px' }}>
                {JSON.stringify(getDebugInfo ? getDebugInfo() : {}, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* サブスクリプション管理コンポーネント */}
        <div data-component="subscription" style={{
          border: showDebug ? '2px solid #10b981' : 'none',
          borderRadius: '10px',
          padding: showDebug ? '10px' : '0'
        }}>
          <SubscriptionManager
            userId={userId}
            onPlanChange={handlePlanChange}
          />
        </div>
      </div>
    );
  }

  // メインの投稿生成画面
  console.log('🖥️ Rendering main generator view');

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

            {/* 🔧 設定ボタン（修正版） */}
            <button
              onClick={handleShowSettings}
              className="settings-button"
              title="アカウント設定・サブスクリプション管理"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                color: '#374151',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500
              }}
            >
              <Settings style={{ width: '1rem', height: '1rem' }} />
              設定
            </button>
          </div>
        </div>
      </div>

      {/* デバッグ情報（開発時のみ） */}
      {showDebug && (
        <div style={{
          background: '#f3f4f6',
          padding: '10px',
          margin: '10px 0',
          borderRadius: '5px',
          fontSize: '0.8rem',
          color: '#374151'
        }}>
          Debug: currentView={currentView}, userPlan={userPlan}, isPremium={isPremium}
          <button
            onClick={() => console.log('Debug info:', getDebugInfo ? getDebugInfo() : 'N/A')}
            style={{ marginLeft: '10px', padding: '2px 6px', fontSize: '0.7rem' }}
          >
            Show Debug
          </button>
        </div>
      )}

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

      {/* 統合されたSNS投稿セクション */}
      {generatedPost && (
        <div className="sns-posting">
          <h3>🚀 SNS投稿</h3>

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

          {/* 現在の使用状況表示 */}
          <div className="current-usage">
            <span className="usage-text">
              今日の残り生成数: {typeof usage.remaining === 'number' ? usage.remaining : 0}回/3回
            </span>
          </div>
        </div>
      )}

      {/* 🆕 アップグレードプロンプト（Stripe統合） */}
      <UpgradePrompt
        isVisible={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        onUpgrade={() => upgradeToPremium()}
        remainingUses={typeof usage.remaining === 'number' ? usage.remaining : 0}
        userId={userId}
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