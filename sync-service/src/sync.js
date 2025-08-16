const SyncService = require('./services/syncService');
require('dotenv').config();

async function manualSync() {
  console.log('🔄 Starting manual sync...');
  
  try {
    const syncService = new SyncService();
    await syncService.performFullSync();
    console.log('✅ Manual sync completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Manual sync failed:', error);
    process.exit(1);
  }
}

// Run manual sync
manualSync();

