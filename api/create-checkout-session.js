// api/create-checkout-session.js
// Stripe Checkout セッション作成API

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Stripe初期化
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    // 価格ID確認
    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      console.error('STRIPE_PRICE_ID environment variable not set');
      return res.status(500).json({
        error: 'Payment configuration incomplete',
        details: 'STRIPE_PRICE_ID not configured'
      });
    }

    // Checkout セッション作成
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}?canceled=true`,
      client_reference_id: userId,
      customer_email: null, // オプション: 顧客のメールアドレス
      subscription_data: {
        metadata: {
          userId: userId,
          plan: 'premium'
        }
      },
      metadata: {
        userId: userId,
        plan: 'premium'
      }
    });

    console.log('Checkout session created:', session.id, 'for user:', userId);

    return res.status(200).json({
      sessionId: session.id,
      url: session.url
    });

  } catch (error) {
    console.error('Stripe checkout session creation error:', error);

    if (error.type === 'StripeCardError') {
      return res.status(400).json({ error: 'カード情報に問題があります' });
    } else if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({
        error: 'Stripe設定エラー',
        details: error.message
      });
    } else {
      return res.status(500).json({
        error: '決済セッション作成に失敗しました',
        details: error.message
      });
    }
  }
}