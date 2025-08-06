// Stripe サブスクリプション確認API
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authorization ヘッダーからトークンを取得
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        plan: 'free' // 認証なしは無料プラン
      });
    }

    // トークンからユーザー情報取得
    const userInfo = await getUserInfoFromToken(token);
    if (!userInfo) {
      return res.status(401).json({
        error: 'Invalid token',
        plan: 'free' // 無効トークンは無料プラン
      });
    }

    // 現在は認証システムが未実装のため、テスト用の判定ロジック
    // 実際のプロダクションでは Stripe API を使用
    const userPlan = await checkUserPremiumStatus(userInfo);

    return res.json({
      plan: userPlan,
      user_id: userInfo.userId,
      email: userInfo.email,
      // Stripeサブスクリプション情報（実装時に追加）
      // subscription_id: subscription?.id,
      // status: subscription?.status,
      // current_period_end: subscription?.current_period_end,
    });

  } catch (error) {
    console.error('Subscription check error:', error);
    return res.status(500).json({
      error: 'Subscription check failed',
      plan: 'free' // エラー時は安全に無料プランとして扱う
    });
  }
}

// トークンからユーザー情報取得（既存システムに合わせて実装）
async function getUserInfoFromToken(token) {
  try {
    // 実際の実装では JWT デコードやセッション確認を行う
    // 現在はテスト用の簡易実装

    // 例: JWT を使用する場合
    // const jwt = require('jsonwebtoken');
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // return { userId: decoded.userId, email: decoded.email };

    // テスト用: 特定のトークンでプレミアムユーザーを判定
    if (token === 'premium-test-token') {
      return {
        userId: 'premium-user-1',
        email: 'premium@example.com'
      };
    }

    // デフォルトは無料ユーザー
    return {
      userId: 'free-user-1',
      email: 'free@example.com'
    };

  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

// ユーザーのプレミアムステータス確認
async function checkUserPremiumStatus(userInfo) {
  try {
    // Stripe API実装時のプレースホルダー
    // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    // 顧客検索
    // const customers = await stripe.customers.list({
    //   email: userInfo.email,
    //   limit: 1,
    // });

    // if (customers.data.length === 0) {
    //   return 'free';
    // }

    // const customer = customers.data[0];

    // サブスクリプション確認
    // const subscriptions = await stripe.subscriptions.list({
    //   customer: customer.id,
    //   status: 'active',
    //   limit: 1,
    // });

    // if (subscriptions.data.length === 0) {
    //   return 'free';
    // }

    // return 'premium';

    // テスト用の判定ロジック
    if (userInfo.userId === 'premium-user-1') {
      return 'premium';
    }

    return 'free';

  } catch (error) {
    console.error('Premium status check error:', error);
    return 'free'; // エラー時は無料プラン
  }
}