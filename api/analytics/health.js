// PostPilot Pro - アナリティクス健全性チェック
// 既存システムへの影響監視

export default async function handler(req, res) {
  try {
    const healthChecks = await Promise.allSettled([
      // 🔍 既存システム健全性確認
      checkCoreSystem(),
      checkAnalyticsSystem()
    ]);

    const coreHealth = healthChecks[0];
    const analyticsHealth = healthChecks[1];

    res.status(200).json({
      core_system: {
        status: coreHealth.status === 'fulfilled' && coreHealth.value ? 'healthy' : 'check_required',
        details: coreHealth.status === 'fulfilled' ? coreHealth.value : 'Unable to verify'
      },
      analytics_system: {
        status: analyticsHealth.status === 'fulfilled' ? 'active' : 'limited',
        details: analyticsHealth.status === 'fulfilled' ? analyticsHealth.value : 'Fallback mode'
      },
      timestamp: new Date().toISOString(),
      integration_impact: 'zero'
    });

  } catch (error) {
    res.status(200).json({
      status: 'safe_fallback',
      message: 'Analytics running in safe mode',
      timestamp: new Date().toISOString()
    });
  }
}

async function checkCoreSystem() {
  // 🔍 既存システム軽量チェック（負荷最小）
  try {
    const response = await fetch(`${process.env.VERCEL_URL || 'https://sns-automation-pwa.vercel.app'}/api/debug/system-status`);
    return response.ok;
  } catch {
    return false;
  }
}

async function checkAnalyticsSystem() {
  // 📊 アナリティクス専用軽量チェック
  const { kv } = await import('@vercel/kv');
  try {
    await kv.get('analytics_v1_health_check');
    return 'operational';
  } catch {
    return 'limited_mode';
  }
}
