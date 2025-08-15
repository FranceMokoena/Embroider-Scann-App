"use strict";

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const DESKTOP_SERVICE_TOKEN = process.env.DESKTOP_SERVICE_TOKEN;

const requireAuth = (req, res, next) => {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = auth.split(' ')[1];

  // Allow desktop service token
  if (token === DESKTOP_SERVICE_TOKEN) {
    req.userId = 'desktop-service';
    req.isAdmin = true; // desktop always admin
    return next();
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload || typeof payload.userId !== 'string') {
      throw new Error('Invalid token payload');
    }
    req.userId = payload.userId;
    req.isAdmin = !!payload.isAdmin;
    next();
  } catch (err) {
    console.error('❌ requireAuth error:', err);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.isAdmin) {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  next();
};

module.exports = {
  requireAuth,
  requireAdmin,
};