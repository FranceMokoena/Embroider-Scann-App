"use strict";

const assetService = require('../services/assetService');

const sendAssetError = (res, error, fallbackMessage) => {
  const statusCode = error.statusCode || 500;
  const message = statusCode >= 500 ? fallbackMessage : 'Validation error';

  console.error(`Asset controller error: ${fallbackMessage}`, error);

  return res.status(statusCode).json({
    success: false,
    message,
    error: error.message || 'Unknown error',
  });
};

const createAsset = async (req, res) => {
  try {
    const asset = await assetService.createAsset({
      ...req.body,
      userId: req.userId,
    });

    return res.status(201).json({
      success: true,
      message: 'Asset created successfully',
      data: asset,
    });
  } catch (error) {
    return sendAssetError(res, error, 'Failed to create asset');
  }
};

const createBulkAssets = async (req, res) => {
  try {
    const result = await assetService.createBulkAssets({
      ...req.body,
      userId: req.userId,
    });

    return res.status(201).json({
      success: true,
      message: `${result.createdCount} asset(s) created`,
      ...result,
    });
  } catch (error) {
    return sendAssetError(res, error, 'Failed to create bulk assets');
  }
};

const listAssets = async (req, res) => {
  try {
    const assets = await assetService.getAllAssets(req.query);

    return res.status(200).json({
      success: true,
      assets,
    });
  } catch (error) {
    return sendAssetError(res, error, 'Failed to list assets');
  }
};

const getAssetSummary = async (_req, res) => {
  try {
    const summary = await assetService.getAssetSummary();

    return res.status(200).json({
      success: true,
      summary,
    });
  } catch (error) {
    return sendAssetError(res, error, 'Failed to load asset summary');
  }
};

const deleteAsset = async (req, res) => {
  try {
    const asset = await assetService.deleteAsset(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Asset deleted successfully',
      data: asset,
    });
  } catch (error) {
    return sendAssetError(res, error, 'Failed to delete asset');
  }
};

const updateAsset = async (req, res) => {
  try {
    const asset = await assetService.updateAsset(req.params.id, req.body);

    return res.status(200).json({
      success: true,
      message: 'Asset updated successfully',
      data: asset,
    });
  } catch (error) {
    return sendAssetError(res, error, 'Failed to update asset');
  }
};

module.exports = {
  createBulkAssets,
  createAsset,
  deleteAsset,
  getAssetSummary,
  listAssets,
  updateAsset,
};
