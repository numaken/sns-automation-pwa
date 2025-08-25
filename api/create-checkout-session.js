// api/create-checkout-session.js - ¥980対応・500エラー完全修正版
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // CORS対応
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      allowedMethod: 'POST'
    });
  }

  try {
    console.log('🚀 ¥980決済セッション作成開始...');

    const { userId, customerEmail } = req.body;

    // 入力値検証
    if (!userId) {
      console.error('❌ UserID missing');
      return res.status(400).json({
        success: false,
        error: 'ユーザーIDが必要です',
        details: 'userId is required'
      });
    }

    // 環境変数確認
    const priceId = process.env.STRIPE_PRICE_ID;
    const secretKey = process.env.STRIPE_SECRET_KEY;

    console.log('🔍 環境変数確認:', {
      hasPriceId: !!priceId,
      hasSecretKey: !!secretKey,
      priceId: priceId,
      secretKeyType: secretKey ? (secretKey.startsWith('sk_live_') ? 'LIVE' : 'TEST') : 'NONE'
    });

    if (!priceId || !secretKey) {
      console.error('❌ Stripe環境変数未設定');
      return res.status(500).json({
        success: false,
        error: 'サーバー設定エラー',
        details: 'Stripe環境変数が設定されていません'
      });
    }

    // Origin URL確認・修正
    const origin = req.headers.origin || req.headers.host ? `https://${req.headers.host}` : 'https://postpilot.panolabollc.com';
    console.log('🌐 Origin URL:', origin);

    // Stripe Checkout セッション作成（¥980対応）
    console.log('💳 Stripe セッション作成中...');

    const sessionConfig = {
      payment_method_types: ['card'],
      mode: 'subscription', // ¥980月額なので subscription
      line_items: [
        {
          price: priceId, // price_1Rv6An3xUV54aKjltVTNWShh (¥980/月)
          quantity: 1,
        },
      ],
      success_url: `${origin}/?session_id={CHECKOUT_SESSION_ID}&payment_success=true&plan=premium_980`,
      cancel_url: `${origin}/?payment_cancelled=true`,
      metadata: {
        userId: userId,
        product: 'PostPilot Pro Premium ¥980/月',
        timestamp: new Date().toISOString(),
        priceId: priceId,
        planType: 'premium_980'
      },
      billing_address_collection: 'auto',
      allow_promotion_codes: true, // プロモーションコード対応
      automatic_tax: {
        enabled: false,
      },
    };

    // 顧客メール設定（任意）
    if (customerEmail && customerEmail.includes('@')) {
      sessionConfig.customer_email = customerEmail;
    }

    console.log('📋 Session設定:', {
      mode: sessionConfig.mode,
      priceId: priceId,
      successUrl: sessionConfig.success_url,
      customerEmail: sessionConfig.customer_email || 'not_provided'
    });

    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log('✅ ¥980決済セッション作成成功:', {
      sessionId: session.id,
      priceId: priceId,
      mode: session.mode,
      amount: session.amount_total,
      currency: session.currency,
      url: session.url ? 'generated' : 'missing'
    });

    return res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url,
      priceId: priceId,
      amount: session.amount_total,
      currency: session.currency,
      mode: session.mode,
      debug: {
        planType: 'premium_980',
        expectedAmount: 980,
        actualAmount: session.amount_total,
        origin: origin
      }
    });

  } catch (error) {
    console.error('❌ ¥980決済セッション作成失敗:', {
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack?.substring(0, 200)
    });

    return res.status(500).json({
      success: false,
      error: '¥980決済セッション作成エラー',
      details: error.message,
      errorType: error.type || 'unknown',
      errorCode: error.code || 'none',
      debug: {
        hasPriceId: !!process.env.STRIPE_PRICE_ID,
        hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
        timestamp: new Date().toISOString()
      }
    });
  }
}