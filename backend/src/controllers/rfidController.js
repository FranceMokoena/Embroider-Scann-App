"use strict";

const rfidService = require('../services/rfidService');
const assetService = require('../services/assetService');

const getStatusCode = error => error.statusCode || 500;

const sendError = (res, error, fallbackMessage) => {
  const statusCode = getStatusCode(error);

  return res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 ? fallbackMessage : 'Validation error',
    error: error.message || 'Unknown error',
  });
};

const registerTag = async (req, res) => {
  try {
    const tag = await rfidService.registerTag({
      epcRaw: req.body.epcRaw,
      tid: req.body.tid,
      userId: req.userId,
    });

    return res.status(201).json({
      success: true,
      tag: {
        id: tag._id,
        epcRaw: tag.epcRaw,
        epcKey: tag.epcKey,
        tid: tag.tid || null,
        status: tag.status,
        firstSeenAt: tag.firstSeenAt,
        lastSeenAt: tag.lastSeenAt,
      },
    });
  } catch (error) {
    console.error('RFID registerTag error:', error);
    return sendError(res, error, 'Failed to register RFID tag');
  }
};

const assignTag = async (req, res) => {
  try {
    const result = await rfidService.assignTagToAsset({
      epcRaw: req.body.epcRaw,
      assetId: req.body.assetId,
      userId: req.userId,
      reason: req.body.reason,
      notes: req.body.notes,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('RFID assignTag error:', error);
    return sendError(res, error, 'Failed to assign RFID tag');
  }
};

const lookupTag = async (req, res) => {
  try {
    const result = await rfidService.resolveEpc(req.params.epc);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('RFID lookupTag error:', error);
    return sendError(res, error, 'Failed to lookup RFID tag');
  }
};

const writeScanLog = async (req, res) => {
  try {
    const log = await rfidService.writeScanLog({
      epcRaw: req.body.epcRaw,
      deviceId: req.body.deviceId,
      source: req.body.source,
      screen: req.body.screen,
      mappingStatus: req.body.mappingStatus,
      duplicateSuppressed: req.body.duplicateSuppressed,
      userId: req.userId,
    });

    return res.status(201).json({
      success: true,
      log,
    });
  } catch (error) {
    console.error('RFID writeScanLog error:', error);
    return sendError(res, error, 'Failed to write RFID scan log');
  }
};

const getLiveTags = async (_req, res) => {
  return res.status(200).json({
    success: true,
    tags: [],
    message: 'Live RFID stream is handled on the mobile device.',
  });
};

const verifyRoom = async (req, res) => {
  try {
    const result = await assetService.verifyRoomInventory({
      location: req.body.location,
      epcs: req.body.epcs,
      userId: req.userId,
    });

    return res.status(200).json({
      success: true,
      audit: result,
    });
  } catch (error) {
    console.error('RFID verifyRoom error:', error);
    return sendError(res, error, 'Failed to verify room inventory');
  }
};

module.exports = {
  assignTag,
  getLiveTags,
  lookupTag,
  registerTag,
  verifyRoom,
  writeScanLog,
};
