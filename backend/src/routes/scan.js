const express = require('express');
const { addScan, getUserScans, getAllScans, notifyScreenAction, deleteScreens } = require('../controllers/scanController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, addScan);
router.get('/history', requireAuth, getUserScans);          // mobile (per user)
router.get('/history/all', requireAuth, requireAdmin, getAllScans); // desktop/admin
router.post('/notify', requireAuth, notifyScreenAction);
router.delete('/delete', requireAuth, deleteScreens);

module.exports = router;
