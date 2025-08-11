// api/debug/system-status.js - システム状態確認API
export default async function handler(req, res) {
  console.log('=== Debug System Status API START ===');

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.method === 'POST' ? req.body : req.query;

  try {
    console.log('Checking system status for userId:', userId);

    // 1. 環境変数チェック
    const environmentCheck = {
      kv: {
        hasUrl: !!process.env.KV_REST_API_URL,
        hasToken: !!process.env.KV_REST_API_TOKEN,
        urlPreview: process.env.KV_REST_API_URL ? process.env.KV_REST_API_URL.substring(0, 30) + '...' : null
      },
      twitter: {
        hasClientId: !!process.env.TWITTER_CLIENT_ID,
        hasClientSecret: !!process.env.TWITTER_CLIENT_SECRET,
        clientIdPreview: process.env.TWITTER_CLIENT_ID ? process.env.TWITTER_CLIENT_ID.substring(0, 10) + '...' : null
      },
      threads: {
        hasAppId: !!process.env.THREADS_APP_ID,
        hasAppSecret: !!process.env.THREADS_APP_SECRET,
        appIdPreview: process.env.THREADS_APP_ID ? process.env.THREADS_APP_ID.substring(0, 10) + '...' : null
      },
      openai: {
        hasSharedKey: !!process.env.OPENAI_API_KEY_SHARED,
        keyPreview: process.env.OPENAI_API_KEY_SHARED ? process.env.OPENAI_API_KEY_SHARED.substring(0, 10) + '...' : null
      }
    };

    // 2. KV接続テスト
    let kvConnectionTest = null;
    try {
      const testKey = 'debug_test_' + Date.now();
      const testValue = 'test_value_' + Date.now();

      // SET テスト
      const setResponse = await fetch(`${process.env.KV_REST_API_URL}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['SETEX', testKey, 60, testValue]),
      });

      const setResult = await setResponse.json();

      // GET テスト
      const getResponse = await fetch(`${process.env.KV_REST_API_URL}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['GET', testKey]),
      });

      const getResult = await getResponse.json();

      kvConnectionTest = {
        setSuccess: setResponse.ok,
        getSuccess: getResponse.ok,
        valueMatch: getResult.result === testValue,
        overall: setResponse.ok && getResponse.ok && getResult.result === testValue
      };

      // クリーンアップ
      await fetch(`${process.env.KV_REST_API_URL}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['DEL', testKey]),
      });

    } catch (error) {
      kvConnectionTest = {
        error: error.message,
        overall: false
      };
    }

    // 3. ユーザー関連データチェック（userIdが提供された場合）
    let userDataCheck = null;
    if (userId) {
      userDataCheck = await checkUserData(userId);
    }

    // 4. KVキー一覧（制限付き）
    let kvKeysSample = null;
    try {
      // 一般的なキーパターンをチェック
      const commonKeys = [
        'userPlan',
        'user_plan',
        'twitter_token:test_user',
        'threads_token:test_user',
        'daily_usage:127.0.0.1:' + new Date().toISOString().split('T')[0]
      ];

      kvKeysSample = {};
      for (const key of commonKeys) {
        const response = await fetch(`${process.env.KV_REST_API_URL}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(['GET', key]),
        });

        const result = await response.json();
        kvKeysSample[key] = {
          exists: !!result.result,
          preview: result.result ? result.result.substring(0, 50) + '...' : null
        };
      }
    } catch (error) {
      kvKeysSample = { error: error.message };
    }

    const systemStatus = {
      timestamp: new Date().toISOString(),
      environment: environmentCheck,
      kvConnection: kvConnectionTest,
      userData: userDataCheck,
      kvKeysSample,
      serverInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      }
    };

    console.log('✅ System status check completed');
    return res.status(200).json(systemStatus);

  } catch (error) {
    console.error('❌ System status check error:', error);
    return res.status(500).json({
      error: 'System status check failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// ユーザーデータ詳細チェック
async function checkUserData(userId) {
  try {
    console.log('Checking user data for:', userId);

    const userData = {
      userId,
      plan: null,
      twitterConnection: null,
      threadsConnection: null,
      recentActivity: null
    };

    // プランチェック
    const planKeys = [
      `user_plan:${userId}`,
      `userPlan:${userId}`,
      'userPlan',
      'user_plan'
    ];

    for (const key of planKeys) {
      const response = await fetch(`${process.env.KV_REST_API_URL}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['GET', key]),
      });

      const result = await response.json();
      if (result.result) {
        userData.plan = {
          key,
          value: result.result,
          found: true
        };
        break;
      }
    }

    if (!userData.plan) {
      userData.plan = { found: false, checkedKeys: planKeys };
    }

    // Twitterトークンチェック
    const twitterKeys = [
      `twitter_token:${userId}`,
      `twitter_token:numaken_jp`,
      `twitter_token:test_user`
    ];

    for (const key of twitterKeys) {
      const response = await fetch(`${process.env.KV_REST_API_URL}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['GET', key]),
      });

      const result = await response.json();
      if (result.result) {
        userData.twitterConnection = {
          key,
          hasToken: true,
          tokenPreview: result.result.substring(0, 20) + '...',
          isTestToken: result.result.includes('test_token')
        };
        break;
      }
    }

    if (!userData.twitterConnection) {
      userData.twitterConnection = { found: false, checkedKeys: twitterKeys };
    }

    // Threadsトークンチェック
    const threadsKeys = [
      `threads_token:${userId}`,
      `threads_token:numaken_threads`,
      `threads_token:test_user`
    ];

    for (const key of threadsKeys) {
      const response = await fetch(`${process.env.KV_REST_API_URL}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['GET', key]),
      });

      const result = await response.json();
      if (result.result) {
        userData.threadsConnection = {
          key,
          hasToken: true,
          tokenPreview: result.result.substring(0, 20) + '...',
          isTestToken: result.result.includes('test_token')
        };
        break;
      }
    }

    if (!userData.threadsConnection) {
      userData.threadsConnection = { found: false, checkedKeys: threadsKeys };
    }

    return userData;

  } catch (error) {
    console.error('Failed to check user data:', error);
    return {
      error: error.message,
      userId
    };
  }
}