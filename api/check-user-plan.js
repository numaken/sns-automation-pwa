// api/check-user-plan.js - プラン確認API
export default async function handler(req, res) {
  // CORS対応
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 認証ヘッダー確認
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: '認証が必要です',
        code: 'UNAUTHORIZED',
        plan: 'free' // 未認証の場合は無料プラン
      });
    }

    const token = authHeader.substring(7);

    // トークン検証
    const userPlanData = await getUserPlanFromToken(token);

    if (!userPlanData) {
      return res.status(401).json({
        error: '無効なトークンです',
        code: 'INVALID_TOKEN',
        plan: 'free'
      });
    }

    // 成功レスポンス
    return res.status(200).json({
      success: true,
      plan: userPlanData.plan,
      user_id: userPlanData.user_id,
      subscription: userPlanData.subscription,
      features: userPlanData.features,
      limits: userPlanData.limits,
      checked_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Check user plan error:', error);

    return res.status(500).json({
      error: 'プラン確認中にエラーが発生しました',
      code: 'INTERNAL_ERROR',
      plan: 'free', // エラー時は安全に無料プラン
      debug: error.message
    });
  }
}

// トークンからユーザープラン情報を取得
async function getUserPlanFromToken(token) {
  try {
    // テスト用トークンの処理
    if (token === 'test-premium-token' || token === 'premium-user-token') {
      console.log('✅ Test premium token validated');
      return {
        plan: 'premium',
        user_id: 'test_premium_user',
        subscription: {
          id: 'sub_test_premium',
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30日後
          cancel_at_period_end: false
        },
        features: [
          'unlimited_generation',
          'high_speed_generation',
          'premium_quality',
          'social_media_posting',
          'analytics',
          'priority_support'
        ],
        limits: {
          daily_generations: 'unlimited',
          quality_score: 95,
          response_time: '2_seconds'
        }
      };
    }

    if (token === 'test-free-token' || token === 'free-user-token') {
      console.log('✅ Test free token validated');
      return {
        plan: 'free',
        user_id: 'test_free_user',
        subscription: null,
        features: [
          'limited_generation',
          'basic_quality'
        ],
        limits: {
          daily_generations: 3,
          quality_score: 85,
          response_time: '5_seconds'
        }
      };
    }

    // 実際のトークン検証ロジック
    // JWTトークンの場合
    if (token.startsWith('eyJ')) {
      const userData = await validateJWTToken(token);
      if (userData) {
        return await getPlanFromDatabase(userData.user_id);
      }
    }

    // Stripeカスタマートークンの場合
    if (token.startsWith('cus_')) {
      const userData = await validateStripeCustomer(token);
      if (userData) {
        return userData;
      }
    }

    // カスタムトークン形式
    if (token.length >= 32) {
      // データベースでトークンを検索
      const userData = await getUserFromDatabase(token);
      if (userData) {
        return userData;
      }
    }

    // いずれも該当しない場合
    console.log('❌ Token validation failed for:', token.substring(0, 10) + '...');
    return null;

  } catch (error) {
    console.error('Token validation error:', error);
    return null;
  }
}

// JWT トークン検証（実装例）
async function validateJWTToken(token) {
  try {
    // 実際の実装ではJWTライブラリを使用
    // const jwt = require('jsonwebtoken');
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // return decoded;

    console.log('JWT validation not implemented');
    return null;
  } catch (error) {
    console.error('JWT validation error:', error);
    return null;
  }
}

// Stripeカスタマー検証
async function validateStripeCustomer(customerId) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.log('Stripe not configured');
      return null;
    }

    // 実際の実装ではStripe APIを使用
    /*
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    // カスタマー情報取得
    const customer = await stripe.customers.retrieve(customerId);
    
    // サブスクリプション取得
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active'
    });

    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0];
      return {
        plan: 'premium',
        user_id: customerId,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end
        },
        features: ['unlimited_generation', 'high_speed_generation', 'premium_quality'],
        limits: { daily_generations: 'unlimited' }
      };
    }
    */

    console.log('Stripe validation not implemented');
    return null;
  } catch (error) {
    console.error('Stripe validation error:', error);
    return null;
  }
}

// データベースからプラン情報取得
async function getPlanFromDatabase(userId) {
  try {
    // 実際の実装ではデータベースクエリを使用
    // const db = getDatabase();
    // const user = await db.users.findById(userId);
    // return user.planData;

    console.log('Database lookup not implemented for user:', userId);
    return {
      plan: 'free',
      user_id: userId,
      subscription: null,
      features: ['limited_generation'],
      limits: { daily_generations: 3 }
    };
  } catch (error) {
    console.error('Database lookup error:', error);
    return null;
  }
}

// カスタムトークンからユーザー情報取得
async function getUserFromDatabase(token) {
  try {
    // KVストレージでトークンを検索
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const userKey = `user_token:${token}`;

      const response = await fetch(`${process.env.KV_REST_API_URL}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['GET', userKey]),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.result) {
          return JSON.parse(data.result);
        }
      }
    }

    console.log('Custom token lookup not found for:', token.substring(0, 10) + '...');
    return null;
  } catch (error) {
    console.error('Custom token lookup error:', error);
    return null;
  }
}

// ヘルパー関数: ユーザートークンを作成（デバッグ用）
export async function createUserToken(userId, planType = 'free') {
  try {
    const token = `token_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const userData = {
      plan: planType,
      user_id: userId,
      created_at: new Date().toISOString(),
      subscription: planType === 'premium' ? {
        status: 'active',
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      } : null
    };

    // KVに保存
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const userKey = `user_token:${token}`;

      await fetch(`${process.env.KV_REST_API_URL}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['SETEX', userKey, 86400 * 30, JSON.stringify(userData)]), // 30日間有効
      });
    }

    return token;
  } catch (error) {
    console.error('Create user token error:', error);
    return null;
  }
}