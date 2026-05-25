"use strict";

const express = require('express');
const { startSession, stopSession } = require('../controllers/sessionController');
const { requireAuth } = require('../middleware/auth');
const { legacyBarcodeGuard } = require('../middleware/legacyBarcodeGuard');

const router = express.Router();

router.use(legacyBarcodeGuard);

router.post('/start', requireAuth, startSession);
router.post('/stop', requireAuth, stopSession);

module.exports = router;
