// プラン確認API - api/check-user-plan.js
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 認証ヘッダーの確認
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        plan: 'free'
      });
    }

    const token = authHeader.substring(7);

    // テスト環境での簡易認証（開発・テスト用）
    if (token === 'test-premium-token' || token === 'premium-user-token') {
      return res.status(200).json({
        plan: 'premium',
        status: 'active',
        features: {
          unlimited_generation: true,
          sns_posting: true,
          high_speed: true,
          no_ads: true
        },
        subscription: {
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      });
    }

    // Stripe連携での実際のプラン確認
    if (process.env.STRIPE_SECRET_KEY && token.length > 10) {
      const userPlan = await checkStripeSubscription(token);
      return res.status(200).json({
        plan: userPlan,
        status: userPlan === 'premium' ? 'active' : 'free',
        features: userPlan === 'premium' ? {
          unlimited_generation: true,
          sns_posting: true,
          high_speed: true,
          no_ads: true
        } : {
          daily_limit: 3,
          basic_generation: true
        }
      });
    }

    // デフォルトは無料プラン
    return res.status(200).json({
      plan: 'free',
      status: 'free',
      features: {
        daily_limit: 3,
        basic_generation: true
      }
    });

  } catch (error) {
    console.error('Plan check error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      plan: 'free' // エラー時は安全な無料プラン
    });
  }
}

// Stripe連携での実際のサブスクリプション確認
async function checkStripeSubscription(token) {
  try {
    // 実際のStripe APIコール
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    // トークンからユーザーIDを取得する処理
    // この部分は既存の認証システムに依存
    const userId = await getUserIdFromToken(token);

    if (!userId) {
      return 'free';
    }

    // Stripeでサブスクリプション確認
    const subscriptions = await stripe.subscriptions.list({
      customer: userId,
      status: 'active',
      limit: 1
    });

    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0];

      // プランIDをチェック
      const planId = subscription.items.data[0].price.id;

      // プレミアムプランのIDリスト
      const premiumPlanIds = [
        process.env.STRIPE_PREMIUM_PRICE_ID,
        'price_premium_monthly',
        'price_premium_yearly'
      ].filter(Boolean);

      if (premiumPlanIds.includes(planId)) {
        return 'premium';
      }
    }

    return 'free';

  } catch (error) {
    console.error('Stripe subscription check error:', error);
    return 'free';
  }
}

// トークンからユーザーIDを取得
async function getUserIdFromToken(token) {
  try {
    // JWT デコードまたは既存の認証システムを使用
    // この部分は実際の認証実装に依存

    // 仮実装：簡易マッピング
    const userMappings = {
      'test-premium-token': 'user_premium_123',
      'premium-user-token': 'user_premium_456'
    };

    return userMappings[token] || null;

  } catch (error) {
    console.error('Token decode error:', error);
    return null;
  }
}