// 修正版 api/admin/emergency-stop.js
export default async function handler(req, res) {
  const adminKey = req.headers['x-admin-key'];

  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Redis接続チェック
    if (!process.env.REDIS_URL || !process.env.KV_REST_API_TOKEN) {
      return res.status(500).json({
        error: 'Redis configuration missing'
      });
    }

    // 動的インポートでRedisクライアント作成
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({
      url: process.env.REDIS_URL,
      token: process.env.KV_REST_API_TOKEN,
    });

    const today = new Date().toISOString().split('T')[0];

    try {
      const dailyCost = await redis.get(`daily_cost:${today}`) || 0;
      const costLimit = parseFloat(process.env.DAILY_COST_LIMIT) || 10;

      if (parseFloat(dailyCost) > costLimit) {
        // 緊急停止フラグ設定
        await redis.set(`emergency_stop:${today}`, '1', { ex: 86400 });

        // アラート送信（実装は環境に応じて）
        console.error(`🚨 EMERGENCY STOP: Daily cost exceeded $${dailyCost}`);

        return res.json({
          status: 'STOPPED',
          reason: 'Daily cost limit exceeded',
          cost: parseFloat(dailyCost),
          limit: costLimit
        });
      }

      return res.json({
        status: 'OK',
        cost: parseFloat(dailyCost),
        limit: costLimit
      });

    } catch (redisError) {
      console.error('Redis operation error:', redisError);
      return res.status(500).json({
        error: 'Redis operation failed',
        redis_error: redisError.message
      });
    }

  } catch (error) {
    console.error('Emergency stop error:', error);
    return res.status(500).json({
      error: 'Emergency stop error',
      debug: error.message
    });
  }
}