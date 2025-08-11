// api/create-checkout-session.js - 修正版
// 引き継ぎ書類に基づく500エラー対応

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
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 環境変数チェック
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY not found');
      return res.status(500).json({
        error: 'Server configuration error',
        details: 'Stripe not configured'
      });
    }

    console.log('✅ Stripe checkout session creation started');

    const {
      customerEmail,
      userId,
      planType = 'premium'
    } = req.body;

    // ユーザーID生成（未提供の場合）
    const sessionUserId = userId || `user_${Date.now()}`;

    // 事前定義された価格設定
    const priceData = {
      currency: 'jpy',
      product_data: {
        name: 'SNS自動化ツール プレミアムプラン',
        description: '無制限AI投稿生成 + OAuth自動投稿機能',
      },
      unit_amount: 98000, // ¥980
      recurring: {
        interval: 'month',
      },
    };

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: 'SNS自動化ツール プレミアムプラン',
              description: '無制限AI投稿生成 + OAuth自動投稿機能',
            },
            unit_amount: 98000, // ¥980
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',

      // 🎯 重要: Next.jsページへのリダイレクト設定
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://sns-automation-pwa.vercel.app'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://sns-automation-pwa.vercel.app'}/cancel`,

      customer_email: customerEmail,
      client_reference_id: userId,
      metadata: {
        userId: userId,
        planType: 'premium',
        source: 'sns_automation_pwa'
      }
    });

    console.log('✅ Checkout session created:', session.id);

    return res.status(200).json({
      sessionId: session.id,
      url: session.url
    });

  } catch (error) {
    console.error('❌ Stripe checkout error:', {
      message: error.message,
      type: error.type,
      code: error.code,
      param: error.param
    });

    // エラーの種類に応じた適切なレスポンス
    if (error.type === 'StripeCardError') {
      return res.status(400).json({
        error: 'カード情報に問題があります',
        details: error.message
      });
    } else if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({
        error: 'リクエストに問題があります',
        details: error.message
      });
    } else if (error.type === 'StripeAPIError') {
      return res.status(500).json({
        error: 'サーバーエラーが発生しました',
        details: 'しばらく後に再試行してください'
      });
    } else {
      return res.status(500).json({
        error: 'システムエラーが発生しました',
        details: error.message
      });
    }
  }
}