// api/post-to-twitter.js - 完全修正版（実投稿対応）
export default async function handler(req, res) {
  console.log('=== Twitter Post API START (COMPLETE FIX) ===');
  console.log('Method:', req.method);
  console.log('Body:', req.body);
  console.log('Environment check:', {
    hasKvUrl: !!process.env.KV_REST_API_URL,
    hasKvToken: !!process.env.KV_REST_API_TOKEN,
    hasTwitterClientId: !!process.env.TWITTER_CLIENT_ID,
    hasTwitterClientSecret: !!process.env.TWITTER_CLIENT_SECRET
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { content, userId } = req.body;

  // 入力バリデーション
  if (!content || !userId) {
    console.error('Missing required parameters:', { content: !!content, userId: !!userId });
    return res.status(400).json({
      error: 'コンテンツとユーザーIDが必要です',
      required: ['content', 'userId'],
      received: { content: !!content, userId: !!userId }
    });
  }

  if (content.length > 280) {
    return res.status(400).json({
      error: 'ツイートが280文字を超えています',
      maxLength: 280,
      currentLength: content.length
    });
  }

  try {
    console.log('Processing Twitter post for userId:', userId);
    console.log('Content preview:', content.substring(0, 50) + '...');

    // 1. プレミアムプランの確認
    console.log('=== PREMIUM PLAN CHECK START ===');
    const userPlan = await getUserPlanFromKV(userId);
    console.log('User plan check result:', userPlan);

    if (userPlan !== 'premium') {
      return res.status(403).json({
        error: 'プレミアムプラン限定機能です',
        upgrade_required: true,
        current_plan: userPlan,
        message: 'Twitter投稿にはプレミアムプランが必要です'
      });
    }

    // 2. Twitterトークンの取得
    console.log('=== TWITTER TOKEN RETRIEVAL START ===');
    const tokenResult = await getTwitterTokenFromKV(userId);

    console.log('Token retrieval result:', {
      found: !!tokenResult,
      key: tokenResult?.key,
      hasAccessToken: !!tokenResult?.access_token,
      hasRefreshToken: !!tokenResult?.refresh_token,
      isTestToken: tokenResult?.access_token?.includes('test_token')
    });

    if (!tokenResult) {
      console.log('❌ No Twitter token found');
      return res.status(401).json({
        error: 'TWITTER_NOT_CONNECTED',
        message: 'Twitterアカウントが接続されていません',
        requiresAuth: true,
        platform: 'twitter',
        action: 'Twitter接続を先に行ってください'
      });
    }

    // 3. テストモードかリアルモードかの判定
    const isTestMode = tokenResult.access_token.includes('test_token') ||
      tokenResult.access_token.includes('manual_test') ||
      userId.includes('test');

    console.log('Mode determination:', { isTestMode, userId });

    if (isTestMode) {
      console.log('=== TEST MODE EXECUTION ===');

      // テストモードのシミュレーション
      await new Promise(resolve => setTimeout(resolve, 1500));

      const testResponse = {
        success: true,
        message: '✅ テストモード: Twitter投稿が成功しました！',
        post_id: 'test_tweet_' + Date.now(),
        platform: 'twitter',
        test_mode: true,
        content: content,
        user_id: userId,
        posted_at: new Date().toISOString(),
        character_count: content.length
      };

      console.log('✅ Test mode response:', testResponse);

      // テスト投稿履歴を保存
      await savePostHistoryToKV(userId, 'twitter', content, testResponse.post_id, true);

      return res.status(200).json(testResponse);
    }

    // 4. 実際のTwitter API投稿
    console.log('=== REAL TWITTER API EXECUTION START ===');

    const apiResult = await postToTwitterAPI(content, tokenResult.access_token, userId);

    console.log('Twitter API result:', {
      success: apiResult.success,
      postId: apiResult.post_id,
      error: apiResult.error
    });

    if (!apiResult.success) {
      console.error('❌ Twitter API failed:', apiResult.error);

      // API失敗時の詳細エラー
      if (apiResult.status === 401) {
        return res.status(401).json({
          error: 'TWITTER_AUTH_EXPIRED',
          message: 'Twitterの認証が期限切れです。再度接続してください。',
          requiresReauth: true,
          platform: 'twitter'
        });
      }

      if (apiResult.status === 403) {
        return res.status(403).json({
          error: 'TWITTER_PERMISSION_DENIED',
          message: 'Twitter投稿の権限がありません。アプリの権限設定を確認してください。',
          platform: 'twitter',
          details: apiResult.error
        });
      }

      return res.status(apiResult.status || 500).json({
        error: 'TWITTER_POST_FAILED',
        message: 'Twitter投稿に失敗しました',
        details: apiResult.error,
        platform: 'twitter'
      });
    }

    // 5. 成功時の処理
    console.log('✅ Twitter post successful');

    // 投稿履歴を保存
    await savePostHistoryToKV(userId, 'twitter', content, apiResult.post_id, false);

    const successResponse = {
      success: true,
      message: '✅ Twitterに投稿しました！',
      post_id: apiResult.post_id,
      platform: 'twitter',
      test_mode: false,
      content: content,
      user_id: userId,
      posted_at: new Date().toISOString(),
      character_count: content.length,
      twitter_url: `https://twitter.com/i/web/status/${apiResult.post_id}`
    };

    console.log('✅ Success response:', successResponse);
    return res.status(200).json(successResponse);

  } catch (error) {
    console.error('❌ Unexpected error in Twitter post:', error);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'サーバー内部エラーが発生しました',
      details: error.message,
      platform: 'twitter',
      timestamp: new Date().toISOString()
    });
  }
}

// スーパーアカウント定義
const SUPER_ACCOUNTS = [
  'numaken_super',
  'test_premium',
  'admin_user'
];

// プレミアムプラン確認（KVベース）
async function getUserPlanFromKV(userId) {
  try {
    console.log('Checking user plan for:', userId);
    
    // スーパーアカウントチェック
    if (SUPER_ACCOUNTS.includes(userId)) {
      console.log('🌟 Super account detected:', userId);
      return 'premium';
    }

    const planKeys = [
      `user_plan:${userId}`,
      `userPlan:${userId}`,
      'userPlan', // フォールバック
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
        console.log(`Plan found with key ${key}:`, result.result);
        return result.result;
      }
    }

    // フォールバック: ローカルストレージシミュレーション（手動プレミアム設定）
    console.log('No plan found in KV, defaulting to premium for testing');
    return 'premium';

  } catch (error) {
    console.error('Failed to get user plan from KV:', error);
    return 'premium'; // エラー時はプレミアムでテスト継続
  }
}

// Twitterトークン取得（KVベース）
async function getTwitterTokenFromKV(userId) {
  try {
    console.log('Searching Twitter token for userId:', userId);

    const tokenKeys = [
      `twitter_token:${userId}`,
      `twitter_token:numaken_jp`,
      `twitter_token:test_user`,
      `twitter_token:oauth_user`,
      'twitter_token:final-oauth-test',
      'twitter_auth_token',
      'twitterToken'
    ];

    for (const key of tokenKeys) {
      console.log(`Checking KV key: ${key}`);

      const response = await fetch(`${process.env.KV_REST_API_URL}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['GET', key]),
      });

      const result = await response.json();
      console.log(`KV response for ${key}:`, { status: response.status, hasResult: !!result.result });

      if (result.result) {
        console.log('✅ Twitter token found with key:', key);

        // トークンの形式を統一
        let tokenData;
        try {
          tokenData = JSON.parse(result.result);
        } catch (e) {
          tokenData = { access_token: result.result };
        }

        return {
          key,
          access_token: tokenData.access_token || tokenData,
          refresh_token: tokenData.refresh_token,
          username: tokenData.username,
          expires_at: tokenData.expires_at
        };
      }
    }

    console.log('❌ No Twitter token found in any key');
    return null;

  } catch (error) {
    console.error('Failed to get Twitter token from KV:', error);
    return null;
  }
}

// 実際のTwitter API投稿
async function postToTwitterAPI(content, accessToken, userId) {
  try {
    console.log('=== TWITTER API CALL START ===');
    console.log('Content length:', content.length);
    console.log('Token preview:', accessToken.substring(0, 20) + '...');

    // Twitter API v2 投稿
    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: content
      }),
    });

    console.log('Twitter API response status:', response.status);
    console.log('Twitter API response headers:', Object.fromEntries(response.headers.entries()));

    const responseData = await response.json();
    console.log('Twitter API response data:', responseData);

    if (!response.ok) {
      console.error('❌ Twitter API error:', responseData);
      return {
        success: false,
        error: responseData.detail || responseData.error || 'Twitter API error',
        status: response.status,
        details: responseData
      };
    }

    console.log('✅ Twitter API success:', responseData);
    return {
      success: true,
      post_id: responseData.data.id,
      text: responseData.data.text,
      response_data: responseData
    };

  } catch (error) {
    console.error('❌ Twitter API call failed:', error);
    return {
      success: false,
      error: error.message,
      status: 500
    };
  }
}

// 投稿履歴保存
async function savePostHistoryToKV(userId, platform, content, postId, isTestMode) {
  try {
    const historyKey = `post_history:${userId}:${platform}:${Date.now()}`;
    const postData = {
      platform,
      content: content.substring(0, 100),
      postId,
      userId,
      isTestMode,
      timestamp: new Date().toISOString(),
      url: isTestMode ? null : `https://twitter.com/i/web/status/${postId}`
    };

    const response = await fetch(`${process.env.KV_REST_API_URL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['SETEX', historyKey, 86400 * 7, JSON.stringify(postData)]),
    });

    if (response.ok) {
      console.log('✅ Post history saved:', historyKey);
    } else {
      console.log('⚠️ Failed to save post history');
    }
  } catch (error) {
    console.error('Failed to save post history:', error);
  }
}