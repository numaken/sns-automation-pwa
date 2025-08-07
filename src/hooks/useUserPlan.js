// src/hooks/useUserPlan.js - プラン管理完全版

import { useState, useEffect, useCallback } from 'react';

export const useUserPlan = () => {
  // デフォルトをpremiumに設定（テスト環境での動作確認用）
  const [userPlan, setUserPlan] = useState('free');
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [error, setError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  // プレミアムプランかどうかの判定
  const isPremium = userPlan === 'premium';

  // プラン確認のメイン関数
  const checkUserSubscription = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 認証トークン取得
      const authToken = getAuthToken();

      if (!authToken) {
        console.log('🔓 No auth token found, using free plan');
        setUserPlan('free');
        setLastChecked(new Date().toISOString());
        setIsLoading(false);
        return;
      }

      console.log('🔍 Checking subscription with token:', authToken.substring(0, 10) + '...');

      // キャッシュチェック（5分以内なら使用）
      const cached = loadFromCache();
      if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
        console.log('📦 Using cached plan data:', cached.plan);
        setUserPlan(cached.plan);
        setSubscriptionInfo(cached.subscription);
        setLastChecked(new Date(cached.timestamp).toISOString());
        setIsLoading(false);
        return;
      }

      // API呼び出し
      const response = await fetch('/api/check-user-plan', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000) // 10秒タイムアウト
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('🔒 Unauthorized, falling back to free plan');
          setUserPlan('free');
          setLastChecked(new Date().toISOString());
          setIsLoading(false);
          return;
        }

        if (response.status === 404) {
          console.log('❓ User plan API not found, falling back to free plan');
          setUserPlan('free');
          setLastChecked(new Date().toISOString());
          setIsLoading(false);
          return;
        }

        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Plan check response:', data);

      // プラン情報を設定
      const planData = {
        plan: data.plan || 'free',
        subscription: data.subscription || null,
        features: data.features || [],
        timestamp: Date.now()
      };

      setUserPlan(planData.plan);
      setSubscriptionInfo(planData.subscription);
      setLastChecked(new Date().toISOString());

      // 成功をローカルストレージにキャッシュ
      saveToCache(planData);

      console.log(`🎯 Final plan set: ${planData.plan}`);

    } catch (error) {
      console.error('❌ Subscription check error:', error);
      setError(error.message);

      // エラー時はキャッシュまたは無料プランにフォールバック
      const cached = loadFromCache();
      if (cached && Date.now() - cached.timestamp < 30 * 60 * 1000) { // 30分以内のキャッシュ
        console.log('🔄 Using fallback cached plan data:', cached.plan);
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

  // 初期化
  useEffect(() => {
    checkUserSubscription();

    // 定期的な更新（10分ごと）
    const interval = setInterval(() => {
      checkUserSubscription();
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
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
      console.log('🧪 Using test premium mode');
      return 'test-premium-token'; // 動作確認済みトークン
    }

    if (testMode === 'free') {
      console.log('🧪 Using test free mode');
      return null;
    }

    // 2. 明示的プレミアムトークン
    const explicitToken = localStorage.getItem('premiumToken');
    if (explicitToken) {
      console.log('🔑 Using explicit premium token');
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
        console.log(`🔑 Found token in localStorage: ${source}`);
        return token;
      }

      // セッションストレージをフォールバック
      const sessionToken = sessionStorage.getItem(source);
      if (sessionToken && sessionToken.length > 10) {
        console.log(`🔑 Found token in sessionStorage: ${source}`);
        return sessionToken;
      }
    }

    // 4. URLパラメータから取得（サブスクリプション完了後など）
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token') || urlParams.get('auth_token');
    if (urlToken) {
      console.log('🔗 Found token in URL parameters');
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

  // Stripe Checkout開始
  const startCheckout = async (email) => {
    try {
      console.log('💳 Starting checkout for:', email);

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          success_url: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/cancel`
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Checkout session creation failed');
      }

      const { url, sessionId, customerId } = await response.json();
      console.log('✅ Checkout session created:', sessionId);

      // メタデータを保存
      localStorage.setItem('checkoutEmail', email);
      localStorage.setItem('checkoutSessionId', sessionId);
      if (customerId) {
        localStorage.setItem('customerId', customerId);
      }

      // Stripe Checkoutページへリダイレクト
      window.location.href = url;

      return { success: true, url, sessionId };

    } catch (error) {
      console.error('❌ Checkout error:', error);
      return { success: false, error: error.message };
    }
  };

  // 簡単アップグレード
  const upgradeTopremium = async (customEmail = null) => {
    const email = customEmail || prompt('プレミアムプランにアップグレードするには、メールアドレスを入力してください:');

    if (!email) {
      return { success: false, error: 'Email required' };
    }

    if (!email.includes('@') || !email.includes('.')) {
      alert('有効なメールアドレスを入力してください');
      return { success: false, error: 'Invalid email format' };
    }

    return await startCheckout(email);
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

  const setPremiumToken = (token = 'test-premium-token') => {
    localStorage.setItem('premiumToken', token);
    localStorage.removeItem('userPlanCache');
    console.log('🔑 Premium token set:', token.substring(0, 10) + '...');
    refreshPlan();
  };

  const clearAllTokens = () => {
    const tokenKeys = ['authToken', 'userToken', 'accessToken', 'sessionToken', 'jwt', 'bearer_token', 'premiumToken'];
    tokenKeys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    localStorage.removeItem('testMode');
    localStorage.removeItem('userPlanCache');
    console.log('🧹 All tokens and cache cleared');
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
        color: 'premium',
        bgColor: 'bg-gradient-to-r from-yellow-400 to-orange-500',
        textColor: 'text-yellow-900'
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
        color: 'free',
        bgColor: 'bg-gradient-to-r from-gray-100 to-gray-200',
        textColor: 'text-gray-700'
      };
    }
  };

  // サブスクリプション状態
  const getSubscriptionStatus = () => {
    if (!subscriptionInfo) {
      return { status: 'none', message: 'サブスクリプション情報なし' };
    }

    const status = subscriptionInfo.status;
    const statusMessages = {
      active: '✅ アクティブ',
      trialing: '🔄 トライアル中',
      past_due: '⚠️ 支払い遅延',
      canceled: '❌ キャンセル済み',
      unpaid: '💳 未払い'
    };

    return {
      status,
      message: statusMessages[status] || `❓ ${status}`,
      next_billing_date: subscriptionInfo.current_period_end,
      cancel_at_period_end: subscriptionInfo.cancel_at_period_end
    };
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
    getSubscriptionStatus,

    // 操作関数
    checkUserSubscription,
    refreshPlan,
    upgradeTopremium,
    startCheckout,

    // デバッグ・テスト関数
    enableTestPremium,
    enableTestFree,
    disableTestMode,
    setPremiumToken,
    clearAllTokens,

    // ヘルパー関数
    getPlanDetails,
    getAuthToken,

    // 状態
    cached: !!loadFromCache()
  };
};