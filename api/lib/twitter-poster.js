import crypto from 'crypto';

/**
 * Twitter投稿クラス - OAuth 1.0a完全実装
 * Twitter API v2/v1.1フォールバック対応
 */
export class TwitterPoster {
  constructor(credentials) {
    this.consumerKey = credentials.consumerKey;
    this.consumerSecret = credentials.consumerSecret;
    this.accessToken = credentials.accessToken;
    this.accessTokenSecret = credentials.accessTokenSecret;
    this.apiBaseUrl = 'https://api.twitter.com';
  }

  /**
   * メイン投稿メソッド
   * @param {string} content - 投稿内容
   * @param {Object} options - オプション設定
   * @returns {Promise<Object>} 投稿結果
   */
  async post(content, options = {}) {
    try {
      // まずTwitter API v2で試行
      const v2Result = await this.postV2(content, options);
      if (v2Result.success) {
        return v2Result;
      }
    } catch (error) {
      console.log('Twitter API v2失敗、v1.1にフォールバック:', error.message);
    }

    // v2が失敗したらv1.1にフォールバック
    try {
      return await this.postV1(content, options);
    } catch (error) {
      throw new Error(`Twitter投稿失敗: ${error.message}`);
    }
  }

  /**
   * Twitter API v2での投稿
   */
  async postV2(content, options = {}) {
    const url = `${this.apiBaseUrl}/2/tweets`;
    const method = 'POST';
    
    const tweetData = {
      text: content.substring(0, 280) // Twitter文字数制限
    };

    // メディア添付がある場合
    if (options.media_ids) {
      tweetData.media = {
        media_ids: Array.isArray(options.media_ids) ? options.media_ids : [options.media_ids]
      };
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': this.generateOAuthHeader(method, url, {})
    };

    const response = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(tweetData)
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(`Twitter API v2 Error: ${responseData.detail || responseData.error || 'Unknown error'}`);
    }

    return {
      success: true,
      post_id: responseData.data.id,
      platform: 'twitter',
      url: `https://twitter.com/i/status/${responseData.data.id}`,
      message: 'Twitter投稿が成功しました (API v2)',
      api_version: 'v2',
      response: responseData
    };
  }

  /**
   * Twitter API v1.1での投稿（フォールバック）
   */
  async postV1(content, options = {}) {
    const url = `${this.apiBaseUrl}/1.1/statuses/update.json`;
    const method = 'POST';
    
    const params = {
      status: content.substring(0, 280)
    };

    // メディア添付がある場合
    if (options.media_ids) {
      params.media_ids = Array.isArray(options.media_ids) 
        ? options.media_ids.join(',') 
        : options.media_ids;
    }

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': this.generateOAuthHeader(method, url, params)
    };

    const body = new URLSearchParams(params).toString();

    const response = await fetch(url, {
      method,
      headers,
      body
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(`Twitter API v1.1 Error: ${responseData.error || 'Unknown error'}`);
    }

    return {
      success: true,
      post_id: responseData.id_str,
      platform: 'twitter',
      url: `https://twitter.com/i/status/${responseData.id_str}`,
      message: 'Twitter投稿が成功しました (API v1.1)',
      api_version: 'v1.1',
      response: responseData
    };
  }

  /**
   * OAuth 1.0a署名ヘッダー生成
   * @param {string} method - HTTPメソッド
   * @param {string} url - APIエンドポイントURL
   * @param {Object} params - リクエストパラメータ
   * @returns {string} Authorization ヘッダー
   */
  generateOAuthHeader(method, url, params = {}) {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomBytes(32).toString('hex');

    const oauthParams = {
      oauth_consumer_key: this.consumerKey,
      oauth_token: this.accessToken,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      oauth_nonce: nonce,
      oauth_version: '1.0'
    };

    // パラメータを結合してソート
    const allParams = { ...params, ...oauthParams };
    const sortedParams = Object.keys(allParams)
      .sort()
      .map(key => `${this.percentEncode(key)}=${this.percentEncode(allParams[key])}`)
      .join('&');

    // 署名ベース文字列作成
    const signatureBaseString = [
      method.toUpperCase(),
      this.percentEncode(url),
      this.percentEncode(sortedParams)
    ].join('&');

    // 署名キー作成
    const signingKey = [
      this.percentEncode(this.consumerSecret),
      this.percentEncode(this.accessTokenSecret)
    ].join('&');

    // HMAC-SHA1署名生成
    const signature = crypto
      .createHmac('sha1', signingKey)
      .update(signatureBaseString)
      .digest('base64');

    // OAuth認証ヘッダー組み立て
    const oauthHeaderParams = {
      ...oauthParams,
      oauth_signature: signature
    };

    const authHeaderValue = Object.keys(oauthHeaderParams)
      .sort()
      .map(key => `${this.percentEncode(key)}="${this.percentEncode(oauthHeaderParams[key])}"`)
      .join(', ');

    return `OAuth ${authHeaderValue}`;
  }

  /**
   * RFC 3986準拠のパーセントエンコーディング
   * @param {string} str - エンコードする文字列
   * @returns {string} エンコード済み文字列
   */
  percentEncode(str) {
    return encodeURIComponent(str)
      .replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  }

  /**
   * 投稿前の文字数・内容チェック
   * @param {string} content - 投稿内容
   * @returns {Object} バリデーション結果
   */
  validateContent(content) {
    const errors = [];
    const warnings = [];

    if (!content || content.trim().length === 0) {
      errors.push('投稿内容が空です');
    }

    if (content.length > 280) {
      warnings.push(`文字数制限を超えています (${content.length}/280文字)`);
    }

    // URLの検出と文字数計算
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = content.match(urlRegex) || [];
    let effectiveLength = content.length;
    
    urls.forEach(url => {
      // TwitterはURLを23文字として計算
      effectiveLength = effectiveLength - url.length + 23;
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      length: content.length,
      effectiveLength,
      urlCount: urls.length
    };
  }

  /**
   * リトライ機能付き投稿
   * @param {string} content - 投稿内容
   * @param {Object} options - オプション
   * @param {number} maxRetries - 最大リトライ回数
   * @returns {Promise<Object>} 投稿結果
   */
  async postWithRetry(content, options = {}, maxRetries = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.post(content, options);
        
        if (attempt > 1) {
          result.message += ` (${attempt}回目で成功)`;
        }
        
        return result;
      } catch (error) {
        lastError = error;
        console.log(`Twitter投稿試行 ${attempt}/${maxRetries} 失敗:`, error.message);
        
        if (attempt < maxRetries) {
          // 指数バックオフで待機
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`${maxRetries}回の試行後も投稿に失敗: ${lastError.message}`);
  }
}