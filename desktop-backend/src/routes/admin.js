import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  getDashboardStats,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getAllScans,
  getScanById,
  updateScan,
  deleteScan,
  archiveScan,
  getAllSessions,
  getSessionById,
  searchScans,
  searchUsers
} from '../controllers/adminController.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);
router.use(requireAdmin);

// Dashboard
router.get('/dashboard', getDashboardStats);

// User Management
router.get('/users', getAllUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Scan Management
router.get('/scans', getAllScans);
router.get('/scans/:id', getScanById);
router.put('/scans/:id', updateScan);
router.delete('/scans/:id', deleteScan);
router.post('/scans/:id/archive', archiveScan);

// Session Management
router.get('/sessions', getAllSessions);
router.get('/sessions/:id', getSessionById);

// Search and Filter
router.get('/search/scans', searchScans);
router.get('/search/users', searchUsers);

export default router;

