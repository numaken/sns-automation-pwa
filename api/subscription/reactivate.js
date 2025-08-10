// api/subscription/reactivate.js - サブスクリプション再開API

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    // userIdでサブスクリプションを検索
    const subscriptions = await stripe.subscriptions.list({
      expand: ['data.customer'],
      limit: 100,
    });

    const userSubscription = subscriptions.data.find(sub => {
      return sub.metadata?.userId === userId ||
        sub.customer?.metadata?.userId === userId;
    });

    if (!userSubscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // サブスクリプションがアクティブでない、または解約予定でない場合はエラー
    if (userSubscription.status !== 'active') {
      return res.status(400).json({
        error: 'Subscription is not active',
        status: userSubscription.status
      });
    }

    if (!userSubscription.cancel_at_period_end) {
      return res.status(400).json({
        error: 'Subscription is not scheduled for cancellation'
      });
    }

    // 解約予定をキャンセル（再開）
    const updatedSubscription = await stripe.subscriptions.update(userSubscription.id, {
      cancel_at_period_end: false
    });

    // KVストレージのプラン情報も更新（もしあれば）
    try {
      await updateUserPlanInKV(userId, 'premium');
    } catch (kvError) {
      console.warn('KV update error:', kvError);
      // KVエラーは無視（主要機能ではない）
    }

    return res.status(200).json({
      success: true,
      message: 'サブスクリプションが再開されました。引き続きプレミアム機能をご利用いただけます。',
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        cancel_at_period_end: updatedSubscription.cancel_at_period_end,
        current_period_end: updatedSubscription.current_period_end,
        next_invoice_date: new Date(updatedSubscription.current_period_end * 1000).toLocaleDateString('ja-JP')
      }
    });

  } catch (error) {
    console.error('Subscription reactivate error:', error);
    return res.status(500).json({
      error: 'Failed to reactivate subscription',
      details: error.message
    });
  }
}

// KVストレージのプラン更新（オプション）
async function updateUserPlanInKV(userId, plan) {
  try {
    const response = await fetch(`${process.env.KV_REST_API_URL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['SET', `user_plan:${userId}`, plan]),
    });

    if (!response.ok) {
      throw new Error(`KV update failed: ${response.status}`);
    }
  } catch (error) {
    console.warn('KV plan update failed:', error);
    // KVエラーは無視（Stripeが真実の情報源）
  }
}