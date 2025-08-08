// Twitter OAuth 2.0 with PKCE - 認証開始（デバッグ強化版）
import crypto from 'crypto';

// PKCE用のコードベリファイアとチャレンジを生成
function generateCodeChallenge() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  return { codeVerifier, codeChallenge };
}

// KVにデータを保存（デバッグ強化版）
async function setKVValue(key, value, ttl = 3600) {
  try {
    console.log('KV Save attempt:', { key, valueLength: value.length, ttl });

    const response = await fetch(`${process.env.KV_REST_API_URL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['SETEX', key, ttl, value]),
    });

    const responseData = await response.json();
    console.log('KV Save response:', {
      ok: response.ok,
      status: response.status,
      data: responseData
    });

    if (response.ok) {
      // 保存確認のため即座に読み取りテスト
      const verifyResponse = await fetch(`${process.env.KV_REST_API_URL}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['GET', key]),
      });

      const verifyData = await verifyResponse.json();
      console.log('KV Save verification:', {
        found: !!verifyData.result,
        key,
        dataMatches: verifyData.result === value
      });

      return response.ok && !!verifyData.result;
    }

    return false;
  } catch (error) {
    console.error('KV Save error:', error);
    return false;
  }
}

// KV接続テスト
async function testKVConnection() {
  try {
    const testKey = `test_connection_${Date.now()}`;
    const testValue = 'test_data';

    console.log('Testing KV connection...');

    // テストデータ保存
    const saveResult = await setKVValue(testKey, testValue, 60);

    // テストデータ削除
    if (saveResult) {
      await fetch(`${process.env.KV_REST_API_URL}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['DEL', testKey]),
      });
    }

    console.log('KV connection test result:', saveResult);
    return saveResult;
  } catch (error) {
    console.error('KV connection test failed:', error);
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    console.log('Starting Twitter OAuth for user:', userId);

    // KV接続テスト
    const kvConnected = await testKVConnection();
    if (!kvConnected) {
      console.error('KV connection failed');
      return res.status(500).json({
        error: 'Database connection failed',
        debug: 'KV store not accessible'
      });
    }

    // Twitter Client ID確認
    const clientId = process.env.TWITTER_CLIENT_ID;
    if (!clientId) {
      console.error('Twitter Client ID not configured');
      return res.status(500).json({
        error: 'Twitter Client ID not configured',
        code: 'MISSING_CLIENT_ID'
      });
    }

    // redirect_uri設定
    const redirectUri = `https://${req.headers.host}/api/auth/twitter/callback`;
    console.log('Using redirect_uri:', redirectUri);

    // PKCE生成
    const { codeVerifier, codeChallenge } = generateCodeChallenge();
    console.log('Generated PKCE:', {
      verifierLength: codeVerifier.length,
      challengeLength: codeChallenge.length
    });

    // state生成（CSRF対策）
    const state = crypto.randomBytes(16).toString('hex');
    console.log('Generated state:', state);

    // OAuth認証URLパラメータ
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'tweet.read tweet.write users.read offline.access',
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    // 認証URL構築
    const authUrl = `https://twitter.com/i/oauth2/authorize?${params.toString()}`;

    // PKCE情報をKVに保存
    const pkceKey = `twitter_oauth_pkce:${userId}:${state}`;
    const pkceData = JSON.stringify({
      codeVerifier,
      userId,
      redirectUri,
      timestamp: Date.now()
    });

    console.log('Saving PKCE data:', { key: pkceKey, dataLength: pkceData.length });

    const saveSuccess = await setKVValue(pkceKey, pkceData, 3600); // 1時間有効

    if (!saveSuccess) {
      console.error('Failed to save PKCE data to KV');
      return res.status(500).json({
        error: 'Failed to save authentication data',
        debug: 'PKCE data save failed'
      });
    }

    console.log('PKCE data saved successfully');

    return res.status(200).json({
      success: true,
      authUrl,
      state,
      message: 'Twitter認証を開始してください',
      debug: {
        userId,
        kvKey: pkceKey,
        kvSaved: saveSuccess
      }
    });

  } catch (error) {
    console.error('Twitter OAuth authorize error:', error);
    return res.status(500).json({
      error: 'OAuth認証の開始に失敗しました',
      code: 'OAUTH_START_ERROR',
      debug: error.message
    });
  }
}