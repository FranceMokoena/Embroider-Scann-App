const { mobileConnection } = require('../config/database');

// Mobile App Models (Source Database)
const mobileUserSchema = new mobileConnection.Schema({
  department: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
}, { timestamps: true });

const mobileTaskSessionSchema = new mobileConnection.Schema({
  technician: { type: mobileConnection.Schema.Types.ObjectId, ref: 'User', required: true },
  startTime: { type: Date, default: () => new Date() },
  endTime: { type: Date },
}, { timestamps: true });

// Add virtual field for scans
mobileTaskSessionSchema.virtual('scans', {
  ref: 'Screen',
  localField: '_id',
  foreignField: 'session'
});

// Ensure virtuals are included when converting to JSON
mobileTaskSessionSchema.set('toJSON', { virtuals: true });
mobileTaskSessionSchema.set('toObject', { virtuals: true });

const mobileScreenSchema = new mobileConnection.Schema({
  barcode: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['Reparable', 'Beyond Repair', 'Healthy'], 
    required: true
  },
  timestamp: { type: Date, default: () => new Date() },
  session: { type: mobileConnection.Schema.Types.ObjectId, ref: 'TaskSession', required: true },
}, { timestamps: true });

const mobileAssetSchema = new mobileConnection.Schema({
  assetName: { type: String },
  assetNumber: { type: String },
  serialNumber: { type: String },
  epc: { type: String },
  currentSection: { type: String },
  section: { type: String },
  category: { type: String },
  location: { type: String },
  status: { type: String },
  verificationStatus: { type: String },
  verifiedAt: { type: Date },
  verifiedBy: { type: mobileConnection.Schema.Types.ObjectId, ref: 'User' },
  assignedTo: { type: String },
  assignmentInformation: {
    assignedAt: { type: Date },
    assignedBy: { type: mobileConnection.Schema.Types.ObjectId, ref: 'User' },
    source: { type: String },
  },
  statusHistory: { type: [mobileConnection.Schema.Types.Mixed], default: [] },
  assignmentLifecycleHistory: { type: [mobileConnection.Schema.Types.Mixed], default: [] },
  verificationHistory: { type: [mobileConnection.Schema.Types.Mixed], default: [] },
}, { timestamps: true, strict: false });

const mobileRFIDTagSchema = new mobileConnection.Schema({
  epcRaw: { type: String },
  epcKey: { type: String },
  tid: { type: String },
  status: { type: String },
  firstSeenAt: { type: Date },
  lastSeenAt: { type: Date },
  createdBy: { type: String },
  updatedBy: { type: String },
}, { timestamps: true, strict: false });

const mobileAssetTagMappingSchema = new mobileConnection.Schema({
  assetId: { type: mobileConnection.Schema.Types.ObjectId, ref: 'Asset' },
  rfidTagId: { type: mobileConnection.Schema.Types.ObjectId, ref: 'RFIDTag' },
  epcRawSnapshot: { type: String },
  status: { type: String },
  assignedAt: { type: Date },
  assignedBy: { type: String },
  unassignedAt: { type: Date },
  unassignedBy: { type: String },
  reason: { type: String },
  notes: { type: String },
}, { timestamps: true, strict: false });

const mobileTagScanLogSchema = new mobileConnection.Schema({
  epcRaw: { type: String },
  epcKey: { type: String },
  rfidTagId: { type: mobileConnection.Schema.Types.ObjectId, ref: 'RFIDTag' },
  assetId: { type: mobileConnection.Schema.Types.ObjectId, ref: 'Asset' },
  deviceId: { type: String },
  readerSessionId: { type: String },
  source: { type: String },
  screen: { type: String },
  mappingStatus: { type: String },
  duplicateSuppressed: { type: Boolean },
  suppressionReason: { type: String },
  idempotencyKey: { type: String },
  userId: { type: String },
  readTimestamp: { type: Date },
  serverReceivedAt: { type: Date },
  timestamp: { type: Date },
}, { timestamps: true, strict: false });

const mobileSectionSchema = new mobileConnection.Schema({
  section: { type: String },
  manager: { type: String },
  description: { type: String },
  createdBy: { type: mobileConnection.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, strict: false });

// Export models
const MobileUser = mobileConnection.model('User', mobileUserSchema);
const MobileTaskSession = mobileConnection.model('TaskSession', mobileTaskSessionSchema);
const MobileScreen = mobileConnection.model('Screen', mobileScreenSchema);
const MobileAsset = mobileConnection.model('Asset', mobileAssetSchema);
const MobileRFIDTag = mobileConnection.model('RFIDTag', mobileRFIDTagSchema);
const MobileAssetTagMapping = mobileConnection.model('AssetTagMapping', mobileAssetTagMappingSchema);
const MobileTagScanLog = mobileConnection.model('TagScanLog', mobileTagScanLogSchema);
const MobileSection = mobileConnection.model('Section', mobileSectionSchema);

module.exports = {
  MobileUser,
  MobileTaskSession,
  MobileScreen,
  MobileAsset,
  MobileRFIDTag,
  MobileAssetTagMapping,
  MobileTagScanLog,
  MobileSection
};

