"use strict";

const mongoose = require('mongoose');
const productionScreenSchema = new mongoose.Schema({
    barcode: { type: String, required: true },
    originalStatus: { 
        type: String, 
        enum: ['Reparable', 'Beyond Repair', 'Healthy'], 
        required: true
    },
    actionType: { 
        type: String, 
        enum: ['REPAIR', 'PRODUCTION', 'WRITE_OFF'], 
        required: true
    },
    technician: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    originalSession: { type: mongoose.Schema.Types.ObjectId, ref: 'TaskSession', required: true },
    originalScanTimestamp: { type: Date, required: true },
    actionTimestamp: { type: Date, default: () => new Date() },
    notes: { type: String },
    department: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('ProductionScreen', productionScreenSchema);
