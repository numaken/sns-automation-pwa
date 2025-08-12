// api/create-checkout-session.js - 緊急修正版（環境変数フォールバック）
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, customerEmail } = req.body;

    // 🔧 緊急修正: フォールバック付きPrice ID取得
    const priceId = process.env.STRIPE_PRICE_ID || 'price_1Rv6An3xUV54aKjltVTNWShh';

    console.log('🔍 Emergency fix - Environment check:', {
      STRIPE_PRICE_ID_ENV: process.env.STRIPE_PRICE_ID,
      STRIPE_PRICE_ID_USED: priceId,
      HAS_STRIPE_SECRET: !!process.env.STRIPE_SECRET_KEY
    });

    // 🔧 Origin URL修正（URLエラー対策）
    const baseUrl = req.headers.origin || 'https://sns-automation-pwa.vercel.app';

    console.log('🌐 URL check:', {
      origin: req.headers.origin,
      baseUrl: baseUrl
    });

    // Stripe Checkout セッション作成
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/?session_id={CHECKOUT_SESSION_ID}&payment_success=true`,
      cancel_url: `${baseUrl}/?payment_cancelled=true`,
      metadata: {
        userId: userId || 'unknown',
        product: 'PostPilot Pro Premium Plan',
        timestamp: new Date().toISOString(),
        priceId: priceId
      },
      customer_email: customerEmail || undefined,
      billing_address_collection: 'auto',
      automatic_tax: {
        enabled: false,
      },
    });

    console.log('✅ Emergency checkout session created:', {
      sessionId: session.id,
      priceId: priceId,
      amount: session.amount_total,
      currency: session.currency,
      url: session.url
    });

    return res.status(200).json({
      sessionId: session.id,
      url: session.url,
      priceId: priceId,
      debug: {
        envPriceId: process.env.STRIPE_PRICE_ID,
        usedPriceId: priceId,
        baseUrl: baseUrl
      }
    });

  } catch (error) {
    console.error('❌ Emergency checkout session creation failed:', error);

    return res.status(500).json({
      success: false,
      error: '決済セッション作成エラー',
      details: error.message,
      debug: {
        hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
        priceId: process.env.STRIPE_PRICE_ID || 'NOT_SET'
      }
    });
  }
}