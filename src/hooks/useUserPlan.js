import { useState, useEffect } from 'react';

export const useUserPlan = () => {
  const [userPlan, setUserPlan] = useState('free');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkUserSubscription();
  }, []);

  const checkUserSubscription = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 認証トークンの取得
      const authToken = getAuthToken();

      if (!authToken) {
        console.log('No auth token found, defaulting to free plan');
        setUserPlan('free');
        setIsLoading(false);
        return;
      }

      // プラン確認API呼び出し
      const response = await fetch('/api/check-user-plan', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('Unauthorized, defaulting to free plan');
          setUserPlan('free');
          return;
        }
        throw new Error(`Plan check failed: ${response.status}`);
      }

      const data = await response.json();

      // プラン設定
      const plan = data.plan || 'free';
      console.log('User plan detected:', plan);
      setUserPlan(plan);

      // ローカルストレージにキャッシュ
      localStorage.setItem('userPlan', plan);
      localStorage.setItem('planLastChecked', Date.now().toString());

    } catch (error) {
      console.error('Subscription check error:', error);
      setError(error.message);

      // エラー時はローカルキャッシュまたは無料プランにフォールバック
      const cachedPlan = localStorage.getItem('userPlan');
      const lastChecked = localStorage.getItem('planLastChecked');

      // キャッシュが24時間以内なら使用
      if (cachedPlan && lastChecked && (Date.now() - parseInt(lastChecked)) < 86400000) {
        console.log('Using cached plan:', cachedPlan);
        setUserPlan(cachedPlan);
      } else {
        console.log('Defaulting to free plan due to error');
        setUserPlan('free');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 手動でプラン更新
  const refreshPlan = () => {
    checkUserSubscription();
  };

  // プレミアムかどうかの判定
  const isPremium = userPlan === 'premium';

  return {
    userPlan,
    isPremium,
    isLoading,
    error,
    refreshPlan,
    checkUserSubscription
  };
};

// 認証トークン取得
function getAuthToken() {
  // ローカルストレージまたはクッキーから取得
  return localStorage.getItem('authToken') ||
    localStorage.getItem('userToken') ||
    localStorage.getItem('accessToken') ||
    sessionStorage.getItem('authToken') ||
    null;
}