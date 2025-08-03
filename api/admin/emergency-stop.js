// 予算超過時の自動停止機能
export default async function handler(req, res) {
  try {
    const today = new Date().toISOString().split('T')[0];
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

    return res.json({ status: 'OK', cost: parseFloat(dailyCost) });

  } catch (error) {
    console.error('Emergency stop error:', error);
    return res.status(500).json({ error: 'Emergency stop error' });
  }
}