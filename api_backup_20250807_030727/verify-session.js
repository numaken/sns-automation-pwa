// /api/verify-session.js
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { session_id } = req.query;

    if (!session_id) {
        return res.status(400).json({ error: 'Session ID is required' });
    }

    try {
        console.log('🔍 Verifying session:', session_id);

        // Checkout Session情報を取得
        const session = await stripe.checkout.sessions.retrieve(session_id, {
            expand: ['line_items', 'subscription', 'payment_intent']
        });

        console.log('📋 Session details:', {
            id: session.id,
            payment_status: session.payment_status,
            customer: session.customer,
            subscription: session.subscription?.id
        });

        // 決済が完了していない場合
        if (session.payment_status !== 'paid') {
            return res.status(400).json({
                error: '決済が完了していません',
                payment_status: session.payment_status,
                session_id: session.id
            });
        }

        // 顧客情報取得
        const customer = await stripe.customers.retrieve(session.customer);

        // サブスクリプション情報取得
        let subscriptionData = null;
        if (session.subscription) {
            subscriptionData = await stripe.subscriptions.retrieve(session.subscription);
        }

        // 次回請求日計算
        const nextBillingDate = subscriptionData
            ? new Date(subscriptionData.current_period_end * 1000)
            : null;

        const responseData = {
            // セッション情報
            session_id: session.id,
            payment_status: session.payment_status,
            payment_intent_id: session.payment_intent?.id || null,

            // 顧客情報
            customer_id: customer.id,
            customer_email: customer.email,

            // サブスクリプション情報
            subscription_id: subscriptionData?.id || null,
            subscription_status: subscriptionData?.status || null,
            plan_name: 'プレミアム',
            amount: 980,
            currency: 'jpy',

            // 請求情報
            next_billing_date: nextBillingDate?.toISOString() || null,
            next_billing_date_formatted: nextBillingDate?.toLocaleDateString('ja-JP') || null,

            // メタデータ
            created_at: new Date(session.created * 1000).toISOString(),
            metadata: session.metadata || {},

            // アプリ用フラグ
            upgrade_successful: true,
            plan: 'premium'
        };

        console.log('✅ Session verified successfully:', {
            sessionId: session.id,
            customerId: customer.id,
            email: customer.email,
            subscriptionId: subscriptionData?.id
        });

        res.status(200).json(responseData);

    } catch (error) {
        console.error('🔥 Session verification error:', {
            sessionId: session_id,
            message: error.message,
            type: error.type,
            code: error.code
        });

        // Stripeエラーの詳細な処理
        if (error.type === 'StripeInvalidRequestError') {
            return res.status(404).json({
                error: '無効なセッションIDです',
                message: 'セッションが見つからないか、期限切れです',
                session_id: session_id
            });
        }

        return res.status(500).json({
            error: 'セッション確認に失敗しました',
            message: error.message,
            details: error.type || 'unknown_error',
            session_id: session_id
        });
    }
}