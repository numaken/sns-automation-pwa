// api/create-checkout-session.js - Price ID不整合修正版
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, customerEmail } = req.body;

    // 🔧 修正: 環境変数の明示的確認
    const priceId = process.env.STRIPE_PRICE_ID;
    console.log('🔍 Environment check:', {
      STRIPE_PRICE_ID: priceId,
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? 'Set' : 'Missing'
    });

    // Price ID検証
    if (!priceId) {
      console.error('❌ STRIPE_PRICE_ID not found in environment variables');
      return res.status(500).json({
        error: 'サーバー設定エラー',
        details: 'Price ID設定が見つかりません'
      });
    }

    // 正しいPrice IDが設定されているか確認
    if (priceId !== 'price_1Rv6An3xUV54aKjltVTNWShh') {
      console.warn('⚠️ Unexpected Price ID:', priceId);
      console.warn('Expected: price_1Rv6An3xUV54aKjltVTNWShh');
    }

    // Stripe Checkout セッション作成
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price: priceId, // 環境変数から取得
          quantity: 1,
        },
      ],
      success_url: `${req.headers.origin}/?session_id={CHECKOUT_SESSION_ID}&payment_success=true`,
      cancel_url: `${req.headers.origin}/?payment_cancelled=true`,
      metadata: {
        userId: userId,
        product: 'PostPilot Pro Premium Plan',
        timestamp: new Date().toISOString()
      },
      customer_email: customerEmail || undefined,
      billing_address_collection: 'auto',
      automatic_tax: {
        enabled: false, // 日本の税制に応じて調整
      },
    });

    console.log('✅ Checkout session created:', {
      sessionId: session.id,
      priceId: priceId,
      amount: session.amount_total,
      currency: session.currency
    });

    return res.status(200).json({
      sessionId: session.id,
      url: session.url,
      priceId: priceId // デバッグ用
    });

  } catch (error) {
    console.error('❌ Stripe checkout session creation failed:', error);

    return res.status(500).json({
      success: false,
      error: '決済セッション作成エラー',
      details: error.message
    });
  }
}

// 🔧 デバッグ用: 環境変数確認エンドポイント（本番では削除推奨）
export async function debugEnvironment(req, res) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Debug disabled in production' });
  }

  return res.status(200).json({
    STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? 'Set' : 'Missing',
    NODE_ENV: process.env.NODE_ENV
  });
}