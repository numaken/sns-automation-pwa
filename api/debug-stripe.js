// api/debug-stripe.js - 完全診断API
export default async function handler(req, res) {
  try {
    // 環境変数診断
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV
      },
      stripe: {
        hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
        secretKeyType: process.env.STRIPE_SECRET_KEY ? (
          process.env.STRIPE_SECRET_KEY.startsWith('sk_live_') ? 'LIVE' :
          process.env.STRIPE_SECRET_KEY.startsWith('sk_test_') ? 'TEST' : 'UNKNOWN'
        ) : 'NOT_SET',
        secretKeyPrefix: process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 8) + '***' : 'NOT_SET',
        priceId: process.env.STRIPE_PRICE_ID || 'NOT_SET',
        hasPriceId: !!process.env.STRIPE_PRICE_ID,
        expectedPriceId: 'price_1Rv6An3xUV54aKjltVTNWShh',
        priceIdMatch: process.env.STRIPE_PRICE_ID === 'price_1Rv6An3xUV54aKjltVTNWShh'
      }
    };

    // Stripe接続テスト
    if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID) {
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        
        // Price取得テスト
        const price = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID);
        diagnostics.stripe.priceValidation = {
          exists: true,
          id: price.id,
          amount: price.unit_amount,
          currency: price.currency,
          active: price.active,
          type: price.type,
          recurring: price.recurring
        };
        
      } catch (stripeError) {
        diagnostics.stripe.error = {
          message: stripeError.message,
          type: stripeError.type,
          code: stripeError.code,
          statusCode: stripeError.statusCode
        };
      }
    }

    console.log('🔍 完全診断結果:', diagnostics);
    return res.status(200).json({ success: true, diagnostics });

  } catch (error) {
    console.error('❌ 診断エラー:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
