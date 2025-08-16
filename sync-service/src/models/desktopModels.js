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
  timestamp: { type: Date, default: Date.now }
});

// Export models
const DesktopUser = desktopConnection.model('User', desktopUserSchema);
const DesktopTaskSession = desktopConnection.model('TaskSession', desktopTaskSessionSchema);
const DesktopScreen = desktopConnection.model('Screen', desktopScreenSchema);
const Statistics = desktopConnection.model('Statistics', statisticsSchema);
const SyncLog = desktopConnection.model('SyncLog', syncLogSchema);

module.exports = {
  DesktopUser,
  DesktopTaskSession,
  DesktopScreen,
  Statistics,
  SyncLog
};

