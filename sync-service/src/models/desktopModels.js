const { desktopConnection } = require('../config/database');

// Desktop Database Models (Target Database) - Enhanced for management

// Enhanced User model for desktop
const desktopUserSchema = new desktopConnection.Schema({
  // Original mobile fields
  mobileUserId: { type: String, required: true, unique: true }, // Original _id from mobile
  department: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  
  // Desktop management fields
  isActive: { type: Boolean, default: true },
  role: { type: String, enum: ['technician', 'admin', 'manager'], default: 'technician' },
  lastLogin: { type: Date },
  totalSessions: { type: Number, default: 0 },
  totalScans: { type: Number, default: 0 },
  
  // Sync tracking
  lastSynced: { type: Date, default: Date.now },
  syncVersion: { type: Number, default: 1 }
}, { timestamps: true });

// Enhanced TaskSession model for desktop
const desktopTaskSessionSchema = new desktopConnection.Schema({
  // Original mobile fields
  mobileSessionId: { type: String, required: true, unique: true }, // Original _id from mobile
  technician: { type: String, required: true }, // Reference to mobileUserId
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  
  // Desktop management fields
  status: { type: String, enum: ['active', 'completed', 'paused'], default: 'active' },
  duration: { type: Number }, // Duration in milliseconds
  scanCount: { type: Number, default: 0 },
  reparableCount: { type: Number, default: 0 },
  beyondRepairCount: { type: Number, default: 0 },
  healthyCount: { type: Number, default: 0 },
  
  // Sync tracking
  lastSynced: { type: Date, default: Date.now },
  syncVersion: { type: Number, default: 1 }
}, { timestamps: true });

// Enhanced Screen model for desktop
const desktopScreenSchema = new desktopConnection.Schema({
  // Original mobile fields
  mobileScreenId: { type: String, required: true, unique: true }, // Original _id from mobile
  barcode: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['Reparable', 'Beyond Repair', 'Healthy'], 
    required: true
  },
  timestamp: { type: Date, required: true },
  session: { type: String, required: true }, // Reference to mobileSessionId
  
  // Desktop management fields
  technician: { type: String, required: true }, // Reference to mobileUserId
  department: { type: String, required: true },
  actionTaken: { type: String, enum: ['none', 'sent_to_repair', 'sent_to_production', 'write_off'], default: 'none' },
  actionTimestamp: { type: Date },
  notes: { type: String },
  
  // Sync tracking
  lastSynced: { type: Date, default: Date.now },
  syncVersion: { type: Number, default: 1 }
}, { timestamps: true });

// Statistics model for aggregated data
const statisticsSchema = new desktopConnection.Schema({
  date: { type: Date, required: true, unique: true },
  totalScans: { type: Number, default: 0 },
  totalReparable: { type: Number, default: 0 },
  totalBeyondRepair: { type: Number, default: 0 },
  totalHealthy: { type: Number, default: 0 },
  totalSessions: { type: Number, default: 0 },
  activeTechnicians: { type: Number, default: 0 },
  
  // Department breakdown
  departmentStats: [{
    department: { type: String, required: true },
    scans: { type: Number, default: 0 },
    reparable: { type: Number, default: 0 },
    beyondRepair: { type: Number, default: 0 },
    healthy: { type: Number, default: 0 },
    sessions: { type: Number, default: 0 }
  }],
  
  // Sync tracking
  lastSynced: { type: Date, default: Date.now },
  syncVersion: { type: Number, default: 1 }
}, { timestamps: true });

// Sync log model for tracking sync operations
const syncLogSchema = new desktopConnection.Schema({
  operation: { type: String, required: true }, // 'full_sync', 'incremental_sync', 'user_sync', etc.
  status: { type: String, enum: ['success', 'error', 'partial'], required: true },
  recordsProcessed: { type: Number, default: 0 },
  recordsCreated: { type: Number, default: 0 },
  recordsUpdated: { type: Number, default: 0 },
  recordsDeleted: { type: Number, default: 0 },
  errorMessage: { type: String },
  duration: { type: Number }, // Duration in milliseconds
  metrics: { type: desktopConnection.Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now }
});

const IDENTIFIER_TYPES = ['RFID', 'EPC', 'BARCODE', 'QR', 'NFC'];

const desktopSectionSchema = new desktopConnection.Schema({
  sourceSectionId: { type: String, required: true, unique: true },
  section: { type: String, required: true, index: true },
  manager: { type: String },
  description: { type: String },
  createdBy: { type: String },
  createdAtSource: { type: Date },
  updatedAtSource: { type: Date },
  lastSynced: { type: Date, default: Date.now },
  syncVersion: { type: Number, default: 1 },
}, { timestamps: true });

const desktopAssetSchema = new desktopConnection.Schema({
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
}, { timestamps: true });

const desktopAssetIdentifierSchema = new desktopConnection.Schema({
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
}, { timestamps: true });

const desktopAssetHistorySchema = new desktopConnection.Schema({
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
  payload: { type: desktopConnection.Schema.Types.Mixed },
  lastSynced: { type: Date, default: Date.now },
  syncVersion: { type: Number, default: 1 },
}, { timestamps: true });

const desktopAssetVerificationSchema = new desktopConnection.Schema({
  sourceVerificationId: { type: String, required: true, unique: true },
  sourceAssetId: { type: String, required: true, index: true },
  section: { type: String, index: true },
  result: { type: String, index: true },
  auditId: { type: String, index: true },
  verifiedAt: { type: Date, index: true },
  verifiedBy: { type: String, index: true },
  payload: { type: desktopConnection.Schema.Types.Mixed },
  lastSynced: { type: Date, default: Date.now },
  syncVersion: { type: Number, default: 1 },
}, { timestamps: true });

const desktopAssetTransferSchema = new desktopConnection.Schema({
  sourceTransferId: { type: String, required: true, unique: true },
  sourceAssetId: { type: String, required: true, index: true },
  fromSection: { type: String, index: true },
  toSection: { type: String, index: true },
  transferType: { type: String, index: true },
  eventAt: { type: Date, index: true },
  actorId: { type: String, index: true },
  reason: { type: String },
  batchId: { type: String },
  payload: { type: desktopConnection.Schema.Types.Mixed },
  lastSynced: { type: Date, default: Date.now },
  syncVersion: { type: Number, default: 1 },
}, { timestamps: true });

const desktopRFIDEventSchema = new desktopConnection.Schema({
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
}, { timestamps: true });

// Export models
const DesktopUser = desktopConnection.model('User', desktopUserSchema);
const DesktopTaskSession = desktopConnection.model('TaskSession', desktopTaskSessionSchema);
const DesktopScreen = desktopConnection.model('Screen', desktopScreenSchema);
const Statistics = desktopConnection.model('Statistics', statisticsSchema);
const SyncLog = desktopConnection.model('SyncLog', syncLogSchema);
const DesktopSection = desktopConnection.model('Section', desktopSectionSchema);
const DesktopAsset = desktopConnection.model('Asset', desktopAssetSchema);
const DesktopAssetIdentifier = desktopConnection.model('AssetIdentifier', desktopAssetIdentifierSchema);
const DesktopAssetHistory = desktopConnection.model('AssetHistory', desktopAssetHistorySchema);
const DesktopAssetVerification = desktopConnection.model('AssetVerification', desktopAssetVerificationSchema);
const DesktopAssetTransfer = desktopConnection.model('AssetTransfer', desktopAssetTransferSchema);
const DesktopRFIDEvent = desktopConnection.model('RFIDEvent', desktopRFIDEventSchema);

module.exports = {
  DesktopUser,
  DesktopTaskSession,
  DesktopScreen,
  Statistics,
  SyncLog,
  DesktopSection,
  DesktopAsset,
  DesktopAssetIdentifier,
  DesktopAssetHistory,
  DesktopAssetVerification,
  DesktopAssetTransfer,
  DesktopRFIDEvent
};

