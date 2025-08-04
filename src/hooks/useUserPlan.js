import { useState, useEffect } from 'react';

export const useUserPlan = () => {
  const [userPlan, setUserPlan] = useState('free');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkUserSubscription();
  }, []);

  const checkUserSubscription = async () => {
    try {
      // 認証トークンの確認
      const authToken = getAuthToken();
      if (!authToken) {
        setUserPlan('free');
        setIsLoading(false);
        return;
      }

      // Stripe サブスクリプション確認API呼び出し
      const response = await fetch('/api/check-subscription', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Subscription check failed');
      }

      const data = await response.json();
      setUserPlan(data.plan || 'free');

    } catch (error) {
      console.error('Subscription check error:', error);
      setUserPlan('free'); // エラー時は安全に無料プランとして扱う
    } finally {
      setIsLoading(false);
    }
  };

  // 認証トークン取得（既存システムに合わせて実装）
  const getAuthToken = () => {
    // localStorage または sessionStorage から認証トークンを取得
    const token = localStorage.getItem('authToken') ||
      sessionStorage.getItem('authToken') ||
      localStorage.getItem('auth_token') ||
      sessionStorage.getItem('auth_token');

    return token;
  };

  return {
    userPlan,
    isLoading,
    checkUserSubscription,
    // 便利な判定関数も提供
    isPremium: userPlan === 'premium',
    isFree: userPlan === 'free'
  };
};