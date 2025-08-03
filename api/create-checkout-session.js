// /api/create-checkout-session.js
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        // 顧客の検索または作成
        const customers = await stripe.customers.list({ email, limit: 1 });
        const customer = customers.data.length > 0
            ? customers.data[0]
            : await stripe.customers.create({
                email,
                metadata: {
                    source: 'sns-automation-app',
                    signup_date: new Date().toISOString()
                }
            });

        // Checkout Session作成
        const session = await stripe.checkout.sessions.create({
            customer: customer.id,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: 'price_1RrjyUQK8lTckdl0JfCAfrJm', // プレミアムプラン Price ID
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${req.headers.origin || 'https://sns-automation-pwa.vercel.app'}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.origin || 'https://sns-automation-pwa.vercel.app'}/cancel`,
            automatic_tax: { enabled: false },
            billing_address_collection: 'auto',
            customer_update: {
                address: 'auto',
                name: 'auto',
            },
            metadata: {
                customer_email: email,
                plan: 'premium',
                source: 'upgrade_button',
                timestamp: new Date().toISOString()
            },
            subscription_data: {
                metadata: {
                    plan: 'premium',
                    customer_email: email,
                    source: 'web_app'
                }
            },
            // 日本語対応
            locale: 'ja',
            // 支払い方法の設定
            payment_method_configuration: undefined, // デフォルト設定使用
            // カスタマイズ
            custom_text: {
                submit: {
                    message: 'SNS自動化プレミアムプランへのアップグレード'
                }
            }
        });

        console.log('✅ Checkout session created:', {
            sessionId: session.id,
            customerId: customer.id,
            email: email,
            url: session.url
        });

        return res.status(200).json({
            sessionId: session.id,
            url: session.url,
            customerId: customer.id
        });

    } catch (error) {
        console.error('🔥 Checkout session creation error:', {
            message: error.message,
            type: error.type,
            code: error.code,
            stack: error.stack
        });

        return res.status(500).json({
            error: 'Checkout session作成に失敗しました',
            message: error.message,
            details: error.type || 'unknown_error'
        });
    }
}