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
    // 既存顧客確認
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1
    });

    let customer;
    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      // 新規顧客作成
      customer = await stripe.customers.create({
        email: email,
        metadata: {
          source: 'sns-automation-app'
        }
      });
    }

    // サブスクリプション作成
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{
        price: 'price_1Rrb7XQK8lTckdl04glYpr2C' // StripeダッシュボードのPrice ID
      }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        plan: 'premium',
        source: 'web-app'
      }
    });

    res.json({
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      customerId: customer.id
    });

  } catch (error) {
    console.error('Stripe subscription creation error:', error);
    res.status(500).json({
      error: 'サブスクリプション作成に失敗しました',
      details: error.message
    });
  }
}