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
//# sourceMappingURL=scanController.js.map