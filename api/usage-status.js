// Upstash Redis connection using environment variables
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const DAILY_LIMIT = 3;

async function getRateLimitStatus(clientIP) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const key = `rate_limit:${clientIP}:${today}`;
    
    const response = await fetch(`${REDIS_URL}/get/${key}`, {
      headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
    });
    
    const currentUsage = response.ok ? parseInt((await response.json()).result) || 0 : 0;
    
    return {
      usage: currentUsage,
      remaining: 999, // Math.max(0, DAILY_LIMIT - currentUsage), テスト用に一時無効化
      limit: DAILY_LIMIT,
      resetTime: getNextResetTime()
    };
  } catch (error) {
    console.error('Rate limit status error:', error);
    return {
      usage: 0,
      remaining: DAILY_LIMIT,
      limit: DAILY_LIMIT,
      resetTime: getNextResetTime()
    };
  }
}

async function getUsageStats() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const pattern = `rate_limit:*:${today}`;
    
    // Note: Upstash Redis REST API doesn't support KEYS command directly
    // This is a simplified version for basic stats
    return {
      totalUniqueUsers: 0,
      totalRequests: 0,
      averageUsagePerUser: 0
    };
  } catch (error) {
    console.error('Usage stats error:', error);
    return {
      totalUniqueUsers: 0,
      totalRequests: 0,
      averageUsagePerUser: 0
    };
  }
}

export default async function handler(req, res) {
  // CORS対応
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    // レート制限状況取得
    const rateLimitStatus = await getRateLimitStatus(clientIP);
    
    const response = {
      // ユーザー向け情報
      remaining: rateLimitStatus.remaining,
      limit: rateLimitStatus.limit,
      resetTime: rateLimitStatus.resetTime,
      status: rateLimitStatus.remaining > 0 ? 'available' : 'exhausted',
      
      // 追加情報
      usage: {
        today: rateLimitStatus.usage,
        percentage: Math.round((rateLimitStatus.usage / rateLimitStatus.limit) * 100)
      }
    };

    // 管理者モード（特定のヘッダーがある場合）
    const isAdmin = req.headers['x-admin-key'] === process.env.ADMIN_KEY;
    if (isAdmin) {
      const usageStats = await getUsageStats();
      response.admin = {
        stats: usageStats,
        message: 'Admin access granted'
      };
    }

    res.status(200).json(response);

  } catch (error) {
    console.error('Usage status error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: '使用状況の取得に失敗しました'
    });
  }
}

// ヘルパー関数：次のリセット時間を計算
function getNextResetTime() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}
