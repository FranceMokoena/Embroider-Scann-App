"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const JWT_SECRET = process.env.JWT_SECRET;
const register = async (req, res) => {
    try {
        const { department, username, password } = req.body;
        if (!department || !username || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        if (await User_1.default.findOne({ username })) {
            return res.status(409).json({ error: 'Username already taken' });
        }
        const hashed = await bcryptjs_1.default.hash(password, 10);
        const user = await User_1.default.create({ department, username, password: hashed });
        return res.status(201).json({ message: 'Registration successful', userId: user._id });
    }
    catch (err) {
        console.error('❌ Register error:', err);
        return res.status(500).json({ error: 'Server error', details: err.message });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }
        const user = await User_1.default.findOne({ username });
        if (!user || !(await bcryptjs_1.default.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({ message: 'Login successful', token });
    }
    catch (err) {
        console.error('❌ Login error:', err);
        return res.status(500).json({ error: 'Server error', details: err.message });
    }
};
exports.login = login;
const getProfile = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.userId).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.json({
            id: user._id,
            username: user.username,
            department: user.department,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        });
    }
    catch (err) {
        console.error('❌ Get profile error:', err);
        return res.status(500).json({ error: 'Server error', details: err.message });
    }
};
exports.getProfile = getProfile;
//# sourceMappingURL=authController.js.map