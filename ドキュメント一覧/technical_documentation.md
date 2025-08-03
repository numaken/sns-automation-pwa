# 🔧 SNS自動化ツール - 技術実装ドキュメント

## 📌 システム概要

### アーキテクチャ
```
Frontend (React PWA)
├── Vercel Deployment
├── PostGenerator.jsx - UI/UX
├── UpgradePrompt.jsx - 転換促進
└── API通信

Backend (Vercel Serverless)
├── generate-post-shared.js - 共有API生成
├── admin/cost-monitor.js - コスト監視
├── admin/emergency-stop.js - 緊急停止
└── admin/debug-ip.js - IP診断

Database (Vercel KV - Redis)
├── daily_usage:IP:DATE - 制限管理
├── daily_cost:DATE - コスト追跡
└── emergency_stop:DATE - 緊急停止

External APIs
├── OpenAI GPT-3.5-turbo - AI生成
└── Stripe - 決済処理
```

## 🔧 環境設定

### 必須環境変数
```bash
# OpenAI API
OPENAI_API_KEY_SHARED=sk-proj-*** # 共有APIキー

# Vercel KV (Redis)
KV_REST_API_URL=https://pure-oarfish-61596.upstash.io
KV_REST_API_TOKEN=AfCcAAIjcDEwMWE3NzRlZjAzMWY0YTc3YWUxOWRlMGIxMTdkNjY3ZnAxMA

# 制限・セキュリティ
DAILY_COST_LIMIT=10 # $10/日上限
ADMIN_KEY=sns-automation-admin-2024

# Stripe決済（既存）
STRIPE_SECRET_KEY=***
STRIPE_PUBLISHABLE_KEY=***
```

### デプロイ環境
- **Platform**: Vercel (Hobby Plan制限: 12 Serverless Functions)
- **Node.js**: 18.x
- **Database**: Vercel KV (Redis 6.x互換)

## 📁 主要ファイル詳細

### 1. api/generate-post-shared.js
**目的**: 共有APIキーによるAI投稿生成

**主要機能**:
- IP別制限チェック（1日3回）
- OpenAI API呼び出し
- コスト追跡
- 品質評価

```javascript
// 制限チェックロジック
const DAILY_LIMIT = 3;
const key = `daily_usage:${clientIP}:${today}`;
const usage = await getKVValue(key) || 0;
return parseInt(usage) < DAILY_LIMIT;
```

**レスポンス形式**:
```json
{
  "post": "AI生成投稿テキスト",
  "quality": 85,
  "usage": {"remaining": 2},
  "shared_api": true
}
```

### 2. KV REST API関数群
**重要**: @upstash/redisパッケージ不使用、REST API直接利用

```javascript
// GET操作
async function getKVValue(key) {
  const response = await fetch(`${process.env.KV_REST_API_URL}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(['GET', key]),
  });
  return (await response.json()).result;
}

// SET操作（TTL付き）
async function setKVValue(key, value, ttl = null) {
  const command = ttl 
    ? ['SETEX', key, ttl, value.toString()]
    : ['SET', key, value.toString()];
  
  await fetch(`${process.env.KV_REST_API_URL}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
}
```

### 3. 管理者API群

#### cost-monitor.js
**URL**: `/api/admin/cost-monitor`  
**認証**: Header `x-admin-key: sns-automation-admin-2024`

**応答例**:
```json
{
  "date": "2025-08-03",
  "cost": {
    "current": "0.0045",
    "limit": 10,
    "percentage": "0.0",
    "alert": false
  },
  "usage": {
    "total_users": 5,
    "total_generations": 12,
    "avg_cost_per_generation": "0.000375"
  },
  "status": "OK"
}
```

#### emergency-stop.js
**目的**: 日次コスト上限超過時の自動停止

#### debug-ip.js
**目的**: IP制限のデバッグ・診断

## 🔍 制限システム詳細

### IP制限の仕組み
```javascript
// クライアントIP取得
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['x-real-ip'] || 
         req.headers['cf-connecting-ip'] || 
         req.connection.remoteAddress || 
         'unknown';
}

// 制限キー生成
const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
const key = `daily_usage:${clientIP}:${today}`;
```

### TTL設定
- **制限データ**: 86400秒（24時間）自動削除
- **コストデータ**: 86400秒（24時間）自動削除

## 💰 コスト計算ロジック

### GPT-3.5-turbo料金
```javascript
// OpenAI料金計算
const inputCost = (usage.prompt_tokens / 1000) * 0.0015;  // $0.0015/1K tokens
const outputCost = (usage.completion_tokens / 1000) * 0.002; // $0.002/1K tokens
const totalCost = inputCost + outputCost;

// 1回あたり平均コスト: $0.00045
```

### 日次上限管理
- **設定値**: $10/日
- **実際想定**: $6.75/月（500回/日）
- **アラート閾値**: $8/日（80%）

## 🛠️ メンテナンス・運用

### 日次確認項目
```bash
# 1. コスト確認
curl -H "x-admin-key: sns-automation-admin-2024" \
  https://sns-automation-pwa.vercel.app/api/admin/cost-monitor

# 2. 緊急停止状況確認
curl -H "x-admin-key: sns-automation-admin-2024" \
  https://sns-automation-pwa.vercel.app/api/admin/emergency-stop

# 3. 生成テスト
curl -X POST -H "Content-Type: application/json" \
  -d '{"prompt":"テスト","tone":"カジュアル","userType":"free"}' \
  https://sns-automation-pwa.vercel.app/api/generate-post-shared
```

### 制限リセット（緊急時）
```bash
# IP制限リセット
curl -H "x-admin-key: sns-automation-admin-2024" \
  https://sns-automation-pwa.vercel.app/api/admin/complete-reset
```

## 🚨 トラブルシューティング

### よくある問題

#### 1. KV API エラー
**症状**: `KV set error: 400`  
**原因**: REST API形式の間違い  
**解決**: 正しいRedisコマンド形式を使用

#### 2. IP制限が効かない
**症状**: 制限を超えても生成できる  
**原因**: IPアドレス取得の問題  
**解決**: debug-ip.jsで実際のIPを確認

#### 3. OpenAI APIエラー
**症状**: `OpenAI API response invalid`  
**原因**: APIキーまたはクォータの問題  
**解決**: 環境変数とOpenAIアカウント確認

### ログ確認
```bash
# Vercel Function Logs
vercel logs --follow

# 特定時間のログ
vercel logs --since=1h
```

## 🔧 開発・テスト環境

### ローカル開発
```bash
# 依存関係インストール
npm install

# 環境変数設定（.env.local）
cp .env.example .env.local

# 開発サーバー起動
npm run dev
```

### テスト
```bash
# 基本生成テスト
npm run test:generation

# 制限テスト
npm run test:limits

# コスト監視テスト
npm run test:monitoring
```

## 📊 監視・アラート

### メトリクス
- **生成成功率**: >95%
- **レスポンス時間**: <3秒
- **日次コスト**: <$10
- **エラー率**: <5%

### アラート条件
- コスト80%到達時
- エラー率10%超過時
- API応答時間5秒超過時

## 🔒 セキュリティ

### API認証
- 管理者API: `x-admin-key`ヘッダー
- レート制限: IP別1日3回

### データ保護
- APIキー環境変数管理
- Redis TTL自動削除
- ログ個人情報マスキング

## 📈 パフォーマンス最適化

### Vercel最適化
- Function実行時間: <10秒
- Cold Start対策: Keep-Alive
- メモリ使用量: <128MB

### Redis最適化
- キー設計: 効率的なパターン
- TTL設定: 自動クリーンアップ
- 接続プーリング: REST API使用

---

**📅 最終更新**: 2025年8月3日  
**👨‍💻 作成者**: Claude Sonnet 4  
**📋 ステータス**: プロダクション対応完了