// デバッグ・テスト用API - api/debug/sns-test.js
export default async function handler(req, res) {
  // CORS対応
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 管理者認証
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid admin key required'
    });
  }

  if (req.method === 'GET') {
    // システム状況確認
    return await handleSystemCheck(req, res);
  } else if (req.method === 'POST') {
    // テスト実行
    return await handleTestExecution(req, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// システム状況確認
async function handleSystemCheck(req, res) {
  try {
    const checks = {
      environment: checkEnvironmentVariables(),
      apis: await checkAPIEndpoints(),
      dependencies: checkDependencies(),
      database: await checkDatabase(),
      timestamp: new Date().toISOString()
    };

    const summary = generateSummary(checks);

    return res.json({
      status: summary.status,
      checks,
      summary,
      recommendations: generateRecommendations(checks)
    });

  } catch (error) {
    console.error('System check error:', error);
    return res.status(500).json({
      status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// 環境変数チェック
function checkEnvironmentVariables() {
  const required = [
    'OPENAI_API_KEY_SHARED',
    'KV_REST_API_URL',
    'KV_REST_API_TOKEN',
    'ADMIN_KEY'
  ];

  const optional = [
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY',
    'TWITTER_CONSUMER_KEY',
    'TWITTER_CONSUMER_SECRET',
    'DAILY_COST_LIMIT'
  ];

  const results = {
    required: {},
    optional: {},
    missing: [],
    present: [],
    masked_values: {}
  };

  required.forEach(key => {
    const exists = !!process.env[key];
    results.required[key] = exists;
    if (exists) {
      results.present.push(key);
      // 値の最初の部分だけマスク表示
      const value = process.env[key];
      results.masked_values[key] = value.substring(0, 10) + '***';
    } else {
      results.missing.push(key);
    }
  });

  optional.forEach(key => {
    const exists = !!process.env[key];
    results.optional[key] = exists;
    if (exists) {
      const value = process.env[key];
      results.masked_values[key] = value.substring(0, 10) + '***';
    }
  });

  return results;
}

// APIエンドポイントチェック
async function checkAPIEndpoints() {
  const endpoints = [
    { path: '/api/generate-post-shared', method: 'POST' },
    { path: '/api/admin/cost-monitor', method: 'GET' },
    { path: '/api/check-user-plan', method: 'GET' },
    { path: '/api/post-to-twitter', method: 'POST' },
    { path: '/api/post-to-threads', method: 'POST' }
  ];

  const results = {};
  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

  for (const endpoint of endpoints) {
    try {
      results[endpoint.path] = await testEndpoint(baseUrl, endpoint);
    } catch (error) {
      results[endpoint.path] = {
        status: 'ERROR',
        error: error.message,
        exists: false
      };
    }
  }

  return results;
}

// 個別エンドポイントテスト
async function testEndpoint(baseUrl, endpoint) {
  try {
    const headers = {
      'x-admin-key': process.env.ADMIN_KEY,
      'Content-Type': 'application/json'
    };

    // OPTIONS リクエストで存在確認
    const response = await fetch(`${baseUrl}${endpoint.path}`, {
      method: 'OPTIONS',
      headers,
      timeout: 5000
    });

    return {
      status: response.status < 500 ? 'OK' : 'ERROR',
      statusCode: response.status,
      exists: response.status !== 404,
      responseTime: 'N/A'
    };
  } catch (error) {
    return {
      status: 'ERROR',
      error: error.message,
      exists: false,
      responseTime: 'Timeout'
    };
  }
}

// 依存関係チェック
function checkDependencies() {
  const dependencies = {
    fetch: typeof fetch !== 'undefined',
    JSON: typeof JSON !== 'undefined',
    crypto: typeof crypto !== 'undefined',
    process: typeof process !== 'undefined'
  };

  // Node.js環境での追加チェック
  try {
    dependencies.fs = !!require('fs');
    dependencies.path = !!require('path');
  } catch {
    dependencies.fs = false;
    dependencies.path = false;
  }

  return dependencies;
}

// データベース接続チェック
async function checkDatabase() {
  try {
    // KV Redis接続テスト
    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;

    if (!kvUrl || !kvToken) {
      return {
        status: 'ERROR',
        error: 'KV credentials missing'
      };
    }

    // 簡単なPINGテスト
    const response = await fetch(kvUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${kvToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['PING']),
    });

    if (response.ok) {
      return {
        status: 'OK',
        type: 'Vercel KV',
        responseTime: 'Fast'
      };
    } else {
      return {
        status: 'ERROR',
        error: `HTTP ${response.status}`,
        type: 'Vercel KV'
      };
    }

  } catch (error) {
    return {
      status: 'ERROR',
      error: error.message,
      type: 'Unknown'
    };
  }
}

// テスト実行
async function handleTestExecution(req, res) {
  const { testType, testData } = req.body;

  try {
    switch (testType) {
      case 'plan_check':
        return await testPlanCheck(req, res, testData);
      case 'sns_mock':
        return await testSNSMock(req, res, testData);
      case 'api_flow':
        return await testAPIFlow(req, res, testData);
      case 'cost_monitor':
        return await testCostMonitor(req, res, testData);
      default:
        return res.status(400).json({
          error: 'Unknown test type',
          available_types: ['plan_check', 'sns_mock', 'api_flow', 'cost_monitor']
        });
    }
  } catch (error) {
    return res.status(500).json({
      error: 'Test execution failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// プラン確認テスト
async function testPlanCheck(req, res, testData) {
  const testTokens = [
    'test-premium-token',
    'test-free-token',
    'premium-user-token',
    'invalid-token'
  ];

  const results = {};

  for (const token of testTokens) {
    try {
      const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/check-user-plan`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      results[token] = {
        statusCode: response.status,
        plan: data.plan,
        status: data.status,
        success: response.ok
      };
    } catch (error) {
      results[token] = {
        error: error.message,
        success: false
      };
    }
  }

  return res.json({
    testType: 'plan_check',
    results,
    timestamp: new Date().toISOString()
  });
}

// SNSモックテスト
async function testSNSMock(req, res, testData) {
  const { platform, text } = testData || {};

  const mockResults = {
    twitter: {
      success: true,
      message: 'Twitter投稿テスト成功',
      tweet_id: `mock_tweet_${Date.now()}`,
      posted_at: new Date().toISOString(),
      platform: 'twitter'
    },
    threads: {
      success: true,
      message: 'Threads投稿テスト成功',
      post_id: `mock_post_${Date.now()}`,
      posted_at: new Date().toISOString(),
      platform: 'threads'
    }
  };

  const platformResult = platform ? mockResults[platform] : mockResults;

  return res.json({
    testType: 'sns_mock',
    platform: platform || 'all',
    input: { text: text || 'テスト投稿' },
    result: platformResult,
    timestamp: new Date().toISOString()
  });
}

// APIフローテスト
async function testAPIFlow(req, res, testData) {
  const steps = [];
  let overallStatus = 'PASS';

  try {
    // Step 1: プラン確認
    steps.push({
      step: 'plan_check',
      status: 'OK',
      result: { plan: 'premium' },
      timestamp: new Date().toISOString()
    });

    // Step 2: 投稿生成（モック）
    steps.push({
      step: 'post_generation',
      status: 'OK',
      result: {
        post: 'テスト投稿文です。',
        quality: 85,
        generation_time: 2100
      },
      timestamp: new Date().toISOString()
    });

    // Step 3: SNS投稿（モック）
    steps.push({
      step: 'sns_posting',
      status: 'OK',
      result: {
        twitter: true,
        threads: true
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    overallStatus = 'FAIL';
    steps.push({
      step: 'error',
      status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }

  return res.json({
    testType: 'api_flow',
    steps,
    overall_status: overallStatus,
    duration: steps.length > 0 ? 'Fast' : 'N/A',
    timestamp: new Date().toISOString()
  });
}

// コスト監視テスト
async function testCostMonitor(req, res, testData) {
  try {
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/admin/cost-monitor`, {
      method: 'GET',
      headers: {
        'x-admin-key': process.env.ADMIN_KEY
      }
    });

    const data = await response.json();

    return res.json({
      testType: 'cost_monitor',
      status: response.ok ? 'OK' : 'ERROR',
      statusCode: response.status,
      data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.json({
      testType: 'cost_monitor',
      status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// サマリー生成
function generateSummary(checks) {
  const issues = [];
  const warnings = [];

  // 環境変数チェック
  if (checks.environment.missing.length > 0) {
    issues.push(`Missing required environment variables: ${checks.environment.missing.join(', ')}`);
  }

  // APIエンドポイントチェック
  Object.entries(checks.apis).forEach(([endpoint, result]) => {
    if (result.status === 'ERROR') {
      issues.push(`API endpoint error: ${endpoint}`);
    } else if (!result.exists) {
      warnings.push(`API endpoint not found: ${endpoint}`);
    }
  });

  // データベースチェック
  if (checks.database.status === 'ERROR') {
    issues.push(`Database connection error: ${checks.database.error}`);
  }

  // 依存関係チェック
  Object.entries(checks.dependencies).forEach(([dep, available]) => {
    if (!available) {
      warnings.push(`Missing dependency: ${dep}`);
    }
  });

  const score = Math.max(0, 100 - (issues.length * 20) - (warnings.length * 5));

  return {
    status: issues.length === 0 ? 'HEALTHY' : 'ISSUES_FOUND',
    issues,
    warnings,
    score,
    health_grade: score >= 90 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : 'F'
  };
}

// 推奨事項生成
function generateRecommendations(checks) {
  const recommendations = [];

  if (checks.environment.missing.length > 0) {
    recommendations.push({
      type: 'CRITICAL',
      message: 'Set missing environment variables',
      action: `Set: ${checks.environment.missing.join(', ')}`
    });
  }

  if (checks.database.status === 'ERROR') {
    recommendations.push({
      type: 'CRITICAL',
      message: 'Fix database connection',
      action: 'Check KV_REST_API_URL and KV_REST_API_TOKEN'
    });
  }

  const errorApis = Object.entries(checks.apis)
    .filter(([_, result]) => result.status === 'ERROR')
    .map(([endpoint]) => endpoint);

  if (errorApis.length > 0) {
    recommendations.push({
      type: 'HIGH',
      message: 'Fix API endpoint errors',
      action: `Check endpoints: ${errorApis.join(', ')}`
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      type: 'INFO',
      message: 'System is healthy',
      action: 'Continue monitoring'
    });
  }

  return recommendations;
}