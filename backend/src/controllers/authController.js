//src/controllers/authController.js
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

export const listUsers = async (req, res) => {
  try {
    const { department, q, page = 1, limit = 50 } = req.query;
    const match = {};
    if (department) match.department = department;
    if (q) {
      const re = new RegExp(String(q), 'i');
      match.$or = [{ username: re }, { email: re }, { name: re }, { surname: re }];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const users = await User.find(match).skip(skip).limit(Number(limit)).select('-password');
    const total = await User.countDocuments(match);

    return res.json({ data: users, page: Number(page), limit: Number(limit), total });
  } catch (err) {
    console.error('❌ listUsers error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

export const createUser = async (req, res) => {
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
    console.error('❌ createUser error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

export const updateUser = async (req, res) => {
  try {
    const id = req.params.id;
    const updates = { ...req.body };

    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const user = await User.findByIdAndUpdate(id, updates, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    return res.json({ message: 'User updated', user });
  } catch (err) {
    console.error('❌ updateUser error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const id = req.params.id;
    const user = await User.findByIdAndUpdate(id, { isActive: false }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ message: 'User deactivated', user });
  } catch (err) {
    console.error('❌ deleteUser error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
