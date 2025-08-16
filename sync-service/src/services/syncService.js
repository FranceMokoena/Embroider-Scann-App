const { MobileUser, MobileTaskSession, MobileScreen } = require('../models/mobileModels');
const { 
  DesktopUser, 
  DesktopTaskSession, 
  DesktopScreen, 
  Statistics, 
  SyncLog 
} = require('../models/desktopModels');
const moment = require('moment');

class SyncService {
  constructor() {
    this.syncStats = {
      users: { created: 0, updated: 0, errors: 0 },
      sessions: { created: 0, updated: 0, errors: 0 },
      screens: { created: 0, updated: 0, errors: 0 },
      statistics: { created: 0, updated: 0, errors: 0 }
    };
  }

  async performFullSync() {
    const startTime = Date.now();
    console.log('🔄 Starting full sync...');
    
    try {
      this.resetSyncStats();
      await this.syncUsers();
      await this.syncSessions();
      await this.syncScreens();
      await this.updateStatistics();
      await this.logSyncOperation('full_sync', 'success', startTime);
      
      console.log('✅ Full sync completed successfully');
      this.printSyncStats();
      
    } catch (error) {
      console.error('❌ Full sync failed:', error);
      await this.logSyncOperation('full_sync', 'error', startTime, error.message);
      throw error;
    }
  }

  resetSyncStats() {
    this.syncStats = {
      users: { created: 0, updated: 0, errors: 0 },
      sessions: { created: 0, updated: 0, errors: 0 },
      screens: { created: 0, updated: 0, errors: 0 },
      statistics: { created: 0, updated: 0, errors: 0 }
    };
  }

  printSyncStats() {
    console.log('\n📈 Sync Statistics:');
    console.log('👥 Users:', this.syncStats.users);
    console.log('📋 Sessions:', this.syncStats.sessions);
    console.log('📱 Screens:', this.syncStats.screens);
    console.log('📊 Statistics:', this.syncStats.statistics);
    console.log('');
  }

  // Sync users from mobile to desktop
  async syncUsers() {
    console.log('👥 Syncing users...');
    
    try {
      const mobileUsers = await MobileUser.find({});
      
      for (const mobileUser of mobileUsers) {
        try {
          const userData = {
            mobileUserId: mobileUser._id.toString(),
            department: mobileUser.department,
            username: mobileUser.username,
            password: mobileUser.password,
            lastSynced: new Date(),
            syncVersion: 1
          };

          const existingUser = await DesktopUser.findOne({ 
            mobileUserId: mobileUser._id.toString() 
          });

          if (existingUser) {
            await DesktopUser.findOneAndUpdate(
              { mobileUserId: mobileUser._id.toString() },
              { 
                ...userData,
                lastSynced: new Date(),
                syncVersion: existingUser.syncVersion + 1
              }
            );
            this.syncStats.users.updated++;
          } else {
            await DesktopUser.create(userData);
            this.syncStats.users.created++;
          }
        } catch (error) {
          console.error(`❌ Error syncing user ${mobileUser.username}:`, error);
          this.syncStats.users.errors++;
        }
      }
      
      console.log(`✅ Users sync completed: ${this.syncStats.users.created} created, ${this.syncStats.users.updated} updated`);
      
    } catch (error) {
      console.error('❌ Users sync failed:', error);
      throw error;
    }
  }

  // Sync sessions from mobile to desktop
  async syncSessions() {
    console.log('📋 Syncing sessions...');
    
    try {
      const mobileSessions = await MobileTaskSession.find({})
        .populate('technician', 'username department');
      
      for (const mobileSession of mobileSessions) {
        try {
          const sessionScans = await MobileScreen.find({ session: mobileSession._id });
          const scanCount = sessionScans.length;
          const reparableCount = sessionScans.filter(s => s.status === 'Reparable').length;
          const beyondRepairCount = sessionScans.filter(s => s.status === 'Beyond Repair').length;
          const healthyCount = sessionScans.filter(s => s.status === 'Healthy').length;
          
          const duration = mobileSession.endTime 
            ? mobileSession.endTime.getTime() - mobileSession.startTime.getTime()
            : null;
          
          const status = mobileSession.endTime ? 'completed' : 'active';
          
          const sessionData = {
            mobileSessionId: mobileSession._id.toString(),
            technician: mobileSession.technician._id.toString(),
            startTime: mobileSession.startTime,
            endTime: mobileSession.endTime,
            status: status,
            duration: duration,
            scanCount: scanCount,
            reparableCount: reparableCount,
            beyondRepairCount: beyondRepairCount,
            healthyCount: healthyCount,
            lastSynced: new Date(),
            syncVersion: 1
          };

          const existingSession = await DesktopTaskSession.findOne({ 
            mobileSessionId: mobileSession._id.toString() 
          });

          if (existingSession) {
            await DesktopTaskSession.findOneAndUpdate(
              { mobileSessionId: mobileSession._id.toString() },
              { 
                ...sessionData,
                lastSynced: new Date(),
                syncVersion: existingSession.syncVersion + 1
              }
            );
            this.syncStats.sessions.updated++;
          } else {
            await DesktopTaskSession.create(sessionData);
            this.syncStats.sessions.created++;
          }
        } catch (error) {
          console.error(`❌ Error syncing session ${mobileSession._id}:`, error);
          this.syncStats.sessions.errors++;
        }
      }
      
      console.log(`✅ Sessions sync completed: ${this.syncStats.sessions.created} created, ${this.syncStats.sessions.updated} updated`);
      
    } catch (error) {
      console.error('❌ Sessions sync failed:', error);
      throw error;
    }
  }

  // Sync screens from mobile to desktop
  async syncScreens() {
    console.log('📱 Syncing screens...');
    
    try {
      const mobileScreens = await MobileScreen.find({})
        .populate({
          path: 'session',
          populate: {
            path: 'technician',
            select: 'username department'
          }
        });
      
      for (const mobileScreen of mobileScreens) {
        try {
          const screenData = {
            mobileScreenId: mobileScreen._id.toString(),
            barcode: mobileScreen.barcode,
            status: mobileScreen.status,
            timestamp: mobileScreen.timestamp,
            session: mobileScreen.session._id.toString(),
            technician: mobileScreen.session.technician._id.toString(),
            department: mobileScreen.session.technician.department,
            lastSynced: new Date(),
            syncVersion: 1
          };

          const existingScreen = await DesktopScreen.findOne({ 
            mobileScreenId: mobileScreen._id.toString() 
          });

          if (existingScreen) {
            await DesktopScreen.findOneAndUpdate(
              { mobileScreenId: mobileScreen._id.toString() },
              { 
                ...screenData,
                lastSynced: new Date(),
                syncVersion: existingScreen.syncVersion + 1
              }
            );
            this.syncStats.screens.updated++;
          } else {
            await DesktopScreen.create(screenData);
            this.syncStats.screens.created++;
          }
        } catch (error) {
          console.error(`❌ Error syncing screen ${mobileScreen.barcode}:`, error);
          this.syncStats.screens.errors++;
        }
      }
      
      console.log(`✅ Screens sync completed: ${this.syncStats.screens.created} created, ${this.syncStats.screens.updated} updated`);
      
    } catch (error) {
      console.error('❌ Screens sync failed:', error);
      throw error;
    }
  }

  // Update statistics for desktop management
  async updateStatistics() {
    console.log('📊 Updating statistics...');
    
    try {
      const today = moment().startOf('day').toDate();
      const todayStats = await this.calculateDailyStatistics(today);
      
      const existingStats = await Statistics.findOne({ date: today });
      
      if (existingStats) {
        await Statistics.findOneAndUpdate(
          { date: today },
          { 
            ...todayStats,
            lastSynced: new Date(),
            syncVersion: existingStats.syncVersion + 1
          }
        );
        this.syncStats.statistics.updated++;
      } else {
        await Statistics.create(todayStats);
        this.syncStats.statistics.created++;
      }
      
      console.log(`✅ Statistics updated: ${this.syncStats.statistics.created} created, ${this.syncStats.statistics.updated} updated`);
      
    } catch (error) {
      console.error('❌ Statistics update failed:', error);
      throw error;
    }
  }

  // Calculate daily statistics
  async calculateDailyStatistics(date) {
    const startOfDay = moment(date).startOf('day').toDate();
    const endOfDay = moment(date).endOf('day').toDate();
    
    const screens = await DesktopScreen.find({
      timestamp: { $gte: startOfDay, $lte: endOfDay }
    });
    
    const sessions = await DesktopTaskSession.find({
      startTime: { $gte: startOfDay, $lte: endOfDay }
    });
    
    const activeTechnicians = await DesktopUser.distinct('mobileUserId', {
      mobileUserId: { $in: sessions.map(s => s.technician) }
    });
    
    const totalScans = screens.length;
    const totalReparable = screens.filter(s => s.status === 'Reparable').length;
    const totalBeyondRepair = screens.filter(s => s.status === 'Beyond Repair').length;
    const totalHealthy = screens.filter(s => s.status === 'Healthy').length;
    const totalSessions = sessions.length;
    
    const departmentStats = [];
    const departments = [...new Set(screens.map(s => s.department))];
    
    for (const department of departments) {
      const deptScreens = screens.filter(s => s.department === department);
      const deptSessions = sessions.filter(s => 
        deptScreens.some(scr => scr.session === s.mobileSessionId)
      );
      
      departmentStats.push({
        department: department,
        scans: deptScreens.length,
        reparable: deptScreens.filter(s => s.status === 'Reparable').length,
        beyondRepair: deptScreens.filter(s => s.status === 'Beyond Repair').length,
        healthy: deptScreens.filter(s => s.status === 'Healthy').length,
        sessions: deptSessions.length
      });
    }
    
    return {
      date: date,
      totalScans: totalScans,
      totalReparable: totalReparable,
      totalBeyondRepair: totalBeyondRepair,
      totalHealthy: totalHealthy,
      totalSessions: totalSessions,
      activeTechnicians: activeTechnicians.length,
      departmentStats: departmentStats,
      lastSynced: new Date(),
      syncVersion: 1
    };
  }

  // Log sync operation
  async logSyncOperation(operation, status, startTime, errorMessage = null) {
    const duration = Date.now() - startTime;
    const totalProcessed = 
      this.syncStats.users.created + this.syncStats.users.updated +
      this.syncStats.sessions.created + this.syncStats.sessions.updated +
      this.syncStats.screens.created + this.syncStats.screens.updated +
      this.syncStats.statistics.created + this.syncStats.statistics.updated;
    
    const totalCreated = 
      this.syncStats.users.created + this.syncStats.sessions.created + 
      this.syncStats.screens.created + this.syncStats.statistics.created;
    
    const totalUpdated = 
      this.syncStats.users.updated + this.syncStats.sessions.updated + 
      this.syncStats.screens.updated + this.syncStats.statistics.updated;
    
    await SyncLog.create({
      operation: operation,
      status: status,
      recordsProcessed: totalProcessed,
      recordsCreated: totalCreated,
      recordsUpdated: totalUpdated,
      recordsDeleted: 0,
      errorMessage: errorMessage,
      duration: duration,
      timestamp: new Date()
    });
  }
}

module.exports = SyncService;
