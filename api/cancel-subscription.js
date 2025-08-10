// ============================================
// 1. API: Stripe解約処理
// ============================================

// api/cancel-subscription.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, subscriptionId, reason } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Stripe初期化
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    // 1. サブスクリプションIDを取得（提供されない場合）
    let actualSubscriptionId = subscriptionId;
    
    if (!actualSubscriptionId) {
      // Stripe Customerからサブスクリプションを検索
      const customers = await stripe.customers.list({
        limit: 1,
        metadata: { userId: userId }
      });

      if (customers.data.length > 0) {
        const customer = customers.data[0];
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: 'active',
          limit: 1
        });

        if (subscriptions.data.length > 0) {
          actualSubscriptionId = subscriptions.data[0].id;
        }
      }
    }

    if (!actualSubscriptionId) {
      return res.status(404).json({ 
        error: 'アクティブなサブスクリプションが見つかりません',
        code: 'NO_ACTIVE_SUBSCRIPTION'
      });
    }

    // 2. サブスクリプションを解約
    const canceledSubscription = await stripe.subscriptions.cancel(actualSubscriptionId, {
      cancellation_details: {
        comment: reason || 'User requested cancellation',
        feedback: 'other'
      }
    });

    // 3. KVストレージからプラン情報を削除
    await updateUserPlanInKV(userId, 'free');

    // 4. 解約ログを記録
    await logCancellation(userId, actualSubscriptionId, reason);

    console.log(`✅ Subscription canceled: ${actualSubscriptionId} for user: ${userId}`);

    return res.status(200).json({
      success: true,
      message: 'サブスクリプションが正常に解約されました',
      subscriptionId: actualSubscriptionId,
      canceledAt: canceledSubscription.canceled_at,
      periodEnd: canceledSubscription.current_period_end
    });

  } catch (error) {
    console.error('Subscription cancellation error:', error);

    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({
        error: '無効なサブスクリプションです',
        details: error.message
      });
    }

    return res.status(500).json({
      error: '解約処理でエラーが発生しました',
      details: error.message
    });
  }
}

// KVストレージでのプラン更新
async function updateUserPlanInKV(userId, plan) {
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  const response = await fetch(kvUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${kvToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(['SET', `user_plan:${userId}`, plan]),
  });

  if (!response.ok) {
    throw new Error(`KV update failed: ${response.status}`);
  }
}

// 解約ログの記録
async function logCancellation(userId, subscriptionId, reason) {
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  const logData = {
    userId,
    subscriptionId,
    reason: reason || 'No reason provided',
    canceledAt: new Date().toISOString(),
    method: 'api_request'
  };

  const logKey = `cancellation_log:${userId}:${Date.now()}`;

  await fetch(kvUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${kvToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(['SETEX', logKey, 86400 * 30, JSON.stringify(logData)]), // 30日保存
  });
}
