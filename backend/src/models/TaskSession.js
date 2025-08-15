"use strict";

const mongoose = require('mongoose');
const taskSessionSchema = new mongoose.Schema({
    technician: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startTime: { type: Date, default: () => new Date() },
    endTime: { type: Date },
}, { timestamps: true });

// Add virtual field for scans
taskSessionSchema.virtual('scans', {
    ref: 'Screen',
    localField: '_id',
    foreignField: 'session'
});

// Ensure virtuals are included when converting to JSON
taskSessionSchema.set('toJSON', { virtuals: true });
taskSessionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('TaskSession', taskSessionSchema);