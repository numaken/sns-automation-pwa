// api/data-deletion.js - Meta要件対応データ削除エンドポイント
export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      // Metaからのデータ削除リクエスト処理
      const { signed_request } = req.body;

      console.log('Data deletion request received:', {
        timestamp: new Date().toISOString(),
        signed_request: signed_request ? 'present' : 'missing',
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
      });

      // 実際のデータ削除処理（必要に応じて実装）
      // 現在はローカルストレージベースなので、サーバー側でのデータはなし

      // Metaに要求される形式でレスポンス
      const deletionResponse = {
        url: `https://sns-automation-pwa.vercel.app/api/data-deletion-status`,
        confirmation_code: `DEL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      console.log('Data deletion response:', deletionResponse);

      return res.status(200).json(deletionResponse);

    } catch (error) {
      console.error('Data deletion error:', error);
      return res.status(500).json({
        error: 'Data deletion request failed',
        message: error.message
      });
    }
  }

  // GET リクエスト（設定確認用）
  if (req.method === 'GET') {
    return res.status(200).json({
      service: 'SNS自動化PWA - データ削除サービス',
      status: 'active',
      endpoint: 'https://sns-automation-pwa.vercel.app/api/data-deletion',
      description: 'Meta/Facebook API要件に準拠したデータ削除エンドポイント',
      last_updated: new Date().toISOString()
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}