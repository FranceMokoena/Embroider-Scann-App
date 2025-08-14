import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const DESKTOP_SERVICE_TOKEN = process.env.DESKTOP_SERVICE_TOKEN;

export const requireAuth = (req, res, next) => {
  const auth = req.headers.authorization;

  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = auth.split(' ')[1];

  // Allow desktop service token
  if (token === DESKTOP_SERVICE_TOKEN) {
    req.userId = 'desktop-service'; // mark as desktop
    return next();
  }

  // Otherwise, verify normal JWT
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload || typeof payload.userId !== 'string') {
      throw new Error('Invalid token payload');
    }
    req.userId = payload.userId;
    next();
  } catch (err) {
    console.error('❌ requireAuth error:', err);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};
