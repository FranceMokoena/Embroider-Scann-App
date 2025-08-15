// src/controllers/authController.js
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

// Register user
const register = async (req, res) => {
  try {
    const { department, username, password, name, surname, email, role = 'technician' } = req.body;
    if (!department || !username || !password) {
      return res.status(400).json({ error: 'department, username and password required' });
    }

    if (await User.findOne({ username })) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ department, username, password: hashed, name, surname, email, role });
    return res.status(201).json({ message: 'User created', userId: user._id });
  } catch (err) {
    console.error('❌ register error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });

    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id, isAdmin: user.role === 'admin' }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token });
  } catch (err) {
    console.error('❌ login error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Get profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user });
  } catch (err) {
    console.error('❌ getProfile error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Export
module.exports = {
  register,
  login,
  getProfile,
  listUsers,
  createUser,
  updateUser,
  deleteUser
};
