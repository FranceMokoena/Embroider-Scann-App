"use strict";

const mongoose = require('mongoose');

const ASSET_TAG_MAPPING_STATUSES = ['active', 'removed', 'replaced'];

const assetTagMappingSchema = new mongoose.Schema({
  assetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    required: true,
    index: true,
  },
  rfidTagId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RFIDTag',
    required: true,
    index: true,
  },
  epcRawSnapshot: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ASSET_TAG_MAPPING_STATUSES,
    default: 'active',
    index: true,
  },
  assignedAt: {
    type: Date,
    default: () => new Date(),
  },
  assignedBy: {
    type: String,
    default: undefined,
  },
  unassignedAt: {
    type: Date,
    default: undefined,
  },
  unassignedBy: {
    type: String,
    default: undefined,
  },
  reason: {
    type: String,
    default: undefined,
  },
  notes: {
    type: String,
    default: undefined,
  },
}, { timestamps: true });

assetTagMappingSchema.index(
  { rfidTagId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active' },
  },
);

module.exports = mongoose.model('AssetTagMapping', assetTagMappingSchema);
