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

// Export models
const MobileUser = mobileConnection.model('User', mobileUserSchema);
const MobileTaskSession = mobileConnection.model('TaskSession', mobileTaskSessionSchema);
const MobileScreen = mobileConnection.model('Screen', mobileScreenSchema);

module.exports = {
  MobileUser,
  MobileTaskSession,
  MobileScreen
};

