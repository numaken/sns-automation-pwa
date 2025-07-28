// ベータテスト用ユーザー数制限システム
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const BETA_USER_LIMIT = parseInt(process.env.BETA_USER_LIMIT) || 10;

export async function checkBetaUserLimit(clientIP) {
  try {
    const userKey = `beta_user:${clientIP}`;
    const totalUsersKey = 'beta_users_total';

    // 既存ユーザーかチェック
    const isExistingUser = await fetch(`${REDIS_URL}/exists/${userKey}`, {
      headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
    });

    if (isExistingUser.ok && (await isExistingUser.json()).result === 1) {
      return { allowed: true, isExisting: true };
    }

    // 総ユーザー数チェック
    const totalUsersResponse = await fetch(`${REDIS_URL}/get/${totalUsersKey}`, {
      headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
    });

    const totalUsers = totalUsersResponse.ok ?
      parseInt((await totalUsersResponse.json()).result) || 0 : 0;

    if (totalUsers >= BETA_USER_LIMIT) {
      return {
        allowed: false,
        isExisting: false,
        currentUsers: totalUsers,
        limit: BETA_USER_LIMIT
      };
    }

    // 新規ユーザー登録
    await registerNewBetaUser(clientIP);

    return { allowed: true, isExisting: false, welcomeMessage: true };

  } catch (error) {
    console.error('Beta user limit check error:', error);
    // エラー時は制限なしで通す（可用性優先）
    return { allowed: true, isExisting: true };
  }
}

async function registerNewBetaUser(clientIP) {
  const userKey = `beta_user:${clientIP}`;
  const totalUsersKey = 'beta_users_total';
  const userListKey = 'beta_user_list';

  try {
    // ユーザー登録（30日間保持）
    await fetch(`${REDIS_URL}/setex/${userKey}/2592000/registered`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
    });

    // 総ユーザー数インクリメント
    await fetch(`${REDIS_URL}/incr/${totalUsersKey}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
    });

    // ユーザーリストに追加（管理用）
    const userData = {
      ip: clientIP,
      registeredAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    };

    await fetch(`${REDIS_URL}/hset/${userListKey}/${clientIP}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ value: JSON.stringify(userData) })
    });

  } catch (error) {
    console.error('Register new beta user error:', error);
  }
}

export async function getBetaUserStats() {
  try {
    const totalUsersResponse = await fetch(`${REDIS_URL}/get/beta_users_total`, {
      headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
    });

    const totalUsers = totalUsersResponse.ok ?
      parseInt((await totalUsersResponse.json()).result) || 0 : 0;

    return {
      currentUsers: totalUsers,
      limit: BETA_USER_LIMIT,
      remaining: Math.max(0, BETA_USER_LIMIT - totalUsers),
      percentage: Math.round((totalUsers / BETA_USER_LIMIT) * 100)
    };
  } catch (error) {
    console.error('Beta user stats error:', error);
    return { currentUsers: 0, limit: BETA_USER_LIMIT, remaining: BETA_USER_LIMIT, percentage: 0 };
  }
}

export async function updateUserActivity(clientIP) {
  try {
    const userListKey = 'beta_user_list';

    // 最終アクティブ時間更新
    const existingData = await fetch(`${REDIS_URL}/hget/${userListKey}/${clientIP}`, {
      headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
    });

    if (existingData.ok) {
      const userData = JSON.parse((await existingData.json()).result || '{}');
      userData.lastActive = new Date().toISOString();
      userData.totalUsage = (userData.totalUsage || 0) + 1;

      await fetch(`${REDIS_URL}/hset/${userListKey}/${clientIP}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${REDIS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ value: JSON.stringify(userData) })
      });
    }
  } catch (error) {
    console.error('Update user activity error:', error);
  }
}

// 管理者用：ベータユーザー一覧取得
export async function getBetaUserList() {
  try {
    const userListKey = 'beta_user_list';

    const response = await fetch(`${REDIS_URL}/hgetall/${userListKey}`, {
      headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
    });

    if (response.ok) {
      const data = await response.json();
      const users = [];

      for (const [ip, userData] of Object.entries(data.result || {})) {
        try {
          users.push({
            ip,
            ...JSON.parse(userData)
          });
        } catch (e) {
          console.error('Parse user data error:', e);
        }
      }

      return users.sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));
    }

    return [];
  } catch (error) {
    console.error('Get beta user list error:', error);
    return [];
  }
}