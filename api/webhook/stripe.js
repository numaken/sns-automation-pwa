// api/webhook/stripe.js - 完全版（KV操作追加）

// KV REST API操作関数
async function setKVValue(key, value, ttl = null) {
  try {
    const command = ttl
      ? ['SETEX', key, ttl, value.toString()]
      : ['SET', key, value.toString()];

    const response = await fetch(process.env.KV_REST_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      throw new Error(`KV API Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('KV SET Error:', error);
    throw error;
  }
}

async function getKVValue(key) {
  try {
    const response = await fetch(process.env.KV_REST_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['GET', key]),
    });

    if (!response.ok) {
      throw new Error(`KV API Error: ${response.status}`);
    }

    const result = await response.json();
    return result.result;
  } catch (error) {
    console.error('KV GET Error:', error);
    return null;
  }
}

// ユーザープラン更新関数
async function updateUserPlan(userId, plan) {
  try {
    console.log(`🔄 Updating user plan: ${userId} -> ${plan}`);

    // KVにプラン情報保存
    const planKey = `user_plan:${userId}`;
    const subscriptionKey = `subscription:${userId}`;

    // プラン情報保存（30日間保持）
    await setKVValue(planKey, plan, 30 * 24 * 60 * 60);

    // サブスクリプション情報保存
    const subscriptionData = {
      plan,
      status: 'active',
      activatedAt: new Date().toISOString(),
      userId
    };

    await setKVValue(subscriptionKey, JSON.stringify(subscriptionData), 30 * 24 * 60 * 60);

    console.log(`✅ User plan updated successfully: ${userId} -> ${plan}`);
    return true;

  } catch (error) {
    console.error(`❌ Failed to update user plan: ${userId}`, error);
    throw error;
  }
}

// ユーザープラン確認関数
async function getUserPlan(userId) {
  try {
    const planKey = `user_plan:${userId}`;
    const plan = await getKVValue(planKey);
    return plan || 'free';
  } catch (error) {
    console.error('Failed to get user plan:', error);
    return 'free';
  }
}

export default async function handler(req, res) {
  // POST以外のメソッドは拒否
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    console.log('📨 Webhook received:', req.body);

    const { type, data } = req.body;

    // 決済完了イベント処理
    if (type === 'checkout.session.completed') {
      const session = data.object;
      const userId = session.client_reference_id;

      console.log('💳 Processing checkout completion:', {
        sessionId: session.id,
        userId,
        customerEmail: session.customer_details?.email,
        amountTotal: session.amount_total
      });

      // ユーザーIDが存在するかチェック
      if (!userId) {
        console.error('❌ No userId found in session');
        return res.status(400).json({
          error: 'No userId in session',
          sessionId: session.id
        });
      }

      // プラン更新実行
      try {
        await updateUserPlan(userId, 'premium');

        console.log('🎉 Premium plan activated successfully:', {
          userId,
          sessionId: session.id,
          timestamp: new Date().toISOString()
        });

        return res.status(200).json({
          received: true,
          message: 'Premium plan activated',
          userId,
          sessionId: session.id
        });

      } catch (updateError) {
        console.error('❌ Plan update failed:', updateError);
        return res.status(500).json({
          error: 'Plan update failed',
          userId,
          sessionId: session.id
        });
      }
    }

    // サブスクリプション更新イベント処理
    if (type === 'customer.subscription.updated') {
      const subscription = data.object;
      console.log('📝 Subscription updated:', subscription.id);

      // 必要に応じてサブスクリプション状態更新
      // 現在は基本的なログのみ
    }

    // サブスクリプション削除/キャンセル処理
    if (type === 'customer.subscription.deleted') {
      const subscription = data.object;
      console.log('❌ Subscription cancelled:', subscription.id);

      // 必要に応じてプランダウングレード処理
      // 現在は基本的なログのみ
    }

    // その他のイベントは正常応答
    console.log(`📨 Webhook event received: ${type}`);
    return res.status(200).json({ received: true, type });

  } catch (error) {
    console.error('💥 Webhook processing error:', error);

    return res.status(400).json({
      error: 'Webhook processing failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// ヘルスチェック関数（デバッグ用）
export async function testWebhook(userId = 'test-user') {
  try {
    console.log('🧪 Testing webhook functionality...');

    // テスト用プラン更新
    await updateUserPlan(userId, 'premium');

    // プラン確認
    const plan = await getUserPlan(userId);

    console.log('✅ Webhook test completed:', { userId, plan });
    return { success: true, userId, plan };

  } catch (error) {
    console.error('❌ Webhook test failed:', error);
    return { success: false, error: error.message };
  }
}