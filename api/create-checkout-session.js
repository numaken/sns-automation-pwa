// ===============================================
// 1. api/create-checkout-session.js - 完全修正版
// ===============================================
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 環境変数チェック
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY not found');
      return res.status(500).json({
        error: 'Server configuration error',
        details: 'Stripe configuration missing'
      });
    }

    console.log('✅ Creating Stripe checkout session...');

    const { customerEmail, userId } = req.body;

    // ユーザーID生成（未提供の場合）
    const sessionUserId = userId || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // ベースURL設定
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
      req.headers.origin ||
      'https://sns-automation-pwa.vercel.app';

    // 🔧 修正: 金額を¥2,980に統一・一回払いに変更
    const sessionParams = {
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'jpy',
          product_data: {
            name: 'PostPilot Pro - プレミアムプラン',
            description: '無制限AI投稿生成 + SNS自動投稿機能',
          },
          unit_amount: 298000, // ¥2,980（引き継ぎ書通り）
        },
        quantity: 1,
      }],
      mode: 'payment', // 一回払いに変更
      success_url: `${baseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?cancelled=true`,
      client_reference_id: sessionUserId,
      metadata: {
        userId: sessionUserId,
        planType: 'premium',
        source: 'sns_automation_pwa',
        createdAt: new Date().toISOString()
      }
    };

    // 顧客メール設定（任意）
    if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    console.log('✅ Creating session with params:', {
      userId: sessionUserId,
      amount: '¥2,980',
      mode: 'payment'
    });

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log(`✅ Checkout session created: ${session.id}`);

    return res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url,
      userId: sessionUserId
    });

  } catch (error) {
    console.error('❌ Stripe checkout error:', {
      message: error.message,
      type: error.type,
      code: error.code
    });

    return res.status(500).json({
      success: false,
      error: '決済セッション作成エラー',
      details: error.message
    });
  }
}