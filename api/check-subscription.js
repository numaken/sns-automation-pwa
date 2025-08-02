// /api/check-subscription.js
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // 顧客検索
    const customers = await stripe.customers.list({
      email: email,
      limit: 1
    });

    if (customers.data.length === 0) {
      return res.json({
        plan: 'free',
        customerId: null,
        subscriptionId: null
      });
    }

    const customer = customers.data[0];

    // アクティブなサブスクリプション確認
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1
    });

    const isActive = subscriptions.data.length > 0;
    const subscription = isActive ? subscriptions.data[0] : null;

    res.json({
      plan: isActive ? 'premium' : 'free',
      customerId: customer.id,
      subscriptionId: subscription?.id || null,
      status: subscription?.status || 'inactive',
      currentPeriodEnd: subscription?.current_period_end || null
    });

  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({
      error: 'プラン状態の確認に失敗しました',
      details: error.message
    });
  }
}