import express from 'express';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import {
  getFeatureFlags,
  recordFeatureUsage,
  recordUiMetric,
} from '../controllers/featuresController.js';

const router = express.Router();

router.get('/', getFeatureFlags);

router.post('/usage', requireAuth, requireAdmin, recordFeatureUsage);
router.post('/ui-metrics', requireAuth, requireAdmin, recordUiMetric);

export default router;
