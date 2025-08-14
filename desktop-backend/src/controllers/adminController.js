import mobileApiService from '../services/mobileApiService.js';
import moment from 'moment';

// Dashboard Overview
export const getDashboardStats = async (req, res) => {
  try {
    const token = req.headers['mobile-token'];
    if (!token) {
      return res.status(401).json({ error: 'Mobile backend token required' });
    }

    // Get all scans for statistics
    const allScans = await mobileApiService.getAllScans(token);
    const allUsers = await mobileApiService.getAllUsers(token);
    const allSessions = await mobileApiService.getAllSessions(token);

    // Calculate statistics
    const totalScans = allScans.data?.length || 0;
    const totalUsers = allUsers.data?.length || 0;
    const totalSessions = allSessions.data?.length || 0;

    // Status breakdown
    const statusBreakdown = {
      Reparable: 0,
      'Beyond Repair': 0,
      Healthy: 0
    };

    allScans.data?.forEach(scan => {
      if (statusBreakdown[scan.status] !== undefined) {
        statusBreakdown[scan.status]++;
      }
    });

    // Today's activity
    const today = moment().startOf('day');
    const todayScans = allScans.data?.filter(scan => 
      moment(scan.timestamp).isSame(today, 'day')
    ) || [];

    // Weekly activity
    const weekStart = moment().startOf('week');
    const weeklyScans = allScans.data?.filter(scan => 
      moment(scan.timestamp).isSameOrAfter(weekStart)
    ) || [];

    // Department breakdown
    const departmentStats = {};
    allUsers.data?.forEach(user => {
      if (!departmentStats[user.department]) {
        departmentStats[user.department] = { users: 0, scans: 0 };
      }
      departmentStats[user.department].users++;
    });

    // Count scans by department
    allScans.data?.forEach(scan => {
      const user = allUsers.data?.find(u => u._id === scan.userId);
      if (user && departmentStats[user.department]) {
        departmentStats[user.department].scans++;
      }
    });

    const stats = {
      overview: {
        totalScans,
        totalUsers,
        totalSessions,
        todayScans: todayScans.length,
        weeklyScans: weeklyScans.length
      },
      statusBreakdown,
      departmentStats,
      recentActivity: {
        lastScans: allScans.data?.slice(0, 10) || [],
        lastSessions: allSessions.data?.slice(0, 5) || []
      }
    };

    return res.json(stats);
  } catch (error) {
    console.error('❌ Dashboard stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
};

// User Management
export const getAllUsers = async (req, res) => {
  try {
    const token = req.headers['mobile-token'];
    if (!token) {
      return res.status(401).json({ error: 'Mobile backend token required' });
    }

    const { department, q, page = 1, limit = 50 } = req.query;
    const filters = { department, q, page, limit };

    const result = await mobileApiService.getAllUsers(token, filters);
    return res.json(result);
  } catch (error) {
    console.error('❌ Get all users error:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const createUser = async (req, res) => {
  try {
    const token = req.headers['mobile-token'];
    if (!token) {
      return res.status(401).json({ error: 'Mobile backend token required' });
    }

    const result = await mobileApiService.createUser(token, req.body);
    return res.status(201).json(result);
  } catch (error) {
    console.error('❌ Create user error:', error);
    return res.status(500).json({ error: 'Failed to create user' });
  }
};

export const updateUser = async (req, res) => {
  try {
    const token = req.headers['mobile-token'];
    if (!token) {
      return res.status(401).json({ error: 'Mobile backend token required' });
    }

    const { id } = req.params;
    const result = await mobileApiService.updateUser(token, id, req.body);
    return res.json(result);
  } catch (error) {
    console.error('❌ Update user error:', error);
    return res.status(500).json({ error: 'Failed to update user' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const token = req.headers['mobile-token'];
    if (!token) {
      return res.status(401).json({ error: 'Mobile backend token required' });
    }

    const { id } = req.params;
    const result = await mobileApiService.deleteUser(token, id);
    return res.json(result);
  } catch (error) {
    console.error('❌ Delete user error:', error);
    return res.status(500).json({ error: 'Failed to delete user' });
  }
};

// Scan Management
export const getAllScans = async (req, res) => {
  try {
    const token = req.headers['mobile-token'];
    if (!token) {
      return res.status(401).json({ error: 'Mobile backend token required' });
    }

    const { status, department, dateFrom, dateTo, page = 1, limit = 50 } = req.query;
    const filters = { status, department, dateFrom, dateTo, page, limit };

    const result = await mobileApiService.getAllScans(token, filters);
    return res.json(result);
  } catch (error) {
    console.error('❌ Get all scans error:', error);
    return res.status(500).json({ error: 'Failed to fetch scans' });
  }
};

export const getScanById = async (req, res) => {
  try {
    const token = req.headers['mobile-token'];
    if (!token) {
      return res.status(401).json({ error: 'Mobile backend token required' });
    }

    const { id } = req.params;
    const result = await mobileApiService.getScanById(token, id);
    return res.json(result);
  } catch (error) {
    console.error('❌ Get scan error:', error);
    return res.status(500).json({ error: 'Failed to fetch scan' });
  }
};

export const updateScan = async (req, res) => {
  try {
    const token = req.headers['mobile-token'];
    if (!token) {
      return res.status(401).json({ error: 'Mobile backend token required' });
    }

    const { id } = req.params;
    const result = await mobileApiService.updateScan(token, id, req.body);
    return res.json(result);
  } catch (error) {
    console.error('❌ Update scan error:', error);
    return res.status(500).json({ error: 'Failed to update scan' });
  }
};

export const deleteScan = async (req, res) => {
  try {
    const token = req.headers['mobile-token'];
    if (!token) {
      return res.status(401).json({ error: 'Mobile backend token required' });
    }

    const { id } = req.params;
    const result = await mobileApiService.deleteScan(token, id);
    return res.json(result);
  } catch (error) {
    console.error('❌ Delete scan error:', error);
    return res.status(500).json({ error: 'Failed to delete scan' });
  }
};

export const archiveScan = async (req, res) => {
  try {
    const token = req.headers['mobile-token'];
    if (!token) {
      return res.status(401).json({ error: 'Mobile backend token required' });
    }

    const { id } = req.params;
    const result = await mobileApiService.archiveScan(token, id);
    return res.json(result);
  } catch (error) {
    console.error('❌ Archive scan error:', error);
    return res.status(500).json({ error: 'Failed to archive scan' });
  }
};

// Session Management
export const getAllSessions = async (req, res) => {
  try {
    const token = req.headers['mobile-token'];
    if (!token) {
      return res.status(401).json({ error: 'Mobile backend token required' });
    }

    const { department, dateFrom, dateTo, page = 1, limit = 50 } = req.query;
    const filters = { department, dateFrom, dateTo, page, limit };

    const result = await mobileApiService.getAllSessions(token, filters);
    return res.json(result);
  } catch (error) {
    console.error('❌ Get all sessions error:', error);
    return res.status(500).json({ error: 'Failed to fetch sessions' });
  }
};

export const getSessionById = async (req, res) => {
  try {
    const token = req.headers['mobile-token'];
    if (!token) {
      return res.status(401).json({ error: 'Mobile backend token required' });
    }

    const { id } = req.params;
    const result = await mobileApiService.getSessionById(token, id);
    return res.json(result);
  } catch (error) {
    console.error('❌ Get session error:', error);
    return res.status(500).json({ error: 'Failed to fetch session' });
  }
};

// Search and Filter
export const searchScans = async (req, res) => {
  try {
    const token = req.headers['mobile-token'];
    if (!token) {
      return res.status(401).json({ error: 'Mobile backend token required' });
    }

    const { q, status, department, dateFrom, dateTo, page = 1, limit = 50 } = req.query;
    const filters = { q, status, department, dateFrom, dateTo, page, limit };

    const result = await mobileApiService.getAllScans(token, filters);
    return res.json(result);
  } catch (error) {
    console.error('❌ Search scans error:', error);
    return res.status(500).json({ error: 'Failed to search scans' });
  }
};

export const searchUsers = async (req, res) => {
  try {
    const token = req.headers['mobile-token'];
    if (!token) {
      return res.status(401).json({ error: 'Mobile backend token required' });
    }

    const { q, department, page = 1, limit = 50 } = req.query;
    const filters = { q, department, page, limit };

    const result = await mobileApiService.getAllUsers(token, filters);
    return res.json(result);
  } catch (error) {
    console.error('❌ Search users error:', error);
    return res.status(500).json({ error: 'Failed to search users' });
  }
};

