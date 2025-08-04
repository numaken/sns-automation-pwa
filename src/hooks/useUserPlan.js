import { useState, useEffect } from 'react';

export const useUserPlan = () => {
  const [userPlan, setUserPlan] = useState('free');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkUserSubscription();
  }, []);

  const checkUserSubscription = async () => {
    try {
      // 既存のStripe連携を使用
      const response = await fetch('/api/check-user-plan', {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });
      
      const data = await response.json();
      setUserPlan(data.plan || 'free');
    } catch (error) {
      console.error('Subscription check error:', error);
      setUserPlan('free'); // デフォルトは無料
    } finally {
      setIsLoading(false);
    }
  };

  // 認証トークン取得（既存システムに合わせて実装）
  const getAuthToken = () => {
    // 既存の認証システムからトークンを取得
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  };

  return { userPlan, isLoading, checkUserSubscription };
};
