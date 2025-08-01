import { TwitterPoster } from './lib/twitter-poster.js';
import { ThreadsPoster } from './lib/threads-poster.js';

/**
 * 複数プラットフォーム同時投稿APIエンドポイント
 * Twitter & Threads 同時投稿機能
 */
export default async function handler(req, res) {
  // CORSヘッダー設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // プリフライトリクエスト対応
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POSTメソッドのみ許可
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: 'POST method required'
    });
  }

  try {
    // リクエストボディの検証
    const {
      content,
      platforms = ['twitter', 'threads'],
      options = {},
      userApiKey,
      platformSpecificContent = {}
    } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Bad request',
        message: 'Content is required'
      });
    }

    if (!Array.isArray(platforms) || platforms.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Bad request',
        message: 'At least one platform must be specified'
      });
    }

    // サポートされているプラットフォームチェック
    const supportedPlatforms = ['twitter', 'threads'];
    const unsupportedPlatforms = platforms.filter(p => !supportedPlatforms.includes(p));

    if (unsupportedPlatforms.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported platforms',
        message: `Unsupported platforms: ${unsupportedPlatforms.join(', ')}`,
        supported_platforms: supportedPlatforms
      });
    }

    const results = [];
    const errors = [];
    let successCount = 0;

    // Twitter投稿
    if (platforms.includes('twitter')) {
      try {
        // Twitter環境変数チェック
        const twitterEnvVars = [
          'TWITTER_CONSUMER_KEY',
          'TWITTER_CONSUMER_SECRET',
          'TWITTER_ACCESS_TOKEN',
          'TWITTER_ACCESS_TOKEN_SECRET'
        ];

        const missingTwitterVars = twitterEnvVars.filter(varName => !process.env[varName]);

        if (missingTwitterVars.length > 0) {
          throw new Error(`Missing Twitter environment variables: ${missingTwitterVars.join(', ')}`);
        }

        // Twitter認証情報設定
        let twitterCredentials;

        if (userApiKey && options.useUserApiKey && userApiKey.twitter) {
          twitterCredentials = JSON.parse(userApiKey.twitter);
        } else {
          twitterCredentials = {
            consumerKey: process.env.TWITTER_CONSUMER_KEY,
            consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
            accessToken: process.env.TWITTER_ACCESS_TOKEN,
            accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET
          };
        }

        const twitterPoster = new TwitterPoster(twitterCredentials);

        // プラットフォーム固有のコンテンツまたはデフォルトコンテンツ
        const twitterContent = platformSpecificContent.twitter || content;
        const twitterOptions = { ...options, ...options.twitter };

        const twitterResult = await twitterPoster.postWithRetry(
          twitterContent,
          twitterOptions,
          options.maxRetries || 3
        );

        results.push({
          platform: 'twitter',
          ...twitterResult
        });
        successCount++;

      } catch (error) {
        console.error('Twitter投稿エラー:', error);
        errors.push({
          platform: 'twitter',
          error: error.message,
          success: false
        });
      }
    }

    // Threads投稿
    if (platforms.includes('threads')) {
      try {
        // Threads環境変数チェック
        const threadsEnvVars = [
          'THREADS_ACCESS_TOKEN',
          'THREADS_USER_ID'
        ];

        const missingThreadsVars = threadsEnvVars.filter(varName => !process.env[varName]);

        if (missingThreadsVars.length > 0) {
          throw new Error(`Missing Threads environment variables: ${missingThreadsVars.join(', ')}`);
        }

        // Threads認証情報設定
        let threadsCredentials;

        if (userApiKey && options.useUserApiKey && userApiKey.threads) {
          threadsCredentials = JSON.parse(userApiKey.threads);
        } else {
          threadsCredentials = {
            accessToken: process.env.THREADS_ACCESS_TOKEN,
            userId: process.env.THREADS_USER_ID
          };
        }

        const threadsPoster = new ThreadsPoster(threadsCredentials);

        // プラットフォーム固有のコンテンツまたはデフォルトコンテンツ
        const threadsContent = platformSpecificContent.threads || content;
        const threadsOptions = { ...options, ...options.threads };

        const threadsResult = await threadsPoster.postWithRetry(
          threadsContent,
          threadsOptions,
          options.maxRetries || 3
        );

        results.push({
          platform: 'threads',
          ...threadsResult
        });
        successCount++;

      } catch (error) {
        console.error('Threads投稿エラー:', error);
        errors.push({
          platform: 'threads',
          error: error.message,
          success: false
        });
      }
    }

    // 結果の集計
    const totalPlatforms = platforms.length;
    const partialSuccess = successCount > 0 && errors.length > 0;
    const completeSuccess = successCount === totalPlatforms;
    const completeFailure = successCount === 0;

    // レスポンス構築
    const response = {
      success: completeSuccess,
      partial_success: partialSuccess,
      summary: {
        total_platforms: totalPlatforms,
        successful_posts: successCount,
        failed_posts: errors.length,
        success_rate: `${Math.round((successCount / totalPlatforms) * 100)}%`
      },
      results,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    };

    // ステータスコード決定
    let statusCode;
    if (completeSuccess) {
      statusCode = 200;
      response.message = '全プラットフォームへの投稿が成功しました';
    } else if (partialSuccess) {
      statusCode = 207; // Multi-Status
      response.message = '一部のプラットフォームへの投稿が成功しました';
    } else {
      statusCode = 500;
      response.message = '全プラットフォームへの投稿が失敗しました';
    }

    return res.status(statusCode).json(response);

  } catch (error) {
    console.error('複数プラットフォーム投稿エラー:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * APIエンドポイントの使用例とレスポンス仕様
 * 
 * ### 基本的な同時投稿例:
 * ```bash
 * curl -X POST https://sns-automation-pwa.vercel.app/api/post-to-multiple \
 * -H "Content-Type: application/json" \
 * -d '{
 *   "content": "AI SNS自動投稿システムで同時投稿テスト！🚀 #SNS #自動化 #AI",
 *   "platforms": ["twitter", "threads"]
 * }'
 * ```
 * 
 * ### プラットフォーム別コンテンツ指定例:
 * ```bash
 * curl -X POST https://sns-automation-pwa.vercel.app/api/post-to-multiple \
 * -H "Content-Type: application/json" \
 * -d '{
 *   "content": "デフォルトの投稿内容",
 *   "platforms": ["twitter", "threads"],
 *   "platformSpecificContent": {
 *     "twitter": "Twitter用の投稿内容 #Twitter",
 *     "threads": "Threads用の投稿内容 #Threads"
 *   }
 * }'
 * ```
 * 
 * ### プラットフォーム別オプション指定例:
 * ```bash
 * curl -X POST https://sns-automation-pwa.vercel.app/api/post-to-multiple \
 * -H "Content-Type: application/json" \
 * -d '{
 *   "content": "画像付き同時投稿テスト",
 *   "platforms": ["twitter", "threads"],
 *   "options": {
 *     "maxRetries": 3,
 *     "twitter": {
 *       "media_ids": ["123456789"]
 *     },
 *     "threads": {
 *       "image_url": "https://example.com/image.jpg"
 *     }
 *   }
 * }'
 * ```
 * 
 * ### 完全成功レスポンス (200):
 * ```json
 * {
 *   "success": true,
 *   "partial_success": false,
 *   "message": "全プラットフォームへの投稿が成功しました",
 *   "summary": {
 *     "total_platforms": 2,
 *     "successful_posts": 2,
 *     "failed_posts": 0,
 *     "success_rate": "100%"
 *   },
 *   "results": [
 *     {
 *       "platform": "twitter",
 *       "success": true,
 *       "post_id": "1234567890123456789",
 *       "url": "https://twitter.com/i/status/1234567890123456789",
 *       "message": "Twitter投稿が成功しました (API v2)"
 *     },
 *     {
 *       "platform": "threads",
 *       "success": true,
 *       "post_id": "9876543210987654321",
 *       "url": "https://www.threads.net/@username/post/9876543210987654321",
 *       "message": "Threads投稿が成功しました"
 *     }
 *   ],
 *   "timestamp": "2025-08-01T07:00:00.000Z"
 * }
 * ```
 * 
 * ### 部分成功レスポンス (207):
 * ```json
 * {
 *   "success": false,
 *   "partial_success": true,
 *   "message": "一部のプラットフォームへの投稿が成功しました",
 *   "summary": {
 *     "total_platforms": 2,
 *     "successful_posts": 1,
 *     "failed_posts": 1,
 *     "success_rate": "50%"
 *   },
 *   "results": [
 *     {
 *       "platform": "twitter",
 *       "success": true,
 *       "post_id": "1234567890123456789",
 *       "url": "https://twitter.com/i/status/1234567890123456789",
 *       "message": "Twitter投稿が成功しました (API v2)"
 *     }
 *   ],
 *   "errors": [
 *     {
 *       "platform": "threads",
 *       "error": "Container creation failed: Invalid access token",
 *       "success": false
 *     }
 *   ],
 *   "timestamp": "2025-08-01T07:00:00.000Z"
 * }
 * ```
 * 
 * ### プレミアムプラン（ユーザーAPIキー）使用例:
 * ```bash
 * curl -X POST https://sns-automation-pwa.vercel.app/api/post-to-multiple \
 * -H "Content-Type: application/json" \
 * -d '{
 *   "content": "プレミアムプランでの同時投稿テスト",
 *   "platforms": ["twitter", "threads"],
 *   "options": {
 *     "useUserApiKey": true
 *   },
 *   "userApiKey": {
 *     "twitter": "{\"consumerKey\":\"xxx\",\"consumerSecret\":\"xxx\",\"accessToken\":\"xxx\",\"accessTokenSecret\":\"xxx\"}",
 *     "threads": "{\"accessToken\":\"xxx\",\"userId\":\"123456789\"}"
 *   }
 * }'
 * ```
 */