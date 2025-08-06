// api/create-subscription.js - Stripe統合API
export default async function handler(req, res) {
    // CORS対応
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, plan = 'premium', success_url, cancel_url } = req.body;

        if (!email || !email.includes('@')) {
            return res.status(400).json({
                error: 'メールアドレスが必要です',
                code: 'INVALID_EMAIL'
            });
        }

        // Stripe設定確認
        if (!process.env.STRIPE_SECRET_KEY) {
            console.error('Stripe secret key not configured');
            return res.status(503).json({
                error: 'Stripe設定が不完全です',
                code: 'STRIPE_NOT_CONFIGURED',
                message: 'しばらく後にお試しください'
            });
        }

        // プラン設定
        const planConfig = getPlanConfig(plan);
        if (!planConfig) {
            return res.status(400).json({
                error: '無効なプランです',
                code: 'INVALID_PLAN'
            });
        }

        console.log(`Creating subscription for ${email} - Plan: ${plan}`);

        // Stripeサブスクリプション作成
        const result = await createStripeSubscription({
            email,
            planConfig,
            success_url: success_url || `${getBaseUrl(req)}/success`,
            cancel_url: cancel_url || `${getBaseUrl(req)}/cancel`
        });

        if (result.success) {
            // 成功時の統計記録
            await recordSubscriptionAttempt({
                email,
                plan,
                success: true,
                session_id: result.sessionId,
                customer_id: result.customerId
            });

            return res.status(200).json({
                success: true,
                message: 'サブスクリプションを作成しました',
                checkout_url: result.url,
                session_id: result.sessionId,
                customer_id: result.customerId,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24時間後
            });
        } else {
            throw new Error(result.error || 'Stripe subscription creation failed');
        }

    } catch (error) {
        console.error('Subscription creation error:', error);

        // 失敗統計記録
        try {
            await recordSubscriptionAttempt({
                email: req.body.email,
                plan: req.body.plan,
                success: false,
                error: error.message
            });
        } catch (logError) {
            console.error('Failed to log subscription attempt:', logError);
        }

        // エラー種別に応じたレスポンス
        if (error.code === 'STRIPE_ERROR') {
            return res.status(400).json({
                error: 'Stripe処理エラー',
                message: error.message,
                code: 'STRIPE_ERROR'
            });
        }

        if (error.code === 'RATE_LIMIT_ERROR') {
            return res.status(429).json({
                error: 'リクエストが多すぎます',
                message: 'しばらく待ってから再試行してください',
                code: 'RATE_LIMIT_ERROR',
                retry_after: 60
            });
        }

        return res.status(500).json({
            error: 'サブスクリプション作成に失敗しました',
            message: 'しばらく待ってから再試行してください',
            code: 'SUBSCRIPTION_CREATION_FAILED',
            debug: error.message
        });
    }
}

// プラン設定取得
function getPlanConfig(planType) {
    const plans = {
        premium: {
            name: 'Premium Plan',
            price_id: process.env.STRIPE_PREMIUM_PRICE_ID || 'price_premium_test',
            amount: 980, // ¥980
            currency: 'jpy',
            interval: 'month',
            features: [
                '無制限AI投稿生成',
                '高速生成（2秒以内）',
                '最高品質AI（95点以上）',
                'SNS直接投稿',
                '優先サポート'
            ]
        },
        business: {
            name: 'Business Plan',
            price_id: process.env.STRIPE_BUSINESS_PRICE_ID || 'price_business_test',
            amount: 2980, // ¥2,980
            currency: 'jpy',
            interval: 'month',
            features: [
                'プレミアム機能すべて',
                '複数アカウント管理',
                'チーム機能',
                '分析レポート',
                'API提供'
            ]
        }
    };

    return plans[planType] || null;
}

// Stripeサブスクリプション作成
async function createStripeSubscription({ email, planConfig, success_url, cancel_url }) {
    try {
        // 実際の実装ではStripeライブラリを使用
        /*
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
        // 1. 顧客作成または取得
        let customer;
        const existingCustomers = await stripe.customers.list({
          email: email,
          limit: 1
        });
    
        if (existingCustomers.data.length > 0) {
          customer = existingCustomers.data[0];
          console.log('Existing customer found:', customer.id);
        } else {
          customer = await stripe.customers.create({
            email: email,
            metadata: {
              source: 'sns-automation-tool',
              plan: planConfig.name,
              created_at: new Date().toISOString()
            }
          });
          console.log('New customer created:', customer.id);
        }
    
        // 2. Checkout Session作成
        const session = await stripe.checkout.sessions.create({
          customer: customer.id,
          payment_method_types: ['card'],
          line_items: [{
            price: planConfig.price_id,
            quantity: 1,
          }],
          mode: 'subscription',
          success_url: success_url + '?session_id={CHECKOUT_SESSION_ID}',
          cancel_url: cancel_url,
          allow_promotion_codes: true,
          billing_address_collection: 'required',
          metadata: {
            plan: planConfig.name,
            email: email,
            features: JSON.stringify(planConfig.features)
          },
          subscription_data: {
            metadata: {
              plan: planConfig.name,
              email: email,
              source: 'sns-automation-tool'
            }
          }
        });
    
        return {
          success: true,
          url: session.url,
          sessionId: session.id,
          customerId: customer.id
        };
        */

        // テスト用のモック実装
        console.log('🧪 Mock Stripe subscription creation for:', email);

        const mockSessionId = `cs_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const mockCustomerId = `cus_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const mockCheckoutUrl = `https://checkout.stripe.com/c/pay/${mockSessionId}`;

        // 実際の実装では、ここでStripeの実際のURLが返される
        return {
            success: true,
            url: mockCheckoutUrl,
            sessionId: mockSessionId,
            customerId: mockCustomerId
        };

    } catch (error) {
        console.error('Stripe API error:', error);

        const stripeError = new Error(`Stripe処理エラー: ${error.message}`);
        stripeError.code = 'STRIPE_ERROR';
        throw stripeError;
    }
}

// ベースURL取得
function getBaseUrl(req) {
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    return `${protocol}://${host}`;
}

// サブスクリプション試行記録
async function recordSubscriptionAttempt(data) {
    try {
        if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
            console.log('KV not configured, skipping subscription recording');
            return;
        }

        const timestamp = new Date().toISOString();
        const recordKey = `subscription_attempt:${timestamp}:${Date.now()}`;

        const recordData = {
            ...data,
            timestamp,
            ip: data.ip || 'unknown',
            user_agent: data.user_agent || 'unknown'
        };

        // KV に記録を保存（7日間保持）
        await fetch(`${process.env.KV_REST_API_URL}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(['SETEX', recordKey, 86400 * 7, JSON.stringify(recordData)]),
        });

        console.log(`📊 Subscription attempt recorded: ${data.success ? 'SUCCESS' : 'FAILURE'} - ${data.email}`);

    } catch (error) {
        console.error('Subscription recording error:', error);
        // 記録失敗は処理続行に影響させない
    }
}