"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addScan = void 0;
const Screen_1 = __importDefault(require("../models/Screen"));
const TaskSession_1 = __importDefault(require("../models/TaskSession"));
const addScan = async (req, res) => {
    try {
        const userId = req.userId;
        const { barcode, status, sessionId } = req.body;
        if (!barcode || !status || !sessionId) {
            return res.status(400).json({ error: 'barcode, status, and sessionId are required' });
        }
        const session = await TaskSession_1.default.findOne({ _id: sessionId, technician: userId });
        if (!session)
            return res.status(404).json({ error: 'Session not found or not yours' });
        const screen = await Screen_1.default.create({ barcode, status, timestamp: new Date(), session: sessionId });
        return res.status(201).json(screen);
    }
    catch (err) {
        console.error('❌ addScan error:', err);
        return res.status(500).json({ error: 'Could not add scan', details: err.message });
    }
};
exports.addScan = addScan;
const getUserScans = async (req, res) => {
    try {
        const userId = req.userId;
        // Get all sessions for this user
        const sessions = await TaskSession_1.default.find({ technician: userId }).sort({ createdAt: -1 });
        
        if (!sessions.length) {
            return res.json({ sessions: [], totalScans: 0 });
        }
        
        // Get all screens for these sessions
        const sessionIds = sessions.map(session => session._id);
        const screens = await Screen_1.default.find({ session: { $in: sessionIds } })
            .populate('session')
            .sort({ timestamp: -1 });
        
        // Group screens by session
        const sessionsWithScans = sessions.map(session => {
            const sessionScans = screens.filter(screen => 
                screen.session._id.toString() === session._id.toString()
            );
            
            const reparable = sessionScans.filter(scan => scan.status === 'Reparable').length;
            const beyondRepair = sessionScans.filter(scan => scan.status === 'Beyond Repair').length;
            
            return {
                id: session._id,
                startTime: session.startTime,
                endTime: session.endTime,
                totalScans: sessionScans.length,
                reparable,
                beyondRepair,
                scans: sessionScans.map(scan => ({
                    id: scan._id,
                    barcode: scan.barcode,
                    status: scan.status,
                    timestamp: scan.timestamp
                }))
            };
        });
        
        const totalScans = screens.length;
        const totalReparable = screens.filter(scan => scan.status === 'Reparable').length;
        const totalBeyondRepair = screens.filter(scan => scan.status === 'Beyond Repair').length;
        
        return res.json({
            sessions: sessionsWithScans,
            totalScans,
            totalReparable,
            totalBeyondRepair
        });
    }
    catch (err) {
        console.error('❌ getUserScans error:', err);
        return res.status(500).json({ error: 'Could not get scan history', details: err.message });
    }
};
exports.getUserScans = getUserScans;
//# sourceMappingURL=scanController.js.map