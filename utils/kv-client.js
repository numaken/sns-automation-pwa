// utils/kv-client.js - Vercel KV REST APIクライアント
// 注意: @upstash/redisパッケージは使用せず、REST API直接利用

/**
 * KVから値を取得
 * @param {string} key - 取得するキー
 * @returns {Promise<any>} - 取得した値（存在しない場合はnull）
 */
export async function getKVValue(key) {
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
      console.error(`KV GET error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error('KV GET error:', error);
    return null;
  }
}

/**
 * KVに値を設定
 * @param {string} key - 設定するキー
 * @param {any} value - 設定する値
 * @param {number|null} ttl - TTL（秒）、nullの場合は永続
 * @returns {Promise<boolean>} - 成功可否
 */
export async function setKVValue(key, value, ttl = null) {
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
      console.error(`KV SET error: ${response.status}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('KV SET error:', error);
    return false;
  }
}

/**
 * KVの値をインクリメント
 * @param {string} key - インクリメントするキー
 * @param {number} increment - インクリメント量（デフォルト：1）
 * @returns {Promise<number|null>} - インクリメント後の値
 */
export async function incrKVValue(key, increment = 1) {
  try {
    const command = increment === 1 ? ['INCR', key] : ['INCRBY', key, increment];

    const response = await fetch(process.env.KV_REST_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      console.error(`KV INCR error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error('KV INCR error:', error);
    return null;
  }
}

/**
 * KVの浮動小数点値をインクリメント
 * @param {string} key - インクリメントするキー
 * @param {number} increment - インクリメント量
 * @returns {Promise<number|null>} - インクリメント後の値
 */
export async function incrByFloatKVValue(key, increment) {
  try {
    const response = await fetch(process.env.KV_REST_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['INCRBYFLOAT', key, increment]),
    });

    if (!response.ok) {
      console.error(`KV INCRBYFLOAT error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return parseFloat(data.result);
  } catch (error) {
    console.error('KV INCRBYFLOAT error:', error);
    return null;
  }
}

/**
 * KVのキーにTTLを設定
 * @param {string} key - TTLを設定するキー
 * @param {number} ttl - TTL（秒）
 * @returns {Promise<boolean>} - 成功可否
 */
export async function expireKVKey(key, ttl) {
  try {
    const response = await fetch(process.env.KV_REST_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['EXPIRE', key, ttl]),
    });

    if (!response.ok) {
      console.error(`KV EXPIRE error: ${response.status}`);
      return false;
    }

    const data = await response.json();
    return data.result === 1;
  } catch (error) {
    console.error('KV EXPIRE error:', error);
    return false;
  }
}

/**
 * KVからキーを削除
 * @param {string} key - 削除するキー
 * @returns {Promise<boolean>} - 成功可否
 */
export async function deleteKVKey(key) {
  try {
    const response = await fetch(process.env.KV_REST_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['DEL', key]),
    });

    if (!response.ok) {
      console.error(`KV DEL error: ${response.status}`);
      return false;
    }

    const data = await response.json();
    return data.result > 0;
  } catch (error) {
    console.error('KV DEL error:', error);
    return false;
  }
}

/**
 * パターンに一致するキーを取得
 * @param {string} pattern - 検索パターン（例：'user:*'）
 * @returns {Promise<string[]>} - マッチしたキーの配列
 */
export async function getKVKeys(pattern) {
  try {
    const response = await fetch(process.env.KV_REST_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['KEYS', pattern]),
    });

    if (!response.ok) {
      console.error(`KV KEYS error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.result || [];
  } catch (error) {
    console.error('KV KEYS error:', error);
    return [];
  }
}

/**
 * 複数のキーの値を一度に取得
 * @param {string[]} keys - 取得するキーの配列
 * @returns {Promise<any[]>} - 取得した値の配列
 */
export async function mgetKVValues(keys) {
  if (!keys || keys.length === 0) return [];

  try {
    const response = await fetch(process.env.KV_REST_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['MGET', ...keys]),
    });

    if (!response.ok) {
      console.error(`KV MGET error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.result || [];
  } catch (error) {
    console.error('KV MGET error:', error);
    return [];
  }
}

/**
 * キーの存在確認
 * @param {string} key - 確認するキー
 * @returns {Promise<boolean>} - 存在する場合true
 */
export async function existsKVKey(key) {
  try {
    const response = await fetch(process.env.KV_REST_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['EXISTS', key]),
    });

    if (!response.ok) {
      console.error(`KV EXISTS error: ${response.status}`);
      return false;
    }

    const data = await response.json();
    return data.result === 1;
  } catch (error) {
    console.error('KV EXISTS error:', error);
    return false;
  }
}

/**
 * キーのTTL取得
 * @param {string} key - TTLを取得するキー
 * @returns {Promise<number>} - TTL（秒）、-1は永続、-2は存在しない
 */
export async function getTTLKVKey(key) {
  try {
    const response = await fetch(process.env.KV_REST_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['TTL', key]),
    });

    if (!response.ok) {
      console.error(`KV TTL error: ${response.status}`);
      return -2;
    }

    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error('KV TTL error:', error);
    return -2;
  }
}

/**
 * 日別使用量の取得・管理
 * @param {string} identifier - 識別子（IP等）
 * @param {number} limit - 制限値
 * @returns {Promise<{remaining: number, used: number}>} - 残り回数と使用回数
 */
export async function getDailyUsage(identifier, limit = 3) {
  const today = new Date().toISOString().split('T')[0];
  const key = `daily_usage:${identifier}:${today}`;

  const used = parseInt(await getKVValue(key)) || 0;
  const remaining = Math.max(0, limit - used);

  return { remaining, used };
}

/**
 * 日別使用量のインクリメント
 * @param {string} identifier - 識別子（IP等）
 * @returns {Promise<number>} - インクリメント後の使用回数
 */
export async function incrementDailyUsage(identifier) {
  const today = new Date().toISOString().split('T')[0];
  const key = `daily_usage:${identifier}:${today}`;

  const newCount = await incrKVValue(key);

  // 初回の場合、TTLを設定
  if (newCount === 1) {
    await expireKVKey(key, 86400); // 24時間
  }

  return newCount;
}