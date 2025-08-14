"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Screen_1 = require("../models/Screen");
const TaskSession_1 = require("../models/TaskSession");

// Add a new scan
const addScan = async (req, res) => {
  try {
    const { barcode, status, sessionId } = req.body;
    const userId = req.userId;
    
    console.log('🔍 Received scan request:', { barcode, status, sessionId, userId, statusType: typeof status, statusLength: status ? status.length : 0 });

    // Validate required fields
    if (!barcode || !status || !sessionId) {
      return res.status(400).json({ 
        error: 'Missing required fields: barcode, status, and sessionId are required' 
      });
    }

    // Validate status
    const validStatuses = ['Reparable', 'Beyond Repair', 'Healthy'];
    console.log('🔍 Validating status:', { status, validStatuses, isValid: validStatuses.includes(status) });
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }

    // Verify session exists and belongs to user
    const session = await TaskSession_1.default.findById(sessionId);
    console.log('🔍 Session validation:', { sessionId, session: session ? 'found' : 'not found', userId });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    console.log('🔍 Session ownership check:', { sessionTechnician: session.technician.toString(), userId, match: session.technician.toString() === userId });
    if (session.technician.toString() !== userId) {
      return res.status(403).json({ error: 'Access denied to this session' });
    }

    // Create new screen scan
    const newScan = new Screen_1.default({
      barcode,
      status,
      session: sessionId,
      timestamp: new Date()
    });

    console.log('🔍 Attempting to save scan:', { barcode, status, sessionId });
    await newScan.save();

    console.log(`✅ Scan saved: ${barcode} - ${status}`);

    res.status(201).json({
      message: 'Scan saved successfully',
      scan: {
        id: newScan._id,
        barcode: newScan.barcode,
        status: newScan.status,
        timestamp: newScan.timestamp,
        session: newScan.session
      }
    });

  } catch (error) {
    console.error('❌ Error adding scan:', error);
    console.error('❌ Error details:', { message: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

// Get user's scan history
const getUserScans = async (req, res) => {
  try {
    const userId = req.userId;

    // Get all sessions for the user
    const sessions = await TaskSession_1.default.find({ technician: userId })
      .sort({ startTime: -1 })
      .populate({
        path: 'scans',
        model: 'Screen',
        select: 'barcode status timestamp'
      });

    // Calculate totals
    let totalScans = 0;
    let totalReparable = 0;
    let totalBeyondRepair = 0;
    let totalHealthy = 0;

    sessions.forEach(session => {
      if (session.scans) {
        totalScans += session.scans.length;
        session.scans.forEach(scan => {
          switch (scan.status) {
            case 'Reparable':
              totalReparable++;
              break;
            case 'Beyond Repair':
              totalBeyondRepair++;
              break;
            case 'Healthy':
              totalHealthy++;
              break;
          }
        });
      }
    });

    const historyData = {
      sessions: sessions.map(session => ({
        id: session._id,
        startTime: session.startTime,
        endTime: session.endTime,
        scans: session.scans || []
      })),
      totalScans,
      totalReparable,
      totalBeyondRepair,
      totalHealthy
    };

    console.log(`📊 Scan history fetched for user ${userId}: ${totalScans} total scans`);

    res.json(historyData);

  } catch (error) {
    console.error('❌ Error fetching scan history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.addScan = addScan;
exports.getUserScans = getUserScans;
