// 管理者用コスト監視API
export default async function handler(req, res) {
  const adminKey = req.headers['x-admin-key'];

  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    // 当日のコスト取得
    const dailyCost = await redis.get(`daily_cost:${today}`) || 0;

    // 使用量統計
    const totalUsers = await redis.get(`daily_users:${today}`) || 0;
    const totalGenerations = await redis.get(`daily_generations:${today}`) || 0;

    // アラート判定
    const costLimit = parseFloat(process.env.DAILY_COST_LIMIT) || 10;
    const alertThreshold = costLimit * 0.8;

    return res.json({
      date: today,
      cost: {
        current: parseFloat(dailyCost).toFixed(4),
        limit: costLimit,
        percentage: (parseFloat(dailyCost) / costLimit * 100).toFixed(1),
        alert: parseFloat(dailyCost) > alertThreshold
      },
      usage: {
        total_users: parseInt(totalUsers),
        total_generations: parseInt(totalGenerations),
        avg_cost_per_generation: totalGenerations > 0
          ? (parseFloat(dailyCost) / parseInt(totalGenerations)).toFixed(6)
          : 0
      },
      status: parseFloat(dailyCost) > costLimit ? 'LIMIT_EXCEEDED' : 'OK'
    });

  } catch (error) {
    console.error('Cost monitor error:', error);
    return res.status(500).json({ error: 'Monitor error' });
  }
}