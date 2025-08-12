// api/debug-stripe.js - 緊急診断用API（一時的）
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
        secretKeyPrefix: process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 7) + '***' : 'NOT_SET',
        priceId: process.env.STRIPE_PRICE_ID || 'NOT_SET',
        hasPriceId: !!process.env.STRIPE_PRICE_ID
      },
      headers: {
        origin: req.headers.origin,
        host: req.headers.host,
        userAgent: req.headers['user-agent'] ? 'SET' : 'NOT_SET'
      },
      url: {
        baseUrl: req.headers.origin || `https://${req.headers.host}`,
        protocol: req.headers['x-forwarded-proto'] || 'unknown'
      }
    };

    // Stripe接続テスト（可能であれば）
    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

        // Price ID検証
        if (process.env.STRIPE_PRICE_ID) {
          const price = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID);
          diagnostics.stripe.priceValidation = {
            exists: true,
            amount: price.unit_amount,
            currency: price.currency,
            active: price.active
          };
        }
      } catch (stripeError) {
        diagnostics.stripe.error = {
          message: stripeError.message,
          type: stripeError.type,
          code: stripeError.code
        };
      }
    }

    console.log('🔍 Stripe診断結果:', diagnostics);

    return res.status(200).json({
      success: true,
      diagnostics,
      recommendations: generateRecommendations(diagnostics)
    });

  } catch (error) {
    console.error('❌ 診断API エラー:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}

function generateRecommendations(diagnostics) {
  const recommendations = [];

  if (!diagnostics.stripe.hasSecretKey) {
    recommendations.push('❌ STRIPE_SECRET_KEY が設定されていません');
  }

  if (!diagnostics.stripe.hasPriceId) {
    recommendations.push('❌ STRIPE_PRICE_ID が設定されていません');
  }

  if (diagnostics.stripe.priceId && diagnostics.stripe.priceId !== 'price_1Rv6An3xUV54aKjltVTNWShh') {
    recommendations.push(`⚠️ STRIPE_PRICE_ID が期待値と異なります: ${diagnostics.stripe.priceId}`);
  }

  if (diagnostics.stripe.error) {
    recommendations.push(`❌ Stripe API エラー: ${diagnostics.stripe.error.message}`);
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ 設定は正常に見えます');
  }

  return recommendations;
}