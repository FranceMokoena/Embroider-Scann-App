import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET is not defined');
  process.exit(1);
}

// In-memory admin user (in production, use a database)
const ADMIN_USER = {
  username: process.env.ADMIN_USERNAME || 'admin',
  password: process.env.ADMIN_PASSWORD || 'admin123',
  email: process.env.ADMIN_EMAIL || 'admin@embroiderytech.com',
  role: 'admin'
};

// Hash the password once on startup
let hashedPassword = null;
bcrypt.hash(ADMIN_USER.password, 10).then(hash => {
  hashedPassword = hash;
  console.log('✅ Admin password hashed successfully');
}).catch(err => {
  console.error('❌ Failed to hash admin password:', err);
});

export const requireAuth = (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = auth.split(' ')[1];
    const payload = jwt.verify(token, JWT_SECRET);
    
    if (!payload || typeof payload.username !== 'string') {
      throw new Error('Invalid token payload');
    }

    req.user = payload;
    return next();
  } catch (err) {
    console.error('❌ requireAuth error:', err);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const requireAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin role required' });
    }

    return next();
  } catch (err) {
    console.error('❌ requireAdmin error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Check against admin user
    if (username === ADMIN_USER.username && hashedPassword) {
      const isValidPassword = await bcrypt.compare(password, hashedPassword);
      
      if (isValidPassword) {
        const token = jwt.sign(
          { 
            username: ADMIN_USER.username, 
            email: ADMIN_USER.email, 
            role: ADMIN_USER.role 
          },
          JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        return res.json({
          message: 'Login successful',
          token,
          user: {
            username: ADMIN_USER.username,
            email: ADMIN_USER.email,
            role: ADMIN_USER.role
          }
        });
      }
    }

    return res.status(401).json({ error: 'Invalid credentials' });
  } catch (err) {
    console.error('❌ Login error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

export const getProfile = (req, res) => {
  try {
    return res.json({
      user: {
        username: req.user.username,
        email: req.user.email,
        role: req.user.role
      }
    });
  } catch (err) {
    console.error('❌ Get profile error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
