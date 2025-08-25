// Twitter OAuth 2.0 with PKCE - 認証開始（TTL延長・保存確認強化版）
import crypto from 'crypto';

// PKCE用のコードベリファイアとチャレンジを生成
function generateCodeChallenge() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  return { codeVerifier, codeChallenge };
}

// KVにデータを保存
async function setKVValue(key, value, ttlSeconds = null) {
  try {
    const command = ttlSeconds 
      ? ['SETEX', key, ttlSeconds, value]
      : ['SET', key, value];
    
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
    
    return response.ok;
  } catch (error) {
    console.error(`KV SET error:`, error);
    return false;
  }
}

// KVからデータを取得
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
    console.error(`KV GET error:`, error);
    return null;
  }
}

export default async function handler(req, res) {
  console.log('=== Twitter OAuth Authorize START ===');
  console.log('Method:', req.method);
  console.log('Body:', req.body);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  
  console.log('OAuth request for userId:', userId);
  
  try {
    // 環境変数チェック
    const requiredEnvVars = {
      TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID,
      KV_REST_API_URL: process.env.KV_REST_API_URL,
      KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN
    };
    
    console.log('Environment variables check:', {
      TWITTER_CLIENT_ID: !!requiredEnvVars.TWITTER_CLIENT_ID,
      KV_REST_API_URL: !!requiredEnvVars.KV_REST_API_URL,
      KV_REST_API_TOKEN: !!requiredEnvVars.KV_REST_API_TOKEN
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
    
    // KV接続テスト
    console.log('Testing KV connection...');
    const testKey = 'connection_test_' + Date.now();
    const testValue = 'test_data';
    const kvTestSave = await setKVValue(testKey, testValue, 60);
    const kvTestRead = await getKVValue(testKey);
    const kvConnectionWorking = kvTestSave && kvTestRead === testValue;
    
    console.log('KV connection test result:', {
      save: kvTestSave,
      read: kvTestRead === testValue,
      working: kvConnectionWorking
    });
    
    if (!kvConnectionWorking) {
      return res.status(500).json({
        error: 'KV storage connection failed',
        debug: 'Cannot connect to KV storage'
      });
    }
    
    // PKCEコードの生成
    const { codeVerifier, codeChallenge } = generateCodeChallenge();
    const state = crypto.randomBytes(16).toString('hex');
    
    console.log('PKCE data generated:', {
      state,
      codeVerifier: codeVerifier.substring(0, 10) + '...',
      codeChallenge: codeChallenge.substring(0, 10) + '...'
    });
    
    // PKCEデータの準備
    const pkceData = {
      codeVerifier,
      userId,
      redirectUri: 'https://postpilot.panolabollc.com/api/auth/twitter/callback',
      timestamp: Date.now()
    };
    
    // KVにPKCEデータを保存（TTL延長: 30分）
    const kvKey = `twitter_oauth_pkce:${userId}:${state}`;
    console.log('Saving PKCE data to KV:', { key: kvKey });
    
    const pkceStored = await setKVValue(kvKey, JSON.stringify(pkceData), 30 * 60); // 30分に延長
    
    console.log('PKCE data saved:', { success: pkceStored });
    
    if (!pkceStored) {
      return res.status(500).json({
        error: 'Failed to save PKCE data',
        debug: 'KV storage save failed'
      });
    }
    
    // 保存確認（即座に読み取りテスト）
    console.log('Verifying PKCE data save...');
    const savedData = await getKVValue(kvKey);
    const saveVerification = {
      found: savedData !== null,
      dataMatches: savedData ? JSON.stringify(JSON.parse(savedData)) === JSON.stringify(pkceData) : false
    };
    
    console.log('KV Save verification:', saveVerification);
    
    if (!saveVerification.found) {
      return res.status(500).json({
        error: 'PKCE data save verification failed',
        debug: 'Data not found immediately after save'
      });
    }
    
    // OAuth認証URLの生成
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.TWITTER_CLIENT_ID,
      redirect_uri: 'https://postpilot.panolabollc.com/api/auth/twitter/callback',
      scope: 'tweet.read tweet.write users.read offline.access',
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    
    const authUrl = `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
    
    console.log('OAuth URL generated:', {
      state,
      clientId: process.env.TWITTER_CLIENT_ID?.substring(0, 10) + '...',
      redirectUri: 'https://postpilot.panolabollc.com/api/auth/twitter/callback'
    });
    
    console.log('=== Twitter OAuth Authorize SUCCESS ===');
    
    return res.json({
      success: true,
      authUrl: authUrl,
      state: state,
      message: 'Twitter認証を開始してください',
      debug: {
        userId: userId,
        kvKey: kvKey,
        kvSaved: pkceStored,
        kvVerified: saveVerification.found,
        ttl: '30分', // TTL情報追加
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Twitter OAuth authorize error:', error);
    return res.status(500).json({
      error: 'サーバーエラーが発生しました',
      message: error.message,
      debug: 'Internal server error during OAuth authorize'
    });
  }
}
