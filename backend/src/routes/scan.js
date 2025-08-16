"use strict";

const express = require('express');
const { addScan, getUserScans, getAllScans, notifyScreenAction, deleteScreens, getProductionScreens, getRepairScreens, getWriteOffScreens } = require('../controllers/scanController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, addScan);
router.get('/history', requireAuth, getUserScans);          // mobile (per user)
router.get('/history/all', requireAuth, requireAdmin, getAllScans); // desktop/admin
router.post('/notify', requireAuth, notifyScreenAction);
router.delete('/delete', requireAuth, deleteScreens);
router.get('/production', requireAuth, requireAdmin, getProductionScreens);
router.get('/repair', requireAuth, requireAdmin, getRepairScreens);
router.get('/write-offs', requireAuth, requireAdmin, getWriteOffScreens);

module.exports = router;