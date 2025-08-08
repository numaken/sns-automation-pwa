// KV接続基本テスト API
export default async function handler(req, res) {
  try {
    console.log('KV Environment Variables Check:');
    console.log('KV_REST_API_URL:', !!process.env.KV_REST_API_URL);
    console.log('KV_REST_API_TOKEN:', !!process.env.KV_REST_API_TOKEN);

    const KV_URL = process.env.KV_REST_API_URL;
    const KV_TOKEN = process.env.KV_REST_API_TOKEN;

    if (!KV_URL || !KV_TOKEN) {
      return res.status(500).json({
        error: 'KV environment variables not set',
        hasUrl: !!KV_URL,
        hasToken: !!KV_TOKEN
      });
    }

    const testKey = `test_${Date.now()}`;
    const testValue = `test_value_${Date.now()}`;

    console.log('Testing KV with:', { testKey, testValue });

    // 1. SET操作テスト
    console.log('1. Testing SET operation...');
    const setResponse = await fetch(KV_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KV_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['SET', testKey, testValue]),
    });

    const setResult = await setResponse.json();
    console.log('SET response:', {
      status: setResponse.status,
      ok: setResponse.ok,
      result: setResult
    });

    if (!setResponse.ok) {
      return res.status(500).json({
        error: 'KV SET operation failed',
        status: setResponse.status,
        result: setResult
      });
    }

    // 2. GET操作テスト
    console.log('2. Testing GET operation...');
    const getResponse = await fetch(KV_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KV_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['GET', testKey]),
    });

    const getResult = await getResponse.json();
    console.log('GET response:', {
      status: getResponse.status,
      ok: getResponse.ok,
      result: getResult
    });

    // 3. SETEX（TTL付きSET）操作テスト
    console.log('3. Testing SETEX operation...');
    const setexKey = `setex_test_${Date.now()}`;
    const setexValue = `setex_value_${Date.now()}`;

    const setexResponse = await fetch(KV_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KV_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['SETEX', setexKey, 60, setexValue]), // 60秒TTL
    });

    const setexResult = await setexResponse.json();
    console.log('SETEX response:', {
      status: setexResponse.status,
      ok: setexResponse.ok,
      result: setexResult
    });

    // 4. SETEX結果確認
    const verifyResponse = await fetch(KV_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KV_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['GET', setexKey]),
    });

    const verifyResult = await verifyResponse.json();
    console.log('SETEX verification:', {
      status: verifyResponse.status,
      ok: verifyResponse.ok,
      result: verifyResult
    });

    // 5. クリーンアップ
    console.log('4. Cleanup...');
    await fetch(KV_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KV_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['DEL', testKey, setexKey]),
    });

    // 結果サマリー
    const testResults = {
      environment: {
        hasKvUrl: !!KV_URL,
        hasKvToken: !!KV_TOKEN
      },
      operations: {
        set: {
          success: setResponse.ok,
          status: setResponse.status,
          result: setResult
        },
        get: {
          success: getResponse.ok,
          status: getResponse.status,
          retrieved: getResult.result === testValue
        },
        setex: {
          success: setexResponse.ok,
          status: setexResponse.status,
          result: setexResult
        },
        setexVerify: {
          success: verifyResponse.ok,
          status: verifyResponse.status,
          retrieved: verifyResult.result === setexValue
        }
      }
    };

    console.log('KV Test Summary:', testResults);

    const allSuccess = setResponse.ok &&
      getResponse.ok &&
      getResult.result === testValue &&
      setexResponse.ok &&
      verifyResponse.ok &&
      verifyResult.result === setexValue;

    return res.status(200).json({
      success: allSuccess,
      message: allSuccess ? 'All KV operations successful' : 'Some KV operations failed',
      testResults,
      recommendation: allSuccess ?
        'KV is working correctly' :
        'Check KV configuration or permissions'
    });

  } catch (error) {
    console.error('KV Test Error:', error);
    return res.status(500).json({
      error: 'KV test failed with exception',
      message: error.message,
      stack: error.stack
    });
  }
}