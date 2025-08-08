// api/debug-stripe.js
// Stripe設定確認用デバッグAPI

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 環境変数確認
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripePriceId = process.env.STRIPE_PRICE_ID;
    const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

    console.log('Stripe Debug Check:');
    console.log('- SECRET_KEY exists:', !!stripeSecretKey);
    console.log('- SECRET_KEY prefix:', stripeSecretKey ? stripeSecretKey.substring(0, 7) : 'none');
    console.log('- PRICE_ID exists:', !!stripePriceId);
    console.log('- PRICE_ID value:', stripePriceId || 'none');
    console.log('- PUBLISHABLE_KEY exists:', !!stripePublishableKey);

    const debugInfo = {
      environment: process.env.NODE_ENV || 'development',
      stripe: {
        secretKey: {
          exists: !!stripeSecretKey,
          prefix: stripeSecretKey ? stripeSecretKey.substring(0, 7) : null,
          isTest: stripeSecretKey ? stripeSecretKey.startsWith('sk_test_') : false
        },
        priceId: {
          exists: !!stripePriceId,
          value: stripePriceId || null,
          isValid: stripePriceId ? stripePriceId.startsWith('price_') : false
        },
        publishableKey: {
          exists: !!stripePublishableKey,
          prefix: stripePublishableKey ? stripePublishableKey.substring(0, 7) : null
        }
      }
    };

    // Stripe接続テスト
    if (stripeSecretKey) {
      try {
        const stripe = require('stripe')(stripeSecretKey);

        // 簡単なStripe API呼び出しテスト
        const account = await stripe.accounts.retrieve();
        debugInfo.stripe.connection = {
          success: true,
          accountId: account.id,
          displayName: account.display_name || account.business_profile?.name || 'Unknown'
        };

        // Price ID確認
        if (stripePriceId) {
          try {
            const price = await stripe.prices.retrieve(stripePriceId);
            debugInfo.stripe.price = {
              exists: true,
              amount: price.unit_amount,
              currency: price.currency,
              interval: price.recurring?.interval || 'one_time',
              productId: price.product
            };
          } catch (priceError) {
            debugInfo.stripe.price = {
              exists: false,
              error: priceError.message
            };
          }
        }

      } catch (stripeError) {
        debugInfo.stripe.connection = {
          success: false,
          error: stripeError.message,
          type: stripeError.type || 'unknown'
        };
      }
    }

    return res.status(200).json({
      status: 'debug_complete',
      timestamp: new Date().toISOString(),
      ...debugInfo
    });

  } catch (error) {
    console.error('Stripe debug error:', error);
    return res.status(500).json({
      error: 'Debug failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}