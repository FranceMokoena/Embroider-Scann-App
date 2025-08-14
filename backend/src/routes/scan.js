import { Router } from 'express';
import { addScan, getUserScans, notifyScreenAction, deleteScreens } from '../controllers/scanController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/', requireAuth, addScan);
router.get('/history', requireAuth, getUserScans);   // <-- desktop app can now access
router.post('/notify', requireAuth, notifyScreenAction);
router.delete('/delete', requireAuth, deleteScreens);

export default router;
