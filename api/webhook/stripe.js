export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, data } = req.body;

    if (type === 'checkout.session.completed') {
      const session = data.object;
      const userId = session.client_reference_id;

      // KVでプラン更新
      await updateUserPlan(userId, 'premium');

      return res.status(200).json({ received: true });
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook error' });
  }
}