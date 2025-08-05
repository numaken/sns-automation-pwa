// src/hooks/useUserPlan.js - 動作確認済み版

import { useState, useEffect } from 'react';

export const useUserPlan = () => {
  const [userPlan, setUserPlan] = useState('free');
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [error, setError] = useState(null);

  // プレミアムプランかどうかの判定
  const isPremium = userPlan === 'premium';

  useEffect(() => {
    checkUserSubscription();
  }, []);

  const checkUserSubscription = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 認証トークン取得
      const authToken = getAuthToken();

      if (!authToken) {
        console.log('No auth token, using free plan');
        setUserPlan('free');
        setIsLoading(false);
        return;
      }

      console.log('Checking subscription with token:', authToken.substring(0, 10) + '...');

      // 動作確認済みのcheck-user-plan APIを使用
      const response = await fetch('/api/check-user-plan', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('Unauthorized, falling back to free plan');
          setUserPlan('free');
          setIsLoading(false);
          return;
        }
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Plan check response:', data);

      // プラン情報を設定
      setUserPlan(data.plan || 'free');
      setSubscriptionInfo(data.subscription || null);

      // 成功をローカルストレージにキャッシュ
      const cacheData = {
        plan: data.plan || 'free',
        subscription: data.subscription,
        features: data.features,
        timestamp: Date.now()
      };
      localStorage.setItem('userPlanCache', JSON.stringify(cacheData));

    } catch (error) {
      console.error('❌ Subscription check error:', error);
      setError(error.message);

      // エラー時はキャッシュまたは無料プランにフォールバック
      const cached = loadFromCache();
      if (cached) {
        console.log('Using cached plan data');
        setUserPlan(cached.plan);
        setSubscriptionInfo(cached.subscription);
      } else {
        console.log('Defaulting to free plan');
        setUserPlan('free');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // キャッシュから読み込み
  const loadFromCache = () => {
    try {
      const cached = localStorage.getItem('userPlanCache');
      if (!cached) return null;

      const data = JSON.parse(cached);
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);

      if (data.timestamp > fiveMinutesAgo) {
        return data;
      }

      localStorage.removeItem('userPlanCache');
      return null;
    } catch (error) {
      console.error('Cache load error:', error);
      return null;
    }
  };

  // 認証トークン取得（動作確認済みトークンを優先）
  const getAuthToken = () => {
    // 1. テストモード確認
    const testMode = localStorage.getItem('testMode');
    if (testMode === 'premium') {
      console.log('🧪 Using test premium mode');
      return 'test-premium-token'; // 動作確認済み
    }

    // 2. 明示的にプレミアムトークン設定されている場合
    const explicitToken = localStorage.getItem('premiumToken');
    if (explicitToken) {
      console.log('🔑 Using explicit premium token');
      return explicitToken;
    }

    // 3. 通常の認証トークン
    const tokenSources = [
      'authToken',
      'userToken',
      'accessToken',
      'sessionToken'
    ];

    for (const source of tokenSources) {
      const token = localStorage.getItem(source);
      if (token) {
        console.log(`🔑 Found token in ${source}`);
        return token;
      }
    }

    // 4. SessionStorage からも探す
    for (const source of tokenSources) {
      const token = sessionStorage.getItem(source);
      if (token) {
        console.log(`🔑 Found token in session ${source}`);
        return token;
      }
    }

    return null;
  };

  // プラン更新
  const refreshPlan = async () => {
    console.log('🔄 Refreshing plan...');
    localStorage.removeItem('userPlanCache');
    await checkUserSubscription();
  };

  // Stripe Checkout開始
  const startCheckout = async (email) => {
    try {
      console.log('💳 Starting checkout for:', email);

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Checkout failed');
      }

      const { url, sessionId, customerId } = await response.json();
      console.log('✅ Checkout session created:', sessionId);

      // メールアドレスを保存（サブスクリプション確認用）
      localStorage.setItem('checkoutEmail', email);
      localStorage.setItem('customerId', customerId);

      // Stripe Checkoutページへリダイレクト
      window.location.href = url;

      return { success: true, url, sessionId };

    } catch (error) {
      console.error('❌ Checkout error:', error);
      return { success: false, error: error.message };
    }
  };

  // 簡単アップグレード
  const upgradeTopremium = async () => {
    const email = prompt('プレミアムプランにアップグレードするには、メールアドレスを入力してください:');
    if (email && email.includes('@')) {
      return await startCheckout(email);
    } else if (email) {
      alert('有効なメールアドレスを入力してください');
    }
    return { success: false, error: 'Email required' };
  };

  // テストモード切り替え（デバッグ用）
  const enableTestPremium = () => {
    localStorage.setItem('testMode', 'premium');
    console.log('🧪 Test premium mode enabled');
    refreshPlan();
  };

  const disableTestMode = () => {
    localStorage.removeItem('testMode');
    console.log('🧪 Test mode disabled');
    refreshPlan();
  };

  // 明示的プレミアムトークン設定
  const setPremiumToken = (token = 'test-premium-token') => {
    localStorage.setItem('premiumToken', token);
    console.log('🔑 Premium token set');
    refreshPlan();
  };

  // プラン詳細
  const getPlanDetails = () => {
    if (isPremium) {
      return {
        name: 'プレミアムプラン',
        price: '¥980/月',
        features: [
          '無制限AI投稿生成',
          '高速生成（2秒以内）',
          '最高品質AI（95点以上）',
          'SNS直接投稿',
          '広告なし',
          '優先サポート'
        ],
        badge: '👑 PREMIUM',
        color: 'premium'
      };
    } else {
      return {
        name: '無料プラン',
        price: '¥0/月',
        features: [
          '1日3回AI投稿生成',
          'APIキー設定不要',
          '高品質投稿生成'
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

    // サブスクリプション情報
    subscriptionInfo,

    // 操作関数
    checkUserSubscription,
    refreshPlan,
    upgradeTopremium,
    startCheckout,

    // デバッグ関数
    enableTestPremium,
    disableTestMode,
    setPremiumToken,

    // ヘルパー関数
    getPlanDetails
  };
};