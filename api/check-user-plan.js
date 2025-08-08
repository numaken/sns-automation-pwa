// api/check-user-plan.js
// 引き継ぎ書指定: ユーザープラン判定API

// KV REST API関数（引き継ぎ書の既存パターン使用）
const kvGet = async (key) => {
  const response = await fetch(process.env.KV_REST_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(['GET', key]),
  });
  return (await response.json()).result;
};

const kvSet = async (key, value, ttl = null) => {
  const command = ttl
    ? ['SETEX', key, ttl, value.toString()]
    : ['SET', key, value.toString()];

  await fetch(process.env.KV_REST_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // KVからプラン情報取得（引き継ぎ書のキー仕様: user_plan:{userId}）
    const planKey = `user_plan:${userId}`;
    const userPlan = await kvGet(planKey);

    // デフォルトは無料プラン
    const plan = userPlan || 'free';

    return res.status(200).json({
      userId: userId,
      plan: plan,
      isPremium: plan === 'premium',
      features: {
        unlimited_generation: plan === 'premium',
        sns_posting: plan === 'premium',
        priority_support: plan === 'premium'
      }
    });

  } catch (error) {
    console.error('Check user plan error:', error);
    return res.status(500).json({
      error: 'Failed to check user plan',
      details: error.message
    });
  }
}

// 管理者用: プラン設定関数（将来の管理画面用）
export async function setUserPlan(userId, plan) {
  const planKey = `user_plan:${userId}`;
  await kvSet(planKey, plan);
  return { success: true, userId, plan };
}