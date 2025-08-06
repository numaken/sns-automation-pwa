// api/create-checkout-session.js - Stripe Checkout Session API
export default async function handler(req, res) {
    // CORS対応
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({
            error: 'Method not allowed',
            allowed_methods: ['POST']
        });
    }

    try {
        const {
            email,
            plan = 'premium',
            success_url,
            cancel_url,
            trial_days = 0,
            promotion_code
        } = req.body;

        // 入力検証
        if (!email || !email.includes('@') || !email.includes('.')) {
            return res.status(400).json({
                error: '有効なメールアドレスが必要です',
                code: 'INVALID_EMAIL'
            });
        }

        // Stripe設定確認
        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(503).json({
                error: 'Stripe設定が完了していません',
                code: 'STRIPE_NOT_CONFIGURED',
                message: 'しばらく後にお試しください'
            });
        }

        // プラン情報取得
        const planInfo = getStripePlanInfo(plan);
        if (!planInfo) {
            return res.status(400).json({
                error: '無効なプランが指定されました',
                code: 'INVALID_PLAN',
                available_plans: ['premium', 'business']
            });
        }

        console.log(`🛒 Creating checkout session: ${email} -> ${plan}`);

        // レート制限チェック（同じメールアドレスからの連続リクエスト）
        const rateLimited = await checkRateLimit(email);
        if (rateLimited) {
            return res.status(429).json({
                error: 'リクエストが多すぎます',
                code: 'RATE_LIMIT_EXCEEDED',
                message: '1分間待ってから再試行してください',
                retry_after: 60
            });
        }

        // Checkout Session作成
        const checkoutResult = await createCheckoutSession({
            email,
            planInfo,
            success_url: success_url || `${getBaseUrl(req)}/success`,
            cancel_url: cancel_url || `${getBaseUrl(req)}`,
            trial_days,
            promotion_code
        });

        if (checkoutResult.success) {
            // 成功統計記録
            await recordCheckoutAttempt({
                email,
                plan,
                success: true,
                session_id: checkoutResult.sessionId,
                customer_id: checkoutResult.customerId,
                ip: getClientIP(req),
                user_agent: req.headers['user-agent']
            });

            return res.status(200).json({
                success: true,
                message: 'Checkout sessionを作成しました',
                url: checkoutResult.url,
                sessionId: checkoutResult.sessionId,
                customerId: checkoutResult.customerId,
                planInfo: {
                    name: planInfo.name,
                    price: planInfo.price,
                    currency: planInfo.currency,
                    interval: planInfo.interval
                },
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24時間後
                trial_days: trial_days
            });
        } else {
            throw new Error(checkoutResult.error || 'Checkout session creation failed');
        }

    } catch (error) {
        console.error('❌ Checkout session creation error:', error);

        // 失敗統計記録
        try {
            await recordCheckoutAttempt({
                email: req.body.email,
                plan: req.body.plan,
                success: false,
                error: error.message,
                ip: getClientIP(req),
                user_agent: req.headers['user-agent']
            });
        } catch (logError) {
            console.error('Failed to log checkout attempt:', logError);
        }

        // エラー種別に応じたレスポンス
        if (error.message.includes('Invalid price')) {
            return res.status(400).json({
                error: 'プラン設定にエラーがあります',
                code: 'INVALID_PRICE_CONFIGURATION'
            });
        }

        if (error.message.includes('rate_limit')) {
            return res.status(429).json({
                error: 'API制限に達しました',
                code: 'STRIPE_RATE_LIMIT',
                retry_after: 60
            });
        }

        return res.status(500).json({
            error: 'Checkout session作成に失敗しました',
            code: 'CHECKOUT_CREATION_FAILED',
            message: 'しばらく待ってから再試行してください',
            debug: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

// Stripeプラン情報取得
function getStripePlanInfo(planType) {
    const plans = {
        premium: {
            name: 'SNS自動化ツール プレミアムプラン',
            price_id: process.env.STRIPE_PREMIUM_PRICE_ID || 'price_premium_test',
            price: 980,
            currency: 'jpy',
            interval: 'month',
            features: [
                '無制限AI投稿生成',
                '高速生成（2秒以内）',
                '最高品質AI（95点以上）',
                'Twitter・Threads直接投稿',
                '投稿統計・分析',
                '広告なし',
                '優先サポート'
            ],
            description: 'SNS運用を完全自動化。無制限の高品質投稿生成でビジネスを加速させましょう。',
            trial_period_days: 7 // 7日間無料トライアル
        },
        business: {
            name: 'SNS自動化ツール ビジネスプラン',
            price_id: process.env.STRIPE_BUSINESS_PRICE_ID || 'price_business_test',
            price: 2980,
            currency: 'jpy',
            interval: 'month',
            features: [
                'プレミアム機能すべて',
                '複数アカウント管理（最大10アカウント）',
                'チーム機能（メンバー追加）',
                '詳細分析レポート',
                'API提供',
                '専用サポート'
            ],
            description: 'チームでのSNS運用に最適。複数アカウント管理と高度な分析機能を提供。',
            trial_period_days: 14 // 14日間無料トライアル
        }
    };

    return plans[planType] || null;
}

// Checkout Session作成
async function createCheckoutSession({
    email,
    planInfo,
    success_url,
    cancel_url,
    trial_days = 0,
    promotion_code
}) {
    try {
        // 実際の実装ではStripeライブラリを使用
        /*
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
        // 1. 既存顧客確認
        let customer;
        const existingCustomers = await stripe.customers.list({
          email: email,
          limit: 1
        });
    
        if (existingCustomers.data.length > 0) {
          customer = existingCustomers.data[0];
          console.log('✅ Existing customer found:', customer.id);
        } else {
          // 新規顧客作成
          customer = await stripe.customers.create({
            email: email,
            metadata: {
              source: 'sns-automation-tool',
              signup_date: new Date().toISOString(),
              plan: planInfo.name
            }
          });
          console.log('🆕 New customer created:', customer.id);
        }
    
        // 2. Checkout Session作成オプション
        const sessionOptions = {
          customer: customer.id,
          payment_method_types: ['card'],
          line_items: [{
            price: planInfo.price_id,
            quantity: 1,
          }],
          mode: 'subscription',
          success_url: success_url + '?session_id={CHECKOUT_SESSION_ID}',
          cancel_url: cancel_url,
          allow_promotion_codes: true,
          billing_address_collection: 'auto',
          customer_update: {
            address: 'auto',
            name: 'auto'
          },
          metadata: {
            plan: planInfo.name,
            email: email,
            trial_days: trial_days.toString(),
            created_at: new Date().toISOString()
          },
          subscription_data: {
            description: planInfo.description,
            metadata: {
              plan: planInfo.name,
              email: email,
              source: 'sns-automation-tool',
              features: JSON.stringify(planInfo.features)
            }
          }
        };
    
        // トライアル設定
        if (trial_days > 0) {
          sessionOptions.subscription_data.trial_period_days = trial_days;
        }
    
        // プロモーションコード設定
        if (promotion_code) {
          sessionOptions.discounts = [{ promotion_code: promotion_code }];
        }
    
        // セッション作成
        const session = await stripe.checkout.sessions.create(sessionOptions);
    
        return {
          success: true,
          url: session.url,
          sessionId: session.id,
          customerId: customer.id
        };
        */

        // テスト用のモック実装
        console.log('🧪 Mock checkout session creation');
        console.log('   Email:', email);
        console.log('   Plan:', planInfo.name);
        console.log('   Price:', `¥${planInfo.price}/${planInfo.interval}`);

        const mockSessionId = `cs_test_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
        const mockCustomerId = `cus_test_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;

        // 実際のStripe Checkoutのような形式のURL
        const mockCheckoutUrl = `https://checkout.stripe.com/c/pay/${mockSessionId}#fidkdWxOYHwnPyd1blppbHNgWkFSNktaNGBaU01rJTNAMDcwUkZOZFdHRj1xR1BNPCcpJ2N3amhWYHdzYHcnP3F3cGApJ2lkfGpwcVF8dWAnPydocGlxbFpscWBoJyknYGtkZ2lgVWlkZmBtamlhYHd2Jz9xd3BgKSdpZGFpbFpscGhkJyknZ3FgdGhgc2gg`;

        // 少し遅延を加える（実際のAPI呼び出しをシミュレート）
        await new Promise(resolve => setTimeout(resolve, 500));

        return {
            success: true,
            url: mockCheckoutUrl,
            sessionId: mockSessionId,
            customerId: mockCustomerId
        };

    } catch (error) {
        console.error('Stripe checkout session error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// レート制限チェック
async function checkRateLimit(email) {
    try {
        if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
            return false; // KV未設定の場合は制限なし
        }

        const rateLimitKey = `checkout_rate_limit:${email}`;

        // 現在のカウント取得
        const response = await fetch(`${process.env.KV_REST_API_URL}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(['GET', rateLimitKey]),
        });

        if (response.ok) {
            const data = await response.json();
            const count = parseInt(data.result) || 0;

            // 1分間に3回まで許可
            if (count >= 3) {
                return true; // レート制限に引っかかる
            }

            // カウンターをインクリメント
            await fetch(`${process.env.KV_REST_API_URL}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(['INCR', rateLimitKey]),
            });

            // TTL設定（60秒）
            await fetch(`${process.env.KV_REST_API_URL}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(['EXPIRE', rateLimitKey, 60]),
            });
        }

        return false; // 制限なし
    } catch (error) {
        console.error('Rate limit check error:', error);
        return false; // エラー時は制限なし
    }
}

// Checkout試行記録
async function recordCheckoutAttempt(data) {
    try {
        if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
            console.log('KV not configured, skipping checkout recording');
            return;
        }

        const timestamp = new Date().toISOString();
        const recordKey = `checkout_attempt:${timestamp.split('T')[0]}:${Date.now()}`;

        const recordData = {
            ...data,
            timestamp,
            date: timestamp.split('T')[0] // YYYY-MM-DD
        };

        // KV に記録を保存（30日間保持）
        await fetch(`${process.env.KV_REST_API_URL}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(['SETEX', recordKey, 86400 * 30, JSON.stringify(recordData)]),
        });

        console.log(`📈 Checkout attempt recorded: ${data.success ? '✅ SUCCESS' : '❌ FAILURE'} - ${data.email}`);

    } catch (error) {
        console.error('Checkout recording error:', error);
        // 記録失敗は処理続行に影響させない
    }
}

// ヘルパー関数
function getBaseUrl(req) {
    const protocol = req.headers['x-forwarded-proto'] || (req.connection.encrypted ? 'https' : 'http');
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    return `${protocol}://${host}`;
}

function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.headers['x-real-ip'] ||
        req.headers['cf-connecting-ip'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        'unknown';
}