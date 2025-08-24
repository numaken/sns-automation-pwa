// Threads OAuth認証開始API（State-only修正版）
import crypto from 'crypto';

export default async function handler(req, res) {
  console.log('=== Threads OAuth Authorize START (FIXED) ===');
  console.log('Method:', req.method);
  console.log('Body:', req.body);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'ユーザーIDが必要です' });
    }

    console.log('Threads OAuth request for userId:', userId);

    // 環境変数チェック
    const requiredEnvVars = {
      THREADS_APP_ID: process.env.THREADS_APP_ID,
      THREADS_APP_SECRET: process.env.THREADS_APP_SECRET,
      KV_REST_API_URL: process.env.KV_REST_API_URL,
      KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN
    };

    console.log('Environment variables check:', {
      THREADS_APP_ID: !!requiredEnvVars.THREADS_APP_ID,
      THREADS_APP_SECRET: !!requiredEnvVars.THREADS_APP_SECRET,
      KV_REST_API_URL: !!requiredEnvVars.KV_REST_API_URL,
      KV_REST_API_TOKEN: !!requiredEnvVars.KV_REST_API_TOKEN
    });

    // 🔧 デバッグ: 実際のTHREADS_APP_IDの値を確認
    console.log('THREADS_APP_ID value debug:', {
      value: requiredEnvVars.THREADS_APP_ID,
      type: typeof requiredEnvVars.THREADS_APP_ID,
      length: requiredEnvVars.THREADS_APP_ID?.length,
      firstChars: requiredEnvVars.THREADS_APP_ID?.substring(0, 5)
    });

    const missingEnvVars = Object.entries(requiredEnvVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missingEnvVars.length > 0) {
      return res.status(500).json({
        error: 'Server configuration error',
        details: `Missing environment variables: ${missingEnvVars.join(', ')}`
      });
    }

    // PKCEパラメータの生成
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    // 🔧 修正: stateを独立して生成
    const state = crypto.randomBytes(16).toString('hex');

    console.log('PKCE data generated:', {
      state,
      codeVerifier: codeVerifier.substring(0, 10) + '...',
      codeChallenge: codeChallenge.substring(0, 10) + '...'
    });

    // 認証セッションデータ
    const authData = {
      userId,
      codeVerifier,
      codeChallenge,
      timestamp: Date.now()
    };

    // 🔧 修正: sessionKeyをstateのみに変更
    const sessionKey = `threads_oauth_pkce:${state}`;
    console.log('Saving PKCE data to KV (FIXED):', { key: sessionKey, userId });

    await setKVValue(sessionKey, JSON.stringify(authData), 1800); // 30分TTL

    // 保存確認
    console.log('Verifying PKCE data save...');
    const savedData = await getKVValue(sessionKey);
    const saveVerification = {
      found: savedData !== null,
      dataMatches: savedData ? JSON.stringify(JSON.parse(savedData)) === JSON.stringify(authData) : false
    };

    console.log('KV Save verification:', saveVerification);

    if (!saveVerification.found) {
      return res.status(500).json({
        error: 'PKCE data save verification failed',
        debug: 'Data not found immediately after save'
      });
    }

    // Threads OAuth認証URL
    const threadsClientId = process.env.THREADS_APP_ID;
    const redirectUri = `https://postpilot.panolabollc.com/api/auth/threads/callback`;

    const authParams = new URLSearchParams({
      client_id: threadsClientId,
      redirect_uri: redirectUri,
      scope: 'threads_basic,threads_content_publish',
      response_type: 'code',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state: state  // 🔧 修正: 独立したstateを使用
    });

    const authUrl = `https://threads.net/oauth/authorize?${authParams.toString()}`;

    // 🔧 デバッグ: OAuth URLとパラメータを詳しく確認
    console.log('OAuth URL generated (FIXED):', {
      state,
      clientId: process.env.THREADS_APP_ID?.substring(0, 10) + '...',
      redirectUri,
      kvKeyPattern: 'state-only'
    });

    console.log('OAuth URL debug:', {
      fullUrl: authUrl,
      authParams: Object.fromEntries(authParams.entries()),
      clientIdInParams: authParams.get('client_id'),
      clientIdExists: !!authParams.get('client_id')
    });

    console.log('=== Threads OAuth Authorize SUCCESS (FIXED) ===');

    return res.status(200).json({
      success: true,
      authUrl,
      state,
      sessionKey,
      message: 'Threads認証URLを生成しました',
      debug: {
        userId,
        sessionKey,
        fixApplied: 'State-only key pattern applied',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Threads OAuth authorize error:', error);
    return res.status(500).json({
      error: 'Threads認証の開始に失敗しました',
      details: error.message,
      debug: 'Internal server error during Threads OAuth authorize'
    });
  }
}

// KVストレージヘルパー関数
async function setKVValue(key, value, ttl = null) {
  try {
    const command = ttl
      ? ['SETEX', key, ttl, value.toString()]
      : ['SET', key, value.toString()];

    console.log(`KV SET command:`, command);

    const response = await fetch(`${process.env.KV_REST_API_URL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });

    const result = await response.json();
    console.log(`KV SET response:`, { status: response.status, result });

    if (!response.ok) {
      throw new Error(`KV set error: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error(`KV SET error:`, error);
    throw error;
  }
}

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
    console.log(`KV GET response for ${key}:`, { status: response.status, result });

    if (!response.ok) {
      return null;
    }

    return result.result;
  } catch (error) {
    console.error(`KV GET error for ${key}:`, error);
    return null;
  }
}