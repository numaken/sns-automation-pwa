// api/create-checkout-session.js - URL設定修正版
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // 環境変数確認
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripePriceId = process.env.STRIPE_PRICE_ID;

    if (!stripeSecretKey || !stripePriceId) {
      return res.status(500).json({
        error: 'Stripe設定エラー',
        details: 'STRIPE_SECRET_KEY または STRIPE_PRICE_ID が設定されていません'
      });
    }

    // 🆕 本番URLを直接指定（req.headers.origin問題を回避）
    const baseUrl = 'https://sns-automation-pwa.vercel.app';

    // Stripe初期化
    const stripe = require('stripe')(stripeSecretKey);

    // Checkout Session作成
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: stripePriceId, // price_1RrbYjKTfKgNarB3jwcI332h
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${baseUrl}/premium/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/premium/cancel`,
      client_reference_id: userId,
      customer_email: undefined, // 🆕 不要なemail設定を削除
      metadata: {
        userId: userId,
        plan: 'premium'
      },
      subscription_data: {
        metadata: {
          userId: userId
        }
      }
    });

    console.log('Stripe Checkout Session created:', {
      sessionId: session.id,
      userId: userId,
      priceId: stripePriceId
    });

    return res.status(200).json({
      sessionId: session.id,
      url: session.url,
      success: true
    });

  } catch (error) {
    console.error('Stripe Checkout Session Error:', error);

    return res.status(500).json({
      error: 'Stripe設定エラー',
      details: error.message,
      success: false
    });
  }
}