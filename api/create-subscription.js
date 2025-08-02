// /api/create-subscription.js
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const customers = await stripe.customers.list({ email, limit: 1 });
    const customer =
      customers.data.length > 0
        ? customers.data[0]
        : await stripe.customers.create({ email });

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: 'price_1RrjXNKTfKgNarB3B3D2MmXy' }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        plan: 'premium',
        source: 'web-app',
      },
    });

    return res.status(200).json({
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      customerId: customer.id,
    });

  } catch (error) {
    console.error('🔥 Stripe subscription creation error:', {
      message: error.message,
      type: error.type,
      code: error.code,
      param: error.param,
      raw: error.raw,
      stack: error.stack,
    });

    return res.status(500).json({
      error: 'サブスクリプション作成に失敗しました',
      message: error.message,
      details: error.raw?.message || 'unknown error',
    });
  }
}
