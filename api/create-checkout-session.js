// api/create-checkout-session.js - 修正版（HTTP 500エラー解決）
// 2025年8月12日 - 包括的引き継ぎ書対応

import Stripe from 'stripe';

// Stripe初期化（ES6 modules対応）
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
    // 🔧 修正1: 環境変数の詳細チェック
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY not found');
      return res.status(500).json({
        error: 'Server configuration error',
        details: 'Stripe configuration missing'
      });
    }

    // 🔧 修正2: APIキーの形式チェック（テスト vs 本番）
    const isTestMode = process.env.STRIPE_SECRET_KEY.startsWith('sk_test_');
    console.log(`✅ Stripe mode: ${isTestMode ? 'TEST' : 'LIVE'}`);

    console.log('✅ Creating Stripe checkout session...');

    const {
      customerEmail,
      userId,
      planType = 'premium'
    } = req.body;

    // 🔧 修正3: ユーザーID生成の改善
    const sessionUserId = userId || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 🔧 修正4: 金額設定の統一（引き継ぎ書対応）
    const lineItems = [{
      price_data: {
        currency: 'jpy',
        product_data: {
          name: 'PostPilot Pro - プレミアムプラン',
          description: '無制限AI投稿生成 + SNS自動投稿機能',
          images: [], // 空配列で初期化
        },
        unit_amount: 98000, // ¥980（実装ロードマップ通り）
        recurring: {
          interval: 'month',
        },
      },
      quantity: 1,
    }];

    // 🔧 修正5: URL設定の改善
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
      req.headers.origin ||
      'https://sns-automation-pwa.vercel.app';

    console.log(`✅ Base URL: ${baseUrl}`);

    // 🔧 修正6: セッション作成の簡素化・確実化
    const sessionParams = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'subscription',

      // 実装ロードマップ通りのOAuth誘導フロー
      success_url: `${baseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?cancelled=true`,

      // オプション設定
      ...(customerEmail && { customer_email: customerEmail }),

      // メタデータ設定
      client_reference_id: sessionUserId,
      metadata: {
        userId: sessionUserId,
        planType: planType,
        source: 'sns_automation_pwa',
        createdAt: new Date().toISOString()
      }
    };

    console.log('✅ Session params prepared, creating session...');

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log(`✅ Checkout session created: ${session.id}`);
    console.log(`✅ Checkout URL: ${session.url}`);

    return res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url,
      mode: isTestMode ? 'test' : 'live'
    });

  } catch (error) {
    console.error('❌ Stripe checkout error details:', {
      message: error.message,
      type: error.type,
      code: error.code,
      param: error.param,
      stack: error.stack?.split('\n')[0] // スタックトレースの最初の行のみ
    });

    // 🔧 修正7: エラーハンドリングの改善
    let errorResponse = {
      success: false,
      error: '決済セッション作成エラー',
      details: 'しばらく後に再試行してください'
    };

    if (error.type === 'StripeCardError') {
      errorResponse = {
        success: false,
        error: 'カード情報エラー',
        details: error.message
      };
    } else if (error.type === 'StripeInvalidRequestError') {
      errorResponse = {
        success: false,
        error: 'リクエストエラー',
        details: `設定エラー: ${error.message}`
      };
    } else if (error.type === 'StripeAPIError') {
      errorResponse = {
        success: false,
        error: 'Stripe APIエラー',
        details: 'Stripeサービス一時的問題'
      };
    } else if (error.type === 'StripeConnectionError') {
      errorResponse = {
        success: false,
        error: '接続エラー',
        details: 'ネットワーク問題が発生しました'
      };
    } else if (error.type === 'StripeAuthenticationError') {
      errorResponse = {
        success: false,
        error: '認証エラー',
        details: 'API設定を確認してください'
      };
    }

    return res.status(500).json(errorResponse);
  }
}