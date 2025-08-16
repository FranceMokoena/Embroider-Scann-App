const cron = require('node-cron');
const SyncService = require('./services/syncService');
require('dotenv').config();

// Initialize sync service
const syncService = new SyncService();

// Function to perform sync
async function performSync() {
  try {
    console.log('🔄 Starting scheduled sync...');
    await syncService.performFullSync();
    console.log('✅ Scheduled sync completed successfully');
  } catch (error) {
    console.error('❌ Scheduled sync failed:', error);
  }
}

// Schedule sync based on environment variable (default: every 5 minutes)
const syncInterval = process.env.SYNC_INTERVAL_MINUTES || 5;
const cronExpression = `*/${syncInterval} * * * *`; // Every X minutes

console.log(`🚀 Starting Embroidery Sync Service`);
console.log(`⏰ Sync interval: Every ${syncInterval} minutes`);
console.log(`📅 Cron expression: ${cronExpression}`);

// Schedule the sync job
cron.schedule(cronExpression, performSync, {
  scheduled: true,
  timezone: "UTC"
});

// Perform initial sync on startup
console.log('🔄 Performing initial sync...');
performSync().then(() => {
  console.log('✅ Initial sync completed');
}).catch((error) => {
  console.error('❌ Initial sync failed:', error);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down sync service...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down sync service...');
  process.exit(0);
});

console.log('✅ Sync service is running and monitoring for changes...');

