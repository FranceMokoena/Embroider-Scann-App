import mongoose from 'mongoose';
import { desktopConnection } from '../config/desktopDatabase.js';

const IDENTIFIER_TYPES = ['RFID', 'EPC', 'BARCODE', 'QR', 'NFC'];

const schemaOptions = {
  timestamps: true,
  bufferCommands: false,
};

const desktopAssetSchema = new mongoose.Schema({
  sourceAssetId: { type: String, required: true, unique: true },
  assetNumber: { type: String, index: true },
  assetName: { type: String, index: true },
  status: { type: String, index: true },
  sourceStatus: { type: String },
  currentSection: { type: String, index: true },
  section: { type: String, index: true },
  technician: { type: String, index: true },
  currentLocation: { type: String, index: true },
  verificationState: { type: String, index: true },
  repairState: { type: String, index: true },
  transferState: { type: String },
  lastSeenAt: { type: Date, index: true },
  sourceDeleted: { type: Boolean, default: false, index: true },
  deletedAtSource: { type: Date },
  createdAtSource: { type: Date },
  updatedAtSource: { type: Date, index: true },
  lastSynced: { type: Date, default: Date.now },
  syncVersion: { type: Number, default: 1 },
}, schemaOptions);

desktopAssetSchema.index({ status: 1, section: 1 });
desktopAssetSchema.index({ status: 1, currentSection: 1 });
desktopAssetSchema.index({ technician: 1, status: 1 });
desktopAssetSchema.index({ section: 1, verificationState: 1 });
desktopAssetSchema.index({ currentSection: 1, verificationState: 1 });
desktopAssetSchema.index({ updatedAtSource: -1, sourceAssetId: 1 });
desktopAssetSchema.index({ sourceDeleted: 1, updatedAtSource: -1 });

const desktopAssetIdentifierSchema = new mongoose.Schema({
  sourceIdentifierKey: { type: String, required: true, unique: true },
  sourceAssetId: { type: String, index: true },
  type: { type: String, enum: IDENTIFIER_TYPES, required: true, index: true },
  value: { type: String, required: true },
  valueNormalized: { type: String, required: true, index: true },
  active: { type: Boolean, default: true, index: true },
  source: { type: String },
  sourceTagId: { type: String },
  sourceMappingId: { type: String },
  firstSeenAt: { type: Date },
  lastSeenAt: { type: Date, index: true },
  assignedAt: { type: Date },
  unassignedAt: { type: Date },
  managedBy: { type: String, default: 'asset-sync-service', index: true },
  lastSynced: { type: Date, default: Date.now },
  syncVersion: { type: Number, default: 1 },
}, schemaOptions);

desktopAssetIdentifierSchema.index({ type: 1, valueNormalized: 1, active: 1 });
desktopAssetIdentifierSchema.index({ sourceAssetId: 1, active: 1 });
desktopAssetIdentifierSchema.index({ sourceAssetId: 1, type: 1 });

const desktopAssetHistorySchema = new mongoose.Schema({
  sourceHistoryId: { type: String, required: true, unique: true },
  sourceAssetId: { type: String, required: true, index: true },
  historyType: { type: String, enum: ['status', 'transfer', 'verification', 'assignment', 'general'], required: true, index: true },
  previousStatus: { type: String },
  newStatus: { type: String },
  fromSection: { type: String },
  toSection: { type: String },
  section: { type: String },
  result: { type: String },
  auditId: { type: String, index: true },
  transferType: { type: String },
  eventAt: { type: Date, index: true },
  actorId: { type: String, index: true },
  source: { type: String },
  reason: { type: String },
  batchId: { type: String },
  payload: { type: mongoose.Schema.Types.Mixed },
  lastSynced: { type: Date, default: Date.now },
  syncVersion: { type: Number, default: 1 },
}, schemaOptions);

desktopAssetHistorySchema.index({ sourceAssetId: 1, eventAt: -1 });
desktopAssetHistorySchema.index({ historyType: 1, eventAt: -1 });
desktopAssetHistorySchema.index({ actorId: 1, eventAt: -1 });

const desktopAssetVerificationSchema = new mongoose.Schema({
  sourceVerificationId: { type: String, required: true, unique: true },
  sourceAssetId: { type: String, required: true, index: true },
  section: { type: String, index: true },
  result: { type: String, index: true },
  auditId: { type: String, index: true },
  verifiedAt: { type: Date, index: true },
  verifiedBy: { type: String, index: true },
  payload: { type: mongoose.Schema.Types.Mixed },
  lastSynced: { type: Date, default: Date.now },
  syncVersion: { type: Number, default: 1 },
}, schemaOptions);

desktopAssetVerificationSchema.index({ sourceAssetId: 1, verifiedAt: -1 });
desktopAssetVerificationSchema.index({ section: 1, result: 1, verifiedAt: -1 });
desktopAssetVerificationSchema.index({ verifiedBy: 1, verifiedAt: -1 });

const desktopAssetTransferSchema = new mongoose.Schema({
  sourceTransferId: { type: String, required: true, unique: true },
  sourceAssetId: { type: String, required: true, index: true },
  fromSection: { type: String, index: true },
  toSection: { type: String, index: true },
  transferType: { type: String, index: true },
  eventAt: { type: Date, index: true },
  actorId: { type: String, index: true },
  reason: { type: String },
  batchId: { type: String },
  payload: { type: mongoose.Schema.Types.Mixed },
  lastSynced: { type: Date, default: Date.now },
  syncVersion: { type: Number, default: 1 },
}, schemaOptions);

desktopAssetTransferSchema.index({ sourceAssetId: 1, eventAt: -1 });
desktopAssetTransferSchema.index({ toSection: 1, eventAt: -1 });
desktopAssetTransferSchema.index({ actorId: 1, eventAt: -1 });

const desktopRFIDEventSchema = new mongoose.Schema({
  sourceEventId: { type: String, required: true, unique: true },
  sourceAssetId: { type: String, index: true },
  sourceTagId: { type: String, index: true },
  epcRaw: { type: String },
  epcKey: { type: String, index: true },
  readerSessionId: { type: String, index: true },
  deviceId: { type: String, index: true },
  source: { type: String },
  screen: { type: String },
  mappingStatus: { type: String, index: true },
  duplicateSuppressed: { type: Boolean, default: false, index: true },
  suppressionReason: { type: String },
  idempotencyKey: { type: String, index: true },
  userId: { type: String, index: true },
  readTimestamp: { type: Date },
  eventTimestamp: { type: Date, index: true },
  serverReceivedAt: { type: Date },
  lastSynced: { type: Date, default: Date.now },
  syncVersion: { type: Number, default: 1 },
}, schemaOptions);

desktopRFIDEventSchema.index({ sourceAssetId: 1, eventTimestamp: -1 });
desktopRFIDEventSchema.index({ readerSessionId: 1, eventTimestamp: -1 });
desktopRFIDEventSchema.index({ epcKey: 1, eventTimestamp: -1 });
desktopRFIDEventSchema.index({ mappingStatus: 1, eventTimestamp: -1 });

const desktopSectionSchema = new mongoose.Schema({
  sourceSectionId: { type: String, required: true, unique: true },
  section: { type: String, required: true, index: true },
  manager: { type: String },
  description: { type: String },
  createdBy: { type: String },
  createdAtSource: { type: Date },
  updatedAtSource: { type: Date },
  lastSynced: { type: Date, default: Date.now },
  syncVersion: { type: Number, default: 1 },
}, schemaOptions);

export const DesktopAsset = desktopConnection.model('Asset', desktopAssetSchema);
export const DesktopAssetIdentifier = desktopConnection.model('AssetIdentifier', desktopAssetIdentifierSchema);
export const DesktopAssetHistory = desktopConnection.model('AssetHistory', desktopAssetHistorySchema);
export const DesktopAssetVerification = desktopConnection.model('AssetVerification', desktopAssetVerificationSchema);
export const DesktopAssetTransfer = desktopConnection.model('AssetTransfer', desktopAssetTransferSchema);
export const DesktopRFIDEvent = desktopConnection.model('RFIDEvent', desktopRFIDEventSchema);
export const DesktopSection = desktopConnection.model('Section', desktopSectionSchema);

export const createAssetReadModelIndexes = async () => Promise.all([
  DesktopAsset.createIndexes(),
  DesktopAssetIdentifier.createIndexes(),
  DesktopAssetHistory.createIndexes(),
  DesktopAssetVerification.createIndexes(),
  DesktopAssetTransfer.createIndexes(),
  DesktopRFIDEvent.createIndexes(),
  DesktopSection.createIndexes(),
]);
