// ===============================================
// 5. utils/planUtils.js - 完全修正版
// ===============================================
// ユーザープラン取得
export const getUserPlan = async (userId) => {
  try {
    // サーバーサイドプラン確認
    const response = await fetch('/api/get-user-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.plan === 'premium') {
        return 'premium';
      }
    }

    // フォールバック: ローカルストレージ確認
    const localPlan = localStorage.getItem('userPlan');
    const subscriptionStatus = localStorage.getItem('subscriptionStatus');

    if (localPlan === 'premium' && subscriptionStatus === 'active') {
      return 'premium';
    }

    return 'free';
  } catch (error) {
    console.error('Plan check error:', error);

    // エラー時のフォールバック
    const localPlan = localStorage.getItem('userPlan');
    return localPlan === 'premium' ? 'premium' : 'free';
  }
};

// プレミアムユーザー判定
export const isPremiumUser = async (userId) => {
  const plan = await getUserPlan(userId);
  return plan === 'premium';
};

// ユーザーID取得（新規生成含む）
export const getCurrentUserId = () => {
  let userId = localStorage.getItem('userId');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('userId', userId);
  }
  return userId;
};

// プレミアムプラン設定（決済成功時）
export const setPremiumPlan = (userId, paymentInfo = {}) => {
  localStorage.setItem('userPlan', 'premium');
  localStorage.setItem('subscriptionStatus', 'active');
  localStorage.setItem('paymentDate', new Date().toISOString());
  localStorage.setItem('userId', userId);

  if (paymentInfo.amount) {
    localStorage.setItem('paymentAmount', paymentInfo.amount);
  }
  if (paymentInfo.sessionId) {
    localStorage.setItem('lastPaymentSession', paymentInfo.sessionId);
  }
};

// プラン情報クリア（デバッグ・テスト用）
export const clearPlanInfo = () => {
  localStorage.removeItem('userPlan');
  localStorage.removeItem('subscriptionStatus');
  localStorage.removeItem('paymentDate');
  localStorage.removeItem('paymentAmount');
  localStorage.removeItem('lastPaymentSession');
  // userIdは残す（ユーザー識別のため）
};

// プレミアム状態確認（UI表示用）
export const checkPremiumStatus = () => {
  const plan = localStorage.getItem('userPlan');
  const status = localStorage.getItem('subscriptionStatus');
  const paymentDate = localStorage.getItem('paymentDate');

  return {
    isPremium: plan === 'premium' && status === 'active',
    plan: plan || 'free',
    status: status || 'inactive',
    paymentDate: paymentDate,
    userId: getCurrentUserId()
  };
};
