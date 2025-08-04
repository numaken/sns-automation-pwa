export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return res.json({ 
        plan: 'free',
        message: 'No authentication token provided'
      });
    }

    const userInfo = await getUserInfoFromToken(token);
    const userPlan = await checkUserPremiumStatus(userInfo);

    return res.json({
      plan: userPlan,
      user_id: userInfo.userId,
      email: userInfo.email,
      token_received: !!token
    });

  } catch (error) {
    console.error('User plan check error:', error);
    return res.json({ 
      plan: 'free',
      error: 'Plan check failed, defaulting to free'
    });
  }
}

async function getUserInfoFromToken(token) {
  try {
    if (token === 'premium-test-token') {
      return { 
        userId: 'premium-user-1', 
        email: 'premium@example.com' 
      };
    }
    
    return { 
      userId: 'free-user-1', 
      email: 'free@example.com' 
    };
    
  } catch (error) {
    console.error('Token verification error:', error);
    return { userId: 'unknown', email: 'unknown@example.com' };
  }
}

async function checkUserPremiumStatus(userInfo) {
  try {
    if (userInfo.userId === 'premium-user-1') {
      return 'premium';
    }
    
    return 'free';
    
  } catch (error) {
    console.error('Premium status check error:', error);
    return 'free';
  }
}
