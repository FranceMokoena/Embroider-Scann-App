"use strict";

const express = require('express');
const {
  createBulkAssets,
  createAsset,
  getAssetSummary,
  listAssets,
} = require('../controllers/assetController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, listAssets);
router.get('/summary', requireAuth, getAssetSummary);
router.post('/bulk-create', requireAuth, createBulkAssets);
router.post('/', requireAuth, createAsset);

module.exports = router;
