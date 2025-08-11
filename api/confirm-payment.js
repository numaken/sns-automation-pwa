// ===============================================
// 2. api/confirm-payment.js - 完全修正版
// ===============================================
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { session_id } = req.body;

  if (!session_id) {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  try {
    console.log(`🔍 Confirming payment for session: ${session_id}`);

    // Stripe セッション詳細取得
    const session = await stripe.checkout.sessions.retrieve(session_id);

    console.log(`💰 Payment status: ${session.payment_status}`);
    console.log(`👤 User ID: ${session.client_reference_id}`);

    if (session.payment_status === 'paid') {
      const userId = session.client_reference_id;

      if (!userId) {
        return res.status(400).json({ error: 'User ID not found in session' });
      }

      // 🔧 修正: KVストレージにプレミアムプラン設定
      console.log('💾 Setting premium plan in KV storage...');

      const kvResponse = await fetch(`${process.env.KV_REST_API_URL}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([
          'SET',
          `user_plan:${userId}`,
          'premium',
          'EX',
          2592000 // 30日間
        ])
      });

      if (kvResponse.ok) {
        console.log(`✅ Premium plan set for user: ${userId}`);

        // 🔧 修正: 決済情報も保存
        await fetch(`${process.env.KV_REST_API_URL}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify([
            'SET',
            `payment_info:${userId}`,
            JSON.stringify({
              sessionId: session_id,
              amount: session.amount_total,
              currency: session.currency,
              paidAt: new Date().toISOString()
            }),
            'EX',
            2592000
          ])
        });

        res.status(200).json({
          success: true,
          userId: userId,
          plan: 'premium',
          paymentAmount: session.amount_total / 100, // 円に変換
          currency: session.currency,
          message: 'プレミアムプランが正常に設定されました'
        });
      } else {
        const kvError = await kvResponse.text();
        console.error('❌ KV storage update failed:', kvError);

        return res.status(500).json({
          error: 'Premium plan setting failed',
          details: 'データベース更新エラー'
        });
      }
    } else {
      return res.status(400).json({
        error: '決済が完了していません',
        payment_status: session.payment_status
      });
    }
  } catch (error) {
    console.error('❌ Payment confirmation error:', error);
    res.status(500).json({
      error: 'Payment confirmation failed',
      details: error.message
    });
  }
}
