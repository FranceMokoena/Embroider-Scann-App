"use strict";

const express = require('express');
const {
  assignTag,
  getLiveTags,
  lookupTag,
  registerTag,
  verifyRoom,
  writeScanLog,
} = require('../controllers/rfidController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/tags/register', requireAuth, registerTag);
router.post('/assign', requireAuth, assignTag);
router.get('/lookup/:epc', requireAuth, lookupTag);
router.get('/tags/live', requireAuth, getLiveTags);
router.post('/scan-log', requireAuth, writeScanLog);
router.post('/verify-room', requireAuth, verifyRoom);

module.exports = router;
