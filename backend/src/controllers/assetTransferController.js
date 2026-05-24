"use strict";

const assetTransferService = require("../services/assetTransferService");

const sendTransferError = (res, error, fallbackMessage) => {
  const statusCode = error.statusCode || 500;
  const message = statusCode >= 500 ? fallbackMessage : error.message || "Validation error";

  console.error(`Asset transfer controller error: ${fallbackMessage}`, error);

  return res.status(statusCode).json({
    success: false,
    message,
    error: error.message || "Unknown error",
  });
};

const createAssetTransfer = async (req, res) => {
  try {
    const { assetIds, toSection, newStatus, reason, transferType, batchId } = req.body || {};

    const result = await assetTransferService.transferAssets({
      assetIds,
      toSection,
      assignedBy: req.userId,
      newStatus,
      reason,
      transferType,
      batchId,
    });

    const statusCode =
      result.summary.transferred > 0 || result.summary.skipped > 0 ? 200 : 400;

    return res.status(statusCode).json({
      success: result.success,
      message:
        result.summary.transferred > 0
          ? `${result.summary.transferred} asset(s) transferred to ${result.toSection}`
          : "No assets were transferred",
      batchId: result.batchId,
      toSection: result.toSection,
      newStatus: result.newStatus,
      transferType: result.transferType,
      transferred: result.transferred,
      skipped: result.skipped,
      errors: result.errors,
      summary: result.summary,
    });
  } catch (error) {
    return sendTransferError(res, error, "Failed to transfer assets");
  }
};

module.exports = {
  createAssetTransfer,
};
