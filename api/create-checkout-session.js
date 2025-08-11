// /api/create-checkout-session.js (修正版)
// 決済完了後の自動プレミアム移行対応

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;

    console.log('🚀 Creating checkout session for userId:', userId);

    // ユーザーIDの生成（未指定の場合）
    const actualUserId = userId || 'checkout-user-' + Date.now();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: 'AI SNS自動化ツール - プレミアムプラン',
              description: '無制限AI投稿生成 + SNS自動投稿 + 統計機能',
              images: ['https://sns-automation-pwa.vercel.app/icon-512x512.png'],
            },
            unit_amount: 98000, // ¥980 in cents
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',

      // 決済完了後のリダイレクト先（修正版）
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}&user_id=${actualUserId}`,
      cancel_url: `${req.headers.origin}/?canceled=true`,

      // メタデータでユーザー情報を保存
      metadata: {
        userId: actualUserId,
        planType: 'premium',
        activatedAt: new Date().toISOString(),
      },

      // 顧客情報
      customer_creation: 'always',

      // 請求先住所の収集（日本向け）
      billing_address_collection: 'required',

      // 税金設定（日本の消費税対応）
      automatic_tax: {
        enabled: false, // 手動で税金を設定する場合
      },

      // 決済方法の設定
      payment_intent_data: {
        metadata: {
          userId: actualUserId,
          planType: 'premium',
        },
      },

      // サブスクリプション設定
      subscription_data: {
        metadata: {
          userId: actualUserId,
          planType: 'premium',
          activatedAt: new Date().toISOString(),
        },
      },
    });

    console.log('✅ Checkout session created:', {
      sessionId: session.id,
      userId: actualUserId,
      successUrl: session.success_url,
    });

    return res.status(200).json({
      url: session.url,
      sessionId: session.id,
      userId: actualUserId,
    });

  } catch (error) {
    console.error('❌ Checkout session creation error:', error);

    return res.status(500).json({
      error: 'セッションの作成に失敗しました',
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}