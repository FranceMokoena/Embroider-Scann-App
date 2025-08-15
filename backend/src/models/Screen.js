"use strict";

const mongoose = require('mongoose');
const screenSchema = new mongoose.Schema({
    barcode: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['Reparable', 'Beyond Repair', 'Healthy'], 
        required: true
    },
    timestamp: { type: Date, default: () => new Date() },
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'TaskSession', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Screen', screenSchema);