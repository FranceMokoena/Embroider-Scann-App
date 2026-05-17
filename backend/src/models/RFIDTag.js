"use strict";

const mongoose = require('mongoose');

const RFID_TAG_STATUSES = ['unassigned', 'assigned', 'retired', 'lost', 'damaged'];

const rfidTagSchema = new mongoose.Schema({
  epcRaw: {
    type: String,
    required: true,
    unique: true,
    index: true,
    immutable: true,
  },
  epcKey: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  tid: {
    type: String,
    default: undefined,
  },
  status: {
    type: String,
    enum: RFID_TAG_STATUSES,
    default: 'unassigned',
    index: true,
  },
  firstSeenAt: {
    type: Date,
    default: () => new Date(),
  },
  lastSeenAt: {
    type: Date,
    default: () => new Date(),
  },
  createdBy: {
    type: String,
    default: undefined,
  },
  updatedBy: {
    type: String,
    default: undefined,
  },
}, { timestamps: true });

module.exports = mongoose.model('RFIDTag', rfidTagSchema);
