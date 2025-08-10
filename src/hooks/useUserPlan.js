// src/hooks/useUserPlan.js - プラン管理修正版（ローカルストレージベース）

import { useState, useEffect, useCallback } from 'react';

export const useUserPlan = () => {
  const [userPlan, setUserPlan] = useState('free');
  const [isLoading, setIsLoading] = useState(true);
  
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [error, setError] = useState(null);

  // プレミアムプランかどうかの判定
  const isPremium = userPlan === 'premium';

  // プラン確認のメイン関数（ローカルストレージベース）
  const checkUserSubscription = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔍 Checking user plan from localStorage...');

      // ローカルストレージから直接プラン情報を取得
      const planSources = [
        'userPlan',
        'user_plan',
        'plan',
        'subscriptionStatus'
      ];

      let detectedPlan = 'free';
      let planSource = 'default';

      // 複数のソースからプラン情報を検索
      for (const source of planSources) {
        const value = localStorage.getItem(source);
        if (value === 'premium' || value === 'active') {
          detectedPlan = 'premium';
          planSource = source;
          console.log(`✅ Premium plan detected from ${source}: ${value}`);
          break;
        }
      }

      // 認証トークンの確認（追加の検証）
      const authToken = getAuthToken();
      if (authToken && authToken.includes('premium')) {
        detectedPlan = 'premium';
        planSource = 'authToken';
        console.log('✅ Premium plan detected from authToken');
      }

      // Stripe セッション情報の確認
      const stripeSessionId = localStorage.getItem('stripeSessionId') ||
        localStorage.getItem('checkoutSessionId');
      if (stripeSessionId && stripeSessionId.startsWith('cs_')) {
        detectedPlan = 'premium';
        planSource = 'stripeSession';
        console.log('✅ Premium plan detected from Stripe session');
      }

      // テストモード確認
      const testMode = localStorage.getItem('testMode');
      if (testMode === 'premium') {
        detectedPlan = 'premium';
        planSource = 'testMode';
        console.log('🧪 Test premium mode enabled');
      } else if (testMode === 'free') {
        detectedPlan = 'free';
        planSource = 'testMode';
        console.log('🧪 Test free mode enabled');
      }

      // サブスクリプション情報の構築
      const subscriptionData = buildSubscriptionInfo(detectedPlan, planSource);

      // 状態更新
      setUserPlan(detectedPlan);
      setSubscriptionInfo(subscriptionData);
      setLastChecked(new Date().toISOString());

      // キャッシュに保存
      saveToCache({
        plan: detectedPlan,
        subscription: subscriptionData,
        source: planSource,
        timestamp: Date.now()
      });

      console.log(`🎯 Final plan set: ${detectedPlan} (source: ${planSource})`);

    } catch (error) {
      console.error('❌ Plan check error:', error);
      setError(error.message);

      // エラー時はキャッシュまたはフリープランにフォールバック
      const cached = loadFromCache();
      if (cached && Date.now() - cached.timestamp < 60 * 60 * 1000) { // 1時間以内のキャッシュ
        console.log('🔄 Using cached plan data:', cached.plan);
        setUserPlan(cached.plan);
        setSubscriptionInfo(cached.subscription);
        setLastChecked(new Date(cached.timestamp).toISOString());
      } else {
        console.log('🆓 Defaulting to free plan due to error');
        setUserPlan('free');
        setLastChecked(new Date().toISOString());
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  
  // サブスクリプション情報の構築
  const buildSubscriptionInfo = (plan, source) => {
    if (plan !== 'premium') return null;

    const activatedAt = localStorage.getItem('premiumActivatedAt') || new Date().toISOString();
    const sessionId = localStorage.getItem('stripeSessionId') || localStorage.getItem('checkoutSessionId');

    return {
      status: 'active',
      plan: 'premium',
      source: source,
      activated_at: activatedAt,
      stripe_session_id: sessionId,
      current_period_end: null, // API未実装のため未設定
      cancel_at_period_end: false
    };
  };

  // 初期化
  useEffect(() => {
    checkUserSubscription();

    // ローカルストレージの変更を監視
    const handleStorageChange = (e) => {
      if (['userPlan', 'user_plan', 'plan', 'subscriptionStatus', 'testMode'].includes(e.key)) {
        console.log('📦 LocalStorage change detected:', e.key, e.newValue);
        checkUserSubscription();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // 定期的な更新（30分ごと）
    const interval = setInterval(() => {
      checkUserSubscription();
    }, 30 * 60 * 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [checkUserSubscription]);

  // キャッシュから読み込み
  const loadFromCache = () => {
    try {
      const cached = localStorage.getItem('userPlanCache');
      if (!cached) return null;

      const data = JSON.parse(cached);

      // データが有効かチェック
      if (!data.timestamp || !data.plan) {
        localStorage.removeItem('userPlanCache');
        return null;
      }

      return data;
    } catch (error) {
      console.error('📦 Cache load error:', error);
      localStorage.removeItem('userPlanCache');
      return null;
    }
  };

  // キャッシュに保存
  const saveToCache = (data) => {
    try {
      localStorage.setItem('userPlanCache', JSON.stringify(data));
      console.log('💾 Plan data cached successfully');
    } catch (error) {
      console.error('💾 Cache save error:', error);
    }
  };

  // 認証トークン取得（優先順位付き）
  const getAuthToken = () => {
    // 1. テストモード確認
    const testMode = localStorage.getItem('testMode');
    if (testMode === 'premium') {
      return 'test-premium-token';
    }

    if (testMode === 'free') {
      return null;
    }

    // 2. 明示的プレミアムトークン
    const explicitToken = localStorage.getItem('premiumToken');
    if (explicitToken) {
      return explicitToken;
    }

    // 3. セッション/ローカルストレージから検索
    const tokenSources = [
      'authToken',
      'userToken',
      'accessToken',
      'sessionToken',
      'jwt',
      'bearer_token'
    ];

    for (const source of tokenSources) {
      // ローカルストレージを優先
      const token = localStorage.getItem(source);
      if (token && token.length > 10) {
        return token;
      }

      // セッションストレージをフォールバック
      const sessionToken = sessionStorage.getItem(source);
      if (sessionToken && sessionToken.length > 10) {
        return sessionToken;
      }
    }

    // 4. URLパラメータから取得（サブスクリプション完了後など）
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token') || urlParams.get('auth_token');
    if (urlToken) {
      // URLトークンはローカルストレージに保存
      localStorage.setItem('authToken', urlToken);
      return urlToken;
    }

    return null;
  };

  // プラン更新
  const refreshPlan = useCallback(async () => {
    console.log('🔄 Manually refreshing plan...');
    localStorage.removeItem('userPlanCache'); // キャッシュクリア
    await checkUserSubscription();
  }, [checkUserSubscription]);

  // プレミアムプランへの手動設定
  const setPremiumPlan = (sessionId = null) => {
    console.log('🔄 Setting premium plan manually...');

    localStorage.setItem('userPlan', 'premium');
    localStorage.setItem('user_plan', 'premium');
    localStorage.setItem('subscriptionStatus', 'active');
    localStorage.setItem('premiumActivatedAt', new Date().toISOString());

    if (sessionId) {
      localStorage.setItem('stripeSessionId', sessionId);
    }

    // プレミアムトークンも設定
    const userId = localStorage.getItem('sns_automation_user_id') || 'premium-user-' + Date.now();
    localStorage.setItem('authToken', `premium-${userId}-${Date.now()}`);

    // キャッシュクリアして更新
    localStorage.removeItem('userPlanCache');
    checkUserSubscription();

    console.log('✅ Premium plan set manually');
  };

  // プレミアムプランへのアップグレード
  const upgradeTopremium = async (userId = null) => {
    try {
      const actualUserId = userId || localStorage.getItem('sns_automation_user_id') ||
        'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

      console.log('💳 Starting checkout for userId:', actualUserId);

      // ユーザーIDを保存
      localStorage.setItem('sns_automation_user_id', actualUserId);

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: actualUserId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Checkout session creation failed');
      }

      console.log('✅ Checkout session created:', data.sessionId);

      // チェックアウト情報を保存
      localStorage.setItem('checkoutSessionId', data.sessionId);

      if (data.url) {
        window.location.href = data.url;
        return { success: true, sessionId: data.sessionId };
      } else {
        throw new Error('Checkout URL not received');
      }

    } catch (error) {
      console.error('Upgrade error:', error);
      alert('アップグレード処理でエラーが発生しました: ' + error.message);
      return { success: false, error: error.message };
    }
  };

  // デバッグ・テスト関数群
  const enableTestPremium = () => {
    localStorage.setItem('testMode', 'premium');
    localStorage.removeItem('userPlanCache');
    console.log('🧪 Test premium mode enabled');
    refreshPlan();
  };

  const enableTestFree = () => {
    localStorage.setItem('testMode', 'free');
    localStorage.removeItem('userPlanCache');
    console.log('🧪 Test free mode enabled');
    refreshPlan();
  };

  const disableTestMode = () => {
    localStorage.removeItem('testMode');
    localStorage.removeItem('userPlanCache');
    console.log('🧪 Test mode disabled');
    refreshPlan();
  };

  const clearAllData = () => {
    const keysToRemove = [
      'userPlan', 'user_plan', 'plan', 'subscriptionStatus',
      'authToken', 'userToken', 'accessToken', 'sessionToken', 'jwt', 'bearer_token', 'premiumToken',
      'testMode', 'userPlanCache', 'stripeSessionId', 'checkoutSessionId', 'premiumActivatedAt'
    ];

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    console.log('🧹 All user plan data cleared');
    refreshPlan();
  };

  // プラン詳細情報
  const getPlanDetails = () => {
    if (isPremium) {
      return {
        name: 'プレミアムプラン',
        displayName: '👑 プレミアムプラン',
        price: '¥980/月',
        features: [
          '無制限AI投稿生成',
          '高速生成（2秒以内）',
          '最高品質AI（95点以上）',
          'SNS直接投稿（Twitter・Threads）',
          '投稿統計・分析',
          '広告なし',
          '優先サポート'
        ],
        badge: '👑 PREMIUM',
        color: 'premium'
      };
    } else {
      return {
        name: '無料プラン',
        displayName: '🆓 無料プラン',
        price: '¥0/月',
        features: [
          '1日3回AI投稿生成',
          'APIキー設定不要',
          '高品質投稿生成',
          '基本統計情報'
        ],
        badge: '🆓 FREE',
        color: 'free'
      };
    }
  };

  return {
    // 基本情報
    userPlan,
    isPremium,
    isLoading,
    error,
    lastChecked,

    // サブスクリプション情報
    subscriptionInfo,

    // 操作関数
    checkUserSubscription,
    refreshPlan,
    upgradeTopremium,
    setPremiumPlan,

    // デバッグ・テスト関数
    enableTestPremium,
    enableTestFree,
    disableTestMode,
    clearAllData,

    // ヘルパー関数
    getPlanDetails,
    getAuthToken
  };
};