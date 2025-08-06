// api/create-subscription.js - 最小実装
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // TODO: Stripe実装
        return res.status(200).json({
            message: 'Stripe統合は実装中です',
            email: email
        });

    } catch (error) {
        console.error('Subscription error:', error);
        return res.status(500).json({ error: 'Subscription creation failed' });
    }
}