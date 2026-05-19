"use strict";

const express = require('express');
const {
  createBulkAssets,
  createAsset,
  deleteAsset,
  getDepartmentOptions,
  getAssetSummary,
  getAssignmentLifecycle,
  listAssets,
  updateAsset,
} = require('../controllers/assetController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, listAssets);
router.get('/summary', requireAuth, getAssetSummary);
router.get('/lifecycle/history', requireAuth, getAssignmentLifecycle);
router.get('/departments/options', requireAuth, getDepartmentOptions);
router.post('/bulk-create', requireAuth, createBulkAssets);
router.post('/', requireAuth, createAsset);
router.patch('/:id', requireAuth, updateAsset);
router.delete('/:id', requireAuth, deleteAsset);

module.exports = router;
