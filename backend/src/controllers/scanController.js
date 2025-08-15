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

// Get all scans for all technicians (admin only)
const getAllScans = async (req, res) => {
  try {
    const { department, startDate, endDate, technician } = req.query;

    const sessionFilter = {};
    if (department) sessionFilter.department = department;
    if (technician) sessionFilter.technicianName = new RegExp(technician, 'i');
    if (startDate || endDate) {
      sessionFilter.startTime = {};
      if (startDate) sessionFilter.startTime.$gte = new Date(startDate);
      if (endDate) sessionFilter.startTime.$lte = new Date(endDate);
    }

    const sessions = await TaskSession_1.default.find(sessionFilter)
      .sort({ startTime: -1 })
      .populate({
        path: 'scans',
        model: 'Screen',
        select: 'barcode status timestamp'
      });

    let totalScans = 0, totalReparable = 0, totalBeyondRepair = 0, totalHealthy = 0;

    sessions.forEach(session => {
      if (session.scans) {
        totalScans += session.scans.length;
        session.scans.forEach(scan => {
          if (scan.status === 'Reparable') totalReparable++;
          if (scan.status === 'Beyond Repair') totalBeyondRepair++;
          if (scan.status === 'Healthy') totalHealthy++;
        });
      }
    });

    res.json({
      sessions: sessions.map(s => ({
        id: s._id,
        technician: s.technician,
        startTime: s.startTime,
        endTime: s.endTime,
        scans: s.scans || []
      })),
      totalScans,
      totalReparable,
      totalBeyondRepair,
      totalHealthy
    });

  } catch (error) {
    console.error('❌ Error fetching all scans:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getAllScans = getAllScans;

// Notify admin about a screen action (send for repair / send to production / write off)
const notifyScreenAction = async (req, res) => {
  try {
    const userId = req.userId;
    const { barcode, status, actionType, scannedAt, sessionId } = req.body;

    if (!barcode || !status || !actionType || !scannedAt) {
      return res.status(400).json({
        error: 'Missing required fields: barcode, status, actionType, scannedAt'
      });
    }

    // Very lightweight implementation for now: just log the action.
    // Later this can be persisted and/or broadcast to desktop admin app.
    console.log('📣 Screen action notification:', {
      userId,
      barcode,
      status,
      actionType,
      scannedAt,
      sessionId: sessionId || null
    });

    return res.status(200).json({
      message: 'Notification received',
      received: { barcode, status, actionType, scannedAt, sessionId: sessionId || null }
    });

  } catch (error) {
    console.error('❌ Error notifying screen action:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.notifyScreenAction = notifyScreenAction;

// Delete multiple screens by barcodes
const deleteScreens = async (req, res) => {
  try {
    const userId = req.userId;
    const { barcodes } = req.body;

    if (!barcodes || !Array.isArray(barcodes) || barcodes.length === 0) {
      return res.status(400).json({
        error: 'Missing or invalid barcodes array'
      });
    }

    console.log('🗑️ Delete screens request:', { userId, barcodes });

    // Find and delete screens that belong to the user's sessions
    const deletedScreens = await Screen_1.default.deleteMany({
      barcode: { $in: barcodes },
      session: {
        $in: await TaskSession_1.default.find({ technician: userId }).distinct('_id')
      }
    });

    console.log(`✅ Deleted ${deletedScreens.deletedCount} screens for user ${userId}`);

    return res.status(200).json({
      message: 'Screens deleted successfully',
      deletedCount: deletedScreens.deletedCount,
      requestedCount: barcodes.length
    });

  } catch (error) {
    console.error('❌ Error deleting screens:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.deleteScreens = deleteScreens;
