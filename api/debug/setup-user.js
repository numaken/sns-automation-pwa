// api/debug/setup-user.js - ユーザーデータ手動設定API
export default async function handler(req, res) {
  console.log('=== Manual User Setup API START ===');
  console.log('Method:', req.method);
  console.log('Body:', req.body);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, setupType = 'full' } = req.body;

  if (!userId) {
    return res.status(400).json({
      error: 'userId is required',
      example: '{"userId":"user_1754949668394_q22a9yu8g","setupType":"full"}'
    });
  }

  try {
    console.log('Setting up user data for:', userId);
    console.log('Setup type:', setupType);

    const results = [];

    // 1. プレミアムプラン設定
    console.log('=== PREMIUM PLAN SETUP ===');
    const planSetupResult = await setKVValue(`user_plan:${userId}`, 'premium', 86400 * 30);
    results.push({
      action: 'Set Premium Plan',
      key: `user_plan:${userId}`,
      success: planSetupResult
    });

    // 2. テスト用Twitterトークン設定
    console.log('=== TWITTER TOKEN SETUP ===');
    const twitterTokenData = {
      access_token: `test_token_twitter_${Date.now()}`,
      username: 'numaken_jp',
      created_at: new Date().toISOString(),
      test_mode: true
    };

    const twitterTokenResult = await setKVValue(
      `twitter_token:${userId}`,
      JSON.stringify(twitterTokenData),
      86400 * 30
    );
    results.push({
      action: 'Set Twitter Token',
      key: `twitter_token:${userId}`,
      success: twitterTokenResult,
      data: twitterTokenData
    });

    // 3. Twitterユーザー情報設定
    const twitterUserData = {
      username: 'numaken_jp',
      connectedAt: new Date().toISOString(),
      test_mode: true
    };

    const twitterUserResult = await setKVValue(
      `twitter_user:${userId}`,
      JSON.stringify(twitterUserData),
      86400 * 30
    );
    results.push({
      action: 'Set Twitter User Info',
      key: `twitter_user:${userId}`,
      success: twitterUserResult,
      data: twitterUserData
    });

    // 4. テスト用Threadsトークン設定
    console.log('=== THREADS TOKEN SETUP ===');
    const threadsTokenData = {
      access_token: `test_token_threads_${Date.now()}`,
      threads_user_id: '1234567890',
      username: 'numaken_threads',
      created_at: new Date().toISOString(),
      test_mode: true
    };

    const threadsTokenResult = await setKVValue(
      `threads_token:${userId}`,
      threadsTokenData.access_token,
      86400 * 30
    );
    results.push({
      action: 'Set Threads Token',
      key: `threads_token:${userId}`,
      success: threadsTokenResult,
      tokenPreview: threadsTokenData.access_token.substring(0, 20) + '...'
    });

    // 5. Threadsユーザー情報設定
    const threadsUserData = {
      threadsId: '1234567890',
      username: 'numaken_threads',
      connectedAt: new Date().toISOString(),
      test_mode: true
    };

    const threadsUserResult = await setKVValue(
      `threads_user:${userId}`,
      JSON.stringify(threadsUserData),
      86400 * 30
    );
    results.push({
      action: 'Set Threads User Info',
      key: `threads_user:${userId}`,
      success: threadsUserResult,
      data: threadsUserData
    });

    // 6. 設定確認
    console.log('=== VERIFICATION ===');
    const verification = await verifyUserSetup(userId);

    const response = {
      success: true,
      message: 'User data setup completed',
      userId,
      setupType,
      results,
      verification,
      timestamp: new Date().toISOString(),
      nextSteps: [
        '1. ページをリロードしてSNS接続状態を確認',
        '2. 投稿を生成してSNS投稿ボタンが表示されることを確認',
        '3. Twitter/Threads投稿をテスト実行',
        '4. システム状態確認: curl -X POST "https://sns-automation-pwa.vercel.app/api/debug/system-status" -H "Content-Type: application/json" -d \'{"userId":"' + userId + '"}\'|jq .userData'
      ]
    };

    console.log('✅ User setup completed successfully');
    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ User setup error:', error);
    return res.status(500).json({
      error: 'User setup failed',
      details: error.message,
      userId,
      timestamp: new Date().toISOString()
    });
  }
}

// KVストレージ設定ヘルパー
async function setKVValue(key, value, ttl = null) {
  try {
    console.log(`Setting KV value for key: ${key}`);

    const command = ttl
      ? ['SETEX', key, ttl, value.toString()]
      : ['SET', key, value.toString()];

    const response = await fetch(`${process.env.KV_REST_API_URL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });

    const result = await response.json();
    console.log(`KV SET response for ${key}:`, { status: response.status, result });

    return response.ok;
  } catch (error) {
    console.error(`KV SET error for ${key}:`, error);
    return false;
  }
}

// 設定確認ヘルパー
async function verifyUserSetup(userId) {
  try {
    const checks = [];

    // プラン確認
    const planResponse = await fetch(`${process.env.KV_REST_API_URL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['GET', `user_plan:${userId}`]),
    });
    const planResult = await planResponse.json();
    checks.push({
      check: 'Premium Plan',
      key: `user_plan:${userId}`,
      exists: !!planResult.result,
      value: planResult.result
    });

    // Twitterトークン確認
    const twitterResponse = await fetch(`${process.env.KV_REST_API_URL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['GET', `twitter_token:${userId}`]),
    });
    const twitterResult = await twitterResponse.json();
    checks.push({
      check: 'Twitter Token',
      key: `twitter_token:${userId}`,
      exists: !!twitterResult.result,
      preview: twitterResult.result ? twitterResult.result.substring(0, 20) + '...' : null
    });

    // Threadsトークン確認
    const threadsResponse = await fetch(`${process.env.KV_REST_API_URL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['GET', `threads_token:${userId}`]),
    });
    const threadsResult = await threadsResponse.json();
    checks.push({
      check: 'Threads Token',
      key: `threads_token:${userId}`,
      exists: !!threadsResult.result,
      preview: threadsResult.result ? threadsResult.result.substring(0, 20) + '...' : null
    });

    return {
      overall: checks.every(check => check.exists),
      details: checks
    };

  } catch (error) {
    console.error('Verification error:', error);
    return {
      overall: false,
      error: error.message
    };
  }
}