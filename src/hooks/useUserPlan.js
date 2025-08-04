import { useState, useEffect } from 'react';

export const useUserPlan = () => {
  const [userPlan, setUserPlan] = useState('free');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkUserSubscription();
  }, []);

  const checkUserSubscription = async () => {
    try {
      // 既存のcheck-subscriptionを使用
      const response = await fetch('/api/check-subscription', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserPlan(data.plan || 'free');
      } else {
        // エラー時はcheck-user-planを試行
        const userPlanResponse = await fetch('/api/check-user-plan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`,
          },
          body: JSON.stringify({ 
            userId: getAuthToken() || 'anonymous' 
          }),
        });
        
        if (userPlanResponse.ok) {
          const planData = await userPlanResponse.json();
          setUserPlan(planData.plan || 'free');
        }
      }
    } catch (error) {
      console.error('Subscription check error:', error);
      setUserPlan('free'); // デフォルトは無料
    } finally {
      setIsLoading(false);
    }
  };

  // 認証トークン取得（既存システムから）
  const getAuthToken = () => {
    return localStorage.getItem('auth_token') || 
           localStorage.getItem('userEmail') || 
           '';
  };

  return { userPlan, isLoading, checkUserSubscription };
};
