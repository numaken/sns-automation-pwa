import { TwitterPoster } from './lib/twitter-poster.js';

/**
 * Twitter投稿APIエンドポイント
 * Vercel Serverless Function
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
    // 環境変数チェック
    const requiredEnvVars = [
      'TWITTER_CONSUMER_KEY',
      'TWITTER_CONSUMER_SECRET',
      'TWITTER_ACCESS_TOKEN',
      'TWITTER_ACCESS_TOKEN_SECRET'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      return res.status(500).json({
        success: false,
        error: 'Configuration error',
        message: `Missing environment variables: ${missingVars.join(', ')}`,
        missing_vars: missingVars
      });
    }

    // リクエストボディの検証
    const { content, options = {}, userApiKey } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Bad request',
        message: 'Content is required'
      });
    }

    // Twitter認証情報設定
    let credentials;

    if (userApiKey && options.useUserApiKey) {
      // ユーザー独自のAPIキーを使用（プレミアムプラン）
      try {
        credentials = JSON.parse(userApiKey);

        const userRequiredKeys = ['consumerKey', 'consumerSecret', 'accessToken', 'accessTokenSecret'];
        const userMissingKeys = userRequiredKeys.filter(key => !credentials[key]);

        if (userMissingKeys.length > 0) {
          return res.status(400).json({
            success: false,
            error: 'Invalid user API key',
            message: `User API key missing: ${userMissingKeys.join(', ')}`
          });
        }
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: 'Invalid user API key format',
          message: 'User API key must be valid JSON'
        });
      }
    } else {
      // システムデフォルトのAPIキーを使用
      credentials = {
        consumerKey: process.env.TWITTER_CONSUMER_KEY,
        consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
        accessToken: process.env.TWITTER_ACCESS_TOKEN,
        accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET
      };
    }

    // TwitterPosterインスタンス作成
    const poster = new TwitterPoster(credentials);

    // 投稿内容の事前バリデーション
    const validation = poster.validateContent(content);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Content validation failed',
        message: validation.errors.join(', '),
        validation
      });
    }

    // 警告がある場合はレスポンスに含める
    const warnings = validation.warnings.length > 0 ? validation.warnings : undefined;

    // Twitter投稿実行（リトライ機能付き）
    const maxRetries = options.maxRetries || 3;
    const result = await poster.postWithRetry(content, options, maxRetries);

    // 成功レスポンス
    return res.status(200).json({
      ...result,
      validation: {
        length: validation.length,
        effectiveLength: validation.effectiveLength,
        urlCount: validation.urlCount
      },
      warnings,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Twitter投稿エラー:', error);

    // エラーレスポンス
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      platform: 'twitter',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * APIエンドポイントの使用例とレスポンス仕様
 * 
 * ### リクエスト例:
 * ```bash
 * curl -X POST https://sns-automation-pwa.vercel.app/api/post-to-twitter \
 * -H "Content-Type: application/json" \
 * -d '{
 *   "content": "AI SNS自動投稿システムのテスト投稿です！ #SNS #自動化 #AI",
 *   "options": {
 *     "maxRetries": 3
 *   }
 * }'
 * ```
 * 
 * ### 成功レスポンス:
 * ```json
 * {
 *   "success": true,
 *   "post_id": "1234567890123456789",
 *   "platform": "twitter",
 *   "url": "https://twitter.com/i/status/1234567890123456789",
 *   "message": "Twitter投稿が成功しました (API v2)",
 *   "api_version": "v2",
 *   "validation": {
 *     "length": 65,
 *     "effectiveLength": 65,
 *     "urlCount": 0
 *   },
 *   "timestamp": "2025-08-01T07:00:00.000Z"
 * }
 * ```
 * 
 * ### エラーレスポンス:
 * ```json
 * {
 *   "success": false,
 *   "error": "Content validation failed",
 *   "message": "文字数制限を超えています (285/280文字)",
 *   "platform": "twitter",
 *   "timestamp": "2025-08-01T07:00:00.000Z"
 * }
 * ```
 * 
 * ### プレミアムプラン（ユーザーAPIキー）使用例:
 * ```bash
 * curl -X POST https://sns-automation-pwa.vercel.app/api/post-to-twitter \
 * -H "Content-Type: application/json" \
 * -d '{
 *   "content": "プレミアムプランでの投稿テスト",
 *   "options": {
 *     "useUserApiKey": true
 *   },
 *   "userApiKey": "{\"consumerKey\":\"xxx\",\"consumerSecret\":\"xxx\",\"accessToken\":\"xxx\",\"accessTokenSecret\":\"xxx\"}"
 * }'
 * ```
 */