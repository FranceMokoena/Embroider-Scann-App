"use strict";

const mongoose = require('mongoose');

const EPC_REGEX = /^[A-Z0-9]{12,24}$/;
const STATUS_VALUES = ['Healthy', 'Repairable', 'Beyond Repair'];

const trimString = value => (typeof value === 'string' ? value.trim() : value);
const normalizeEpc = value => {
  if (typeof value !== 'string') return value;
  return value.trim().toUpperCase();
};

const assetSchema = new mongoose.Schema({
  assetName: {
    type: String,
    required: true,
    set: trimString,
  },
  assetNumber: {
    type: String,
    required: true,
    unique: true,
    set: trimString,
  },
  serialNumber: {
    type: String,
    set: trimString,
    default: undefined,
  },
  epc: {
    type: String,
    required: true,
    unique: true,
    set: normalizeEpc,
    match: [EPC_REGEX, 'EPC must be 12-24 alphanumeric characters'],
  },
  section: {
    type: String,
    set: trimString,
    default: undefined,
    index: true,
  },
  currentSection: {
    type: String,
    set: trimString,
    default: undefined,
    index: true,
  },
  // Legacy fields retained only so existing MongoDB documents can be migrated/read safely.
  category: {
    type: String,
    set: trimString,
    default: undefined,
  },
  status: {
    type: String,
    enum: STATUS_VALUES,
    default: undefined,
  },
  verificationStatus: {
    type: String,
    set: trimString,
    default: undefined,
  },
  verifiedAt: {
    type: Date,
    default: undefined,
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: undefined,
  },
  location: {
    type: String,
    set: trimString,
    default: undefined,
  },
  assignedTo: {
    type: String,
    set: trimString,
    default: undefined,
  },
  assignmentInformation: {
    assignedAt: { type: Date },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    source: { type: String, set: trimString },
  },
  statusHistory: [{
    previousStatus: { type: String, set: trimString },
    newStatus: { type: String, set: trimString, required: true },
    changedAt: { type: Date, default: () => new Date() },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    source: { type: String, set: trimString },
    reason: { type: String, set: trimString },
    batchId: { type: String, set: trimString },
  }],
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: undefined,
  },
  assignmentLifecycleHistory: [{
    fromSection: { type: String, set: trimString },
    toSection: { type: String, set: trimString, required: true },
    assignedAt: { type: Date, default: () => new Date() },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    source: { type: String, set: trimString },
    transferType: { type: String, set: trimString },
    reason: { type: String, set: trimString },
    batchId: { type: String, set: trimString },
  }],
  verificationHistory: [{
    section: { type: String, set: trimString },
    currentSection: { type: String, set: trimString },
    expectedSection: { type: String, set: trimString },
    scannedSection: { type: String, set: trimString },
    result: { type: String, set: trimString },
    auditId: { type: String, set: trimString },
    epc: { type: String, set: normalizeEpc },
    source: { type: String, set: trimString },
    verifiedAt: { type: Date, default: () => new Date() },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],
  schemaVersion: {
    type: Number,
    default: 2,
    index: true,
  },
  migrationMetadata: {
    currentSectionBackfilledAt: { type: Date },
    legacySectionSource: { type: String, set: trimString },
  },
}, { timestamps: true });

assetSchema.index({ currentSection: 1, status: 1 });
assetSchema.index({ currentSection: 1, verificationStatus: 1 });

assetSchema.pre('validate', function syncCurrentSection(next) {
  const canonicalSection = trimString(this.currentSection) || trimString(this.section);
  if (canonicalSection) {
    this.currentSection = canonicalSection;
    this.section = canonicalSection;
  }
  this.schemaVersion = Math.max(Number(this.schemaVersion || 0), 2);
  next();
});

module.exports = mongoose.model('Asset', assetSchema);
