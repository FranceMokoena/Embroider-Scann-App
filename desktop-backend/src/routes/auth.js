import express from 'express';
import { login, getProfile, requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Admin login
router.post('/login', login);

// Get admin profile
router.get('/profile', requireAuth, getProfile);

export default router;

