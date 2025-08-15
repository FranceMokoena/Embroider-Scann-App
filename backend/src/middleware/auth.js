"use strict";
// src/middleware/auth.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Assert JWT_SECRET is defined (we exit process if not)
const JWT_SECRET = process.env.JWT_SECRET;
const requireAuth = (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }
    // We know split will yield [ 'Bearer', '<token>' ], so it's safe to assert non-null
    const token = auth.split(' ')[1];
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const data = payload;
        if (!data || typeof data.userId !== 'string') {
            throw new Error('Invalid token payload');
        }
        req.userId = data.userId;
        return next();
    }
    catch (err) {
        console.error('❌ requireAuth error:', err);
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};
exports.requireAuth = requireAuth;
//# sourceMappingURL=auth.js.map