"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopSession = exports.startSession = void 0;
const TaskSession_1 = __importDefault(require("../models/TaskSession"));
const Screen_1 = __importDefault(require("../models/Screen"));
const startSession = async (req, res) => {
    try {
        const userId = req.userId;
        const session = await TaskSession_1.default.create({ technician: userId, startTime: new Date() });
        return res.status(201).json({ sessionId: session._id, startTime: session.startTime });
    }
    catch (err) {
        console.error('❌ startSession error:', err);
        return res.status(500).json({ error: 'Could not start session', details: err.message });
    }
};
exports.startSession = startSession;
const stopSession = async (req, res) => {
    try {
        const userId = req.userId;
        const { sessionId } = req.body;
        if (!sessionId)
            return res.status(400).json({ error: 'sessionId is required' });
        const session = await TaskSession_1.default.findOneAndUpdate({ _id: sessionId, technician: userId }, { endTime: new Date() }, { new: true });
        if (!session)
            return res.status(404).json({ error: 'Session not found or not yours' });
        const scans = await Screen_1.default.find({ session: sessionId });
        const total = scans.length;
        const reparable = scans.filter(s => s.status === 'Reparable').length;
        const durationMs = session.endTime.getTime() - session.startTime.getTime();
        return res.json({
            sessionId,
            startTime: session.startTime,
            endTime: session.endTime,
            durationMs,
            totalScans: total,
            reparable,
            beyond: total - reparable
        });
    }
    catch (err) {
        console.error('❌ stopSession error:', err);
        return res.status(500).json({ error: 'Could not stop session', details: err.message });
    }
};
exports.stopSession = stopSession;
//# sourceMappingURL=sessionController.js.map