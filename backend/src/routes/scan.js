import { Router } from 'express';
import { addScan, getUserScans, getAllScans, notifyScreenAction, deleteScreens } from '../controllers/scanController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.post('/', requireAuth, addScan);
router.get('/history', requireAuth, getUserScans);          // mobile (per user)
router.get('/history/all', requireAuth, requireAdmin, getAllScans); // desktop/admin
router.post('/notify', requireAuth, notifyScreenAction);
router.delete('/delete', requireAuth, deleteScreens);

export default router;
