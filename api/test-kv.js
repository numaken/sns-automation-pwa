// Vercel KV 接続テスト API（拡張版）
export default async function handler(req, res) {
  console.log('KV Test API called:', req.method, req.query);

  // 特定キー検索機能
  if (req.method === 'GET' && req.query.action === 'get') {
    const key = req.query.key;
    if (!key) {
      return res.json({ error: 'Key parameter required' });
    }

    console.log(`KV GET request for key: ${key}`);

    try {
      const result = await getKVValue(key);
      console.log(`KV GET result for ${key}:`, { found: result !== null, result });

      return res.json({
        action: 'get',
        key: key,
        found: result !== null,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`KV GET error for ${key}:`, error);
      return res.json({
        action: 'get',
        key: key,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // PKCE検索機能
  if (req.method === 'GET' && req.query.action === 'search-pkce') {
    const state = req.query.state;
    const userId = req.query.userId; // 新追加：特定userId指定

    if (!state) {
      return res.json({ error: 'State parameter required' });
    }

    console.log(`PKCE search for state: ${state}, userId: ${userId}`);

    // 基本的な検索パターン + 動的userId対応
    const searchPatterns = [
      `twitter_oauth_pkce:kv-test-debug:${state}`,
      `twitter_oauth_pkce:debug-test-user:${state}`,
      `twitter_oauth_pkce:callback-test:${state}`,
      `twitter_oauth_pkce:test-user:${state}`,
      `twitter_oauth_pkce:test:${state}`,
      `twitter_oauth_pkce:final-test:${state}`,
      `twitter_oauth_pkce:ttl-fix-test:${state}`, // 新追加
      `twitter_oauth_pkce:${state}`,
      state
    ];

    // 特定userIdが指定された場合、最優先で検索
    if (userId) {
      searchPatterns.unshift(`twitter_oauth_pkce:${userId}:${state}`);
    }

    const results = [];

    for (const pattern of searchPatterns) {
      try {
        const result = await getKVValue(pattern);
        results.push({
          pattern: pattern,
          found: result !== null,
          data: result
        });

        if (result !== null) {
          console.log(`✅ PKCE data found with pattern: ${pattern}`);
          break;
        }
      } catch (error) {
        results.push({
          pattern: pattern,
          found: false,
          error: error.message
        });
      }
    }

    return res.json({
      action: 'search-pkce',
      state: state,
      searchResults: results,
      timestamp: new Date().toISOString()
    });
  }

  // 基本的なKV接続テスト（既存機能）
  try {
    // 環境変数の確認
    const hasKvUrl = !!process.env.KV_REST_API_URL;
    const hasKvToken = !!process.env.KV_REST_API_TOKEN;

    console.log('Environment check:', { hasKvUrl, hasKvToken });

    if (!hasKvUrl || !hasKvToken) {
      return res.status(500).json({
        success: false,
        error: 'KV environment variables not configured',
        environment: { hasKvUrl, hasKvToken }
      });
    }

    // 基本的な読み書きテスト
    const testKey = 'kv_test_' + Date.now();
    const testValue = 'test_value_' + Date.now();

    console.log('Starting KV operations test...');

    // SET操作のテスト
    const setResponse = await fetch(`${process.env.KV_REST_API_URL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['SET', testKey, testValue]),
    });
    const setResult = await setResponse.json();
    console.log('SET result:', { status: setResponse.status, result: setResult });

    // GET操作のテスト
    const getResponse = await fetch(`${process.env.KV_REST_API_URL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['GET', testKey]),
    });
    const getResult = await getResponse.json();
    console.log('GET result:', { status: getResponse.status, result: getResult });

    // SETEX操作のテスト（TTL付き）
    const setexKey = testKey + '_ttl';
    const setexResponse = await fetch(`${process.env.KV_REST_API_URL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['SETEX', setexKey, 60, testValue]),
    });
    const setexResult = await setexResponse.json();
    console.log('SETEX result:', { status: setexResponse.status, result: setexResult });

    // SETEX検証のGET
    const setexVerifyResponse = await fetch(`${process.env.KV_REST_API_URL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['GET', setexKey]),
    });
    const setexVerifyResult = await setexVerifyResponse.json();
    console.log('SETEX verify result:', { status: setexVerifyResponse.status, result: setexVerifyResult });

    // 結果の評価
    const allSuccess = setResponse.ok && getResponse.ok && setexResponse.ok && setexVerifyResponse.ok;
    const dataRetrieved = getResult.result === testValue;
    const setexDataRetrieved = setexVerifyResult.result === testValue;

    return res.json({
      success: allSuccess && dataRetrieved && setexDataRetrieved,
      message: allSuccess && dataRetrieved && setexDataRetrieved
        ? 'All KV operations successful'
        : 'Some KV operations failed',
      testResults: {
        environment: { hasKvUrl, hasKvToken },
        operations: {
          set: {
            success: setResponse.ok,
            status: setResponse.status,
            result: setResult
          },
          get: {
            success: getResponse.ok,
            status: getResponse.status,
            retrieved: dataRetrieved
          },
          setex: {
            success: setexResponse.ok,
            status: setexResponse.status,
            result: setexResult
          },
          setexVerify: {
            success: setexVerifyResponse.ok,
            status: setexVerifyResponse.status,
            retrieved: setexDataRetrieved
          }
        }
      },
      recommendation: allSuccess && dataRetrieved && setexDataRetrieved
        ? 'KV is working correctly'
        : 'Check KV configuration and permissions'
    });

  } catch (error) {
    console.error('KV test error:', error);
    return res.status(500).json({
      success: false,
      error: 'KV test failed',
      message: error.message,
      stack: error.stack
    });
  }
}

// KVからデータを取得するヘルパー関数
async function getKVValue(key) {
  try {
    const response = await fetch(`${process.env.KV_REST_API_URL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['GET', key]),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(`KV GET failed for ${key}:`, result);
      return null;
    }

    return result.result;
  } catch (error) {
    console.error(`KV GET error for ${key}:`, error);
    return null;
  }
}