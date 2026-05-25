"use strict";

const mongoose = require('mongoose');

const TAG_SCAN_SOURCES = ['deviceApi', 'broadcast', 'manual', 'unknown'];
const TAG_SCAN_MAPPING_STATUSES = ['assigned', 'unassigned', 'unknown'];

const tagScanLogSchema = new mongoose.Schema({
  epcRaw: {
    type: String,
    required: true,
  },
  epcKey: {
    type: String,
    required: true,
    index: true,
  },
  rfidTagId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RFIDTag',
    default: undefined,
    index: true,
  },
  assetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    default: undefined,
    index: true,
  },
  deviceId: {
    type: String,
    default: undefined,
    index: true,
  },
  readerSessionId: {
    type: String,
    default: undefined,
    index: true,
  },
  source: {
    type: String,
    enum: TAG_SCAN_SOURCES,
    default: 'unknown',
  },
  screen: {
    type: String,
    default: undefined,
  },
  mappingStatus: {
    type: String,
    enum: TAG_SCAN_MAPPING_STATUSES,
    default: 'unknown',
    index: true,
  },
  duplicateSuppressed: {
    type: Boolean,
    default: false,
  },
  suppressionReason: {
    type: String,
    default: undefined,
  },
  idempotencyKey: {
    type: String,
    default: undefined,
    unique: true,
    sparse: true,
    index: true,
  },
  userId: {
    type: String,
    default: undefined,
    index: true,
  },
  readTimestamp: {
    type: Date,
    default: undefined,
    index: true,
  },
  serverReceivedAt: {
    type: Date,
    default: () => new Date(),
  },
  timestamp: {
    type: Date,
    default: () => new Date(),
    index: true,
  },
}, { timestamps: true });

tagScanLogSchema.index({ epcKey: 1, readerSessionId: 1, timestamp: -1 });
tagScanLogSchema.index({ epcKey: 1, deviceId: 1, timestamp: -1 });

module.exports = mongoose.model('TagScanLog', tagScanLogSchema);
