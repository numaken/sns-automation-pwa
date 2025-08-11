// ===============================================
// 3. api/get-user-plan.js - 新規作成
// ===============================================
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // KVストレージからプラン取得
    const kvResponse = await fetch(`${process.env.KV_REST_API_URL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(['GET', `user_plan:${userId}`])
    });

    if (kvResponse.ok) {
      const result = await kvResponse.json();
      const plan = result.result || 'free';

      console.log(`📋 Plan for user ${userId}: ${plan}`);

      res.status(200).json({
        plan: plan,
        isPremium: plan === 'premium',
        userId: userId
      });
    } else {
      // KV取得失敗時はfreeとして扱う
      console.log(`⚠️ KV plan retrieval failed for user ${userId}, defaulting to free`);
      res.status(200).json({
        plan: 'free',
        isPremium: false,
        userId: userId
      });
    }
  } catch (error) {
    console.error('❌ Plan retrieval error:', error);
    res.status(200).json({
      plan: 'free',
      isPremium: false,
      userId: userId
    });
  }
}
