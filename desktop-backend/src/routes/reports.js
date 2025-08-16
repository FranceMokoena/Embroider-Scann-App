import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  generateCsvReport,
  generateExcelReport,
  generatePdfReport
} from '../controllers/reportsController.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);
router.use(requireAdmin);

// Report generation endpoints
router.get('/csv', generateCsvReport);
router.get('/excel', generateExcelReport);
router.get('/pdf', generatePdfReport);

export default router;




