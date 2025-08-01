/**
 * Threads投稿クラス - Meta Graph API実装
 * 2段階投稿プロセス: コンテナ作成 → 投稿公開
 */
export class ThreadsPoster {
  constructor(credentials) {
    this.accessToken = credentials.accessToken;
    this.userId = credentials.userId;
    this.apiBaseUrl = 'https://graph.threads.net';
    this.apiVersion = 'v1.0';
  }

  /**
   * メイン投稿メソッド
   * @param {string} content - 投稿内容
   * @param {Object} options - オプション設定
   * @returns {Promise<Object>} 投稿結果
   */
  async post(content, options = {}) {
    try {
      // Step 1: メディアコンテナ作成
      const containerId = await this.createMediaContainer(content, options);

      // 少し待機してからStep 2を実行
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 2: 投稿公開
      const result = await this.publishContainer(containerId);

      return {
        success: true,
        post_id: result.id,
        platform: 'threads',
        url: `https://www.threads.net/@${this.userId}/post/${result.id}`,
        message: 'Threads投稿が成功しました',
        container_id: containerId,
        response: result
      };

    } catch (error) {
      throw new Error(`Threads投稿失敗: ${error.message}`);
    }
  }

  /**
   * Step 1: メディアコンテナ作成
   * @param {string} content - 投稿内容
   * @param {Object} options - オプション設定
   * @returns {Promise<string>} コンテナID
   */
  async createMediaContainer(content, options = {}) {
    const url = `${this.apiBaseUrl}/${this.apiVersion}/${this.userId}/threads`;

    const params = new URLSearchParams({
      media_type: 'TEXT',
      text: content.substring(0, 500), // Threads文字数制限
      access_token: this.accessToken
    });

    // 画像添付がある場合
    if (options.image_url) {
      params.set('media_type', 'IMAGE');
      params.set('image_url', options.image_url);
    }

    // 動画添付がある場合
    if (options.video_url) {
      params.set('media_type', 'VIDEO');
      params.set('video_url', options.video_url);
    }

    // リプライの場合
    if (options.reply_to_id) {
      params.set('reply_to_id', options.reply_to_id);
    }

    // カルーセル投稿の場合
    if (options.children && Array.isArray(options.children)) {
      params.set('media_type', 'CAROUSEL');
      params.set('children', options.children.join(','));
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Container creation failed: ${data.error?.message || 'Unknown error'}`);
    }

    return data.id;
  }

  /**
   * Step 2: 投稿公開
   * @param {string} containerId - コンテナID
   * @returns {Promise<Object>} 公開結果
   */
  async publishContainer(containerId) {
    const url = `${this.apiBaseUrl}/${this.apiVersion}/${this.userId}/threads_publish`;

    const params = new URLSearchParams({
      creation_id: containerId,
      access_token: this.accessToken
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Publish failed: ${data.error?.message || 'Unknown error'}`);
    }

    return data;
  }

  /**
   * 投稿ステータス確認
   * @param {string} containerId - コンテナID
   * @returns {Promise<Object>} ステータス情報
   */
  async getContainerStatus(containerId) {
    const url = `${this.apiBaseUrl}/${this.apiVersion}/${containerId}`;

    const params = new URLSearchParams({
      fields: 'status,error_message',
      access_token: this.accessToken
    });

    const response = await fetch(`${url}?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Status check failed: ${data.error?.message || 'Unknown error'}`);
    }

    return data;
  }

  /**
   * 投稿前の内容バリデーション
   * @param {string} content - 投稿内容
   * @param {Object} options - オプション
   * @returns {Object} バリデーション結果
   */
  validateContent(content, options = {}) {
    const errors = [];
    const warnings = [];

    if (!content || content.trim().length === 0) {
      errors.push('投稿内容が空です');
    }

    if (content.length > 500) {
      warnings.push(`文字数制限を超えています (${content.length}/500文字)`);
    }

    // URL検証
    if (options.image_url && !this.isValidUrl(options.image_url)) {
      errors.push('無効な画像URLです');
    }

    if (options.video_url && !this.isValidUrl(options.video_url)) {
      errors.push('無効な動画URLです');
    }

    // カルーセル検証
    if (options.children) {
      if (!Array.isArray(options.children)) {
        errors.push('children は配列である必要があります');
      } else if (options.children.length < 2 || options.children.length > 10) {
        errors.push('カルーセルは2-10個のアイテムが必要です');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      length: content.length,
      hasMedia: !!(options.image_url || options.video_url || options.children)
    };
  }

  /**
   * URL妥当性チェック
   * @param {string} url - チェック対象URL
   * @returns {boolean} 妥当性
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
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
    let containerId;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.post(content, options);

        if (attempt > 1) {
          result.message += ` (${attempt}回目で成功)`;
        }

        return result;
      } catch (error) {
        lastError = error;
        console.log(`Threads投稿試行 ${attempt}/${maxRetries} 失敗:`, error.message);

        // コンテナが作成されている場合はステータスをチェック
        if (containerId) {
          try {
            const status = await this.getContainerStatus(containerId);
            console.log('Container status:', status);
          } catch (statusError) {
            console.log('Status check failed:', statusError.message);
          }
        }

        if (attempt < maxRetries) {
          // 指数バックオフで待機
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`${maxRetries}回の試行後も投稿に失敗: ${lastError.message}`);
  }

  /**
   * ユーザー情報取得
   * @returns {Promise<Object>} ユーザー情報
   */
  async getUserInfo() {
    const url = `${this.apiBaseUrl}/${this.apiVersion}/${this.userId}`;

    const params = new URLSearchParams({
      fields: 'id,username,name,threads_profile_picture_url,threads_biography',
      access_token: this.accessToken
    });

    const response = await fetch(`${url}?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`User info fetch failed: ${data.error?.message || 'Unknown error'}`);
    }

    return data;
  }

  /**
   * 投稿一覧取得
   * @param {Object} options - オプション
   * @returns {Promise<Object>} 投稿一覧
   */
  async getThreads(options = {}) {
    const url = `${this.apiBaseUrl}/${this.apiVersion}/${this.userId}/threads`;

    const params = new URLSearchParams({
      fields: 'id,media_product_type,media_type,media_url,permalink,username,text,timestamp,shortcode,thumbnail_url,children,is_quote_post',
      access_token: this.accessToken
    });

    if (options.limit) {
      params.set('limit', options.limit);
    }

    if (options.before) {
      params.set('before', options.before);
    }

    if (options.after) {
      params.set('after', options.after);
    }

    const response = await fetch(`${url}?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Threads fetch failed: ${data.error?.message || 'Unknown error'}`);
    }

    return data;
  }

  /**
   * 投稿詳細取得
   * @param {string} threadId - 投稿ID
   * @returns {Promise<Object>} 投稿詳細
   */
  async getThread(threadId) {
    const url = `${this.apiBaseUrl}/${this.apiVersion}/${threadId}`;

    const params = new URLSearchParams({
      fields: 'id,media_product_type,media_type,media_url,permalink,username,text,timestamp,shortcode,thumbnail_url,children,is_quote_post',
      access_token: this.accessToken
    });

    const response = await fetch(`${url}?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Thread fetch failed: ${data.error?.message || 'Unknown error'}`);
    }

    return data;
  }
}