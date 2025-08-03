// 修正版 api/admin/cost-monitor.js
export default async function handler(req, res) {
  const adminKey = req.headers['x-admin-key'];

  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Redis接続チェック
    if (!process.env.REDIS_URL || !process.env.KV_REST_API_TOKEN) {
      return res.status(500).json({
        error: 'Redis configuration missing',
        debug: {
          redis_url: !!process.env.REDIS_URL,
          redis_token: !!process.env.KV_REST_API_TOKEN
        }
      });
    }

    // 動的インポートでRedisクライアント作成
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({
      url: process.env.REDIS_URL,
      token: process.env.KV_REST_API_TOKEN,
    });

    const today = new Date().toISOString().split('T')[0];

    // Redis操作をtry-catchで包む
    let dailyCost = 0;
    let totalUsers = 0;
    let totalGenerations = 0;

    try {
      dailyCost = await redis.get(`daily_cost:${today}`) || 0;
      totalUsers = await redis.get(`daily_users:${today}`) || 0;
      totalGenerations = await redis.get(`daily_generations:${today}`) || 0;
    } catch (redisError) {
      console.error('Redis operation error:', redisError);
      return res.status(500).json({
        error: 'Redis operation failed',
        redis_error: redisError.message
      });
    }

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
    return res.status(500).json({
      error: 'Monitor error',
      debug: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}