import express from 'express';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import {
  getAsset,
  getAssetDashboardView,
  getAssetHistory,
  getAssetReport,
  getAssetRfidActivity,
  getAssetSections,
  getAssetStatisticsView,
  getAssetSummary,
  getAssetTechnicians,
  getAssetTransfers,
  getAssetVerifications,
  listAssets,
  resolveAssetIdentifier,
} from '../controllers/assetsController.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get('/', listAssets);
router.get('/summary', getAssetSummary);
router.get('/dashboard', getAssetDashboardView);
router.get('/statistics', getAssetStatisticsView);
router.get('/history', getAssetHistory);
router.get('/transfers', getAssetTransfers);
router.get('/verifications', getAssetVerifications);
router.get('/rfid-activity', getAssetRfidActivity);
router.get('/technicians', getAssetTechnicians);
router.get('/sections', getAssetSections);
router.get('/resolve', resolveAssetIdentifier);
router.get('/resolve/:type/:value', resolveAssetIdentifier);
router.get('/reports/:type', getAssetReport);
router.get('/:id', getAsset);

export default router;
