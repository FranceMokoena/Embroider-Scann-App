"use strict";
const Screen = require("../models/Screen");
const TaskSession = require("../models/TaskSession");

/**
 * Add a new scan (mobile app)
 */
const addScan = async (req, res) => {
  try {
    const { barcode, status, sessionId } = req.body;
    const userId = req.userId;

    if (!barcode || !status || !sessionId) {
      return res.status(400).json({ 
        error: 'Missing required fields: barcode, status, and sessionId are required' 
      });
    }

    const validStatuses = ['Reparable', 'Beyond Repair', 'Healthy'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }

    const session = await TaskSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    if (session.technician.toString() !== userId) {
      return res.status(403).json({ error: 'Access denied to this session' });
    }

    const newScan = new Screen({
      barcode,
      status,
      session: sessionId,
      timestamp: new Date()
    });

    await newScan.save();

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
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get scans for logged-in user (mobile app)
 */
const getUserScans = async (req, res) => {
  try {
    const userId = req.userId;

    const sessions = await TaskSession.find({ technician: userId })
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
    console.error('❌ Error fetching user scan history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get all scans for all technicians (desktop/admin)
 */
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

    const sessions = await TaskSession.find(sessionFilter)
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

/**
 * Notify screen action
 */
const notifyScreenAction = async (req, res) => {
  try {
    const { barcode, status, actionType, scannedAt, sessionId } = req.body;

    if (!barcode || !status || !actionType || !scannedAt) {
      return res.status(400).json({
        error: 'Missing required fields: barcode, status, actionType, scannedAt'
      });
    }

    console.log('📣 Screen action notification:', {
      userId: req.userId,
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

/**
 * Delete multiple screens
 */
const deleteScreens = async (req, res) => {
  try {
    const { barcodes } = req.body;

    if (!barcodes || !Array.isArray(barcodes) || barcodes.length === 0) {
      return res.status(400).json({
        error: 'Missing or invalid barcodes array'
      });
    }

    const deletedScreens = await Screen.deleteMany({
      barcode: { $in: barcodes },
      session: {
        $in: await TaskSession.find({ technician: req.userId }).distinct('_id')
      }
    });

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

module.exports = {
  addScan,
  getUserScans,
  getAllScans,
  notifyScreenAction,
  deleteScreens
};
