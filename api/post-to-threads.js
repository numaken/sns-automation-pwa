import { ThreadsPoster } from './lib/threads-poster.js';

/**
 * Threads投稿APIエンドポイント
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
      'THREADS_ACCESS_TOKEN',
      'THREADS_USER_ID'
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

    // Threads認証情報設定
    let credentials;
    
    if (userApiKey && options.useUserApiKey) {
      // ユーザー独自のAPIキーを使用（プレミアムプラン）
      try {
        credentials = JSON.parse(userApiKey);
        
        const userRequiredKeys = ['accessToken', 'userId'];
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
        accessToken: process.env.THREADS_ACCESS_TOKEN,
        userId: process.env.THREADS_USER_ID
      };
    }

    // ThreadsPosterインスタンス作成
    const poster = new ThreadsPoster(credentials);

    // 投稿内容の事前バリデーション
    const validation = poster.validateContent(content, options);
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

    // Threads投稿実行（リトライ機能付き）
    const maxRetries = options.maxRetries || 3;
    const result = await poster.postWithRetry(content, options, maxRetries);

    // 成功レスポンス
    return res.status(200).json({
      ...result,
      validation: {
        length: validation.length,
        hasMedia: validation.hasMedia
      },
      warnings,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Threads投稿エラー:', error);

    // エラーレスポンス
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      platform: 'threads',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * APIエンドポイントの使用例とレスポンス仕様
 * 
 * ### 基本投稿例:
 * ```bash
 * curl -X POST https://sns-automation-pwa.vercel.app/api/post-to-threads \
 * -H "Content-Type: application/json" \
 * -d '{
 *   "content": "AI SNS自動投稿システムのThreadsテスト投稿です！🚀 #Threads #自動化 #AI"
 * }'
 * ```
 * 
 * ### 画像付き投稿例:
 * ```bash
 * curl -X POST https://sns-automation-pwa.vercel.app/api/post-to-threads \
 * -H "Content-Type: application/json" \
 * -d '{
 *   "content": "画像付きのThreads投稿テストです！",
 *   "options": {
 *     "image_url": "https://example.com/image.jpg"
 *   }
 * }'
 * ```
 * 
 * ### リプライ投稿例:
 * ```bash
 * curl -X POST https://sns-automation-pwa.vercel.app/api/post-to-threads \
 * -H "Content-Type: application/json" \
 * -d '{
 *   "content": "元の投稿への返信です",
 *   "options": {
 *     "reply_to_id": "1234567890123456789"
 *   }
 * }'
 * ```
 * 
 * ### 成功レスポンス:
 * ```json
 * {
 *   "success": true,
 *   "post_id": "1234567890123456789",
 *   "platform": "threads",
 *   "url": "https://www.threads.net/@username/post/1234567890123456789",
 *   "message": "Threads投稿が成功しました",
 *   "container_id": "container_abc123",
 *   "validation": {
 *     "length": 65,
 *     "hasMedia": false
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
 *   "message": "文字数制限を超えています (520/500文字)",
 *   "platform": "threads",
 *   "timestamp": "2025-08-01T07:00:00.000Z"
 * }
 * ```
 * 
 * ### プレミアムプラン（ユーザーAPIキー）使用例:
 * ```bash
 * curl -X POST https://sns-automation-pwa.vercel.app/api/post-to-threads \
 * -H "Content-Type: application/json" \
 * -d '{
 *   "content": "プレミアムプランでのThreads投稿テスト",
 *   "options": {
 *     "useUserApiKey": true
 *   },
 *   "userApiKey": "{\"accessToken\":\"xxx\",\"userId\":\"123456789\"}"
 * }'
 * ```
 * 
 * ### カルーセル投稿例:
 * ```bash
 * curl -X POST https://sns-automation-pwa.vercel.app/api/post-to-threads \
 * -H "Content-Type: application/json" \
 * -d '{
 *   "content": "複数画像のカルーセル投稿です",
 *   "options": {
 *     "children": ["container_id_1", "container_id_2", "container_id_3"]
 *   }
 * }'
 * ```
 */