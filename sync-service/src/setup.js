const { mobileConnection, desktopConnection } = require('./config/database');
const { 
  DesktopUser, 
  DesktopTaskSession, 
  DesktopScreen, 
  Statistics, 
  SyncLog,
  DesktopSection,
  DesktopAsset,
  DesktopAssetIdentifier,
  DesktopAssetHistory,
  DesktopAssetVerification,
  DesktopAssetTransfer,
  DesktopRFIDEvent
} = require('./models/desktopModels');

async function setupDatabase() {
  console.log('🔧 Setting up desktop database...');
  
  try {
    // Test mobile database connection
    console.log('📱 Testing mobile database connection...');
    await mobileConnection.asPromise();
    console.log('✅ Mobile database connection successful');
    
    // Test desktop database connection
    console.log('🖥️ Testing desktop database connection...');
    await desktopConnection.asPromise();
    console.log('✅ Desktop database connection successful');
    
    // Create indexes for better performance
    console.log('📊 Creating database indexes...');
    
    // User indexes
    await DesktopUser.createIndexes();
    console.log('✅ User indexes created');
    
    // Session indexes
    await DesktopTaskSession.createIndexes();
    console.log('✅ Session indexes created');
    
    // Screen indexes
    await DesktopScreen.createIndexes();
    console.log('✅ Screen indexes created');
    
    // Statistics indexes
    await Statistics.createIndexes();
    console.log('✅ Statistics indexes created');
    
    // Sync log indexes
    await SyncLog.createIndexes();
    await DesktopSection.createIndexes();
    await DesktopAsset.createIndexes();
    await DesktopAssetIdentifier.createIndexes();
    await DesktopAssetHistory.createIndexes();
    await DesktopAssetVerification.createIndexes();
    await DesktopAssetTransfer.createIndexes();
    await DesktopRFIDEvent.createIndexes();
    console.log('Asset-centric read model indexes created');
    console.log('✅ Sync log indexes created');
    
    console.log('🎉 Database setup completed successfully!');
    console.log('📋 Next steps:');
    console.log('   1. Update your .env file with the correct desktop database URI');
    console.log('   2. Run: npm run sync (for manual sync)');
    console.log('   3. Run: npm start (for scheduled sync)');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

// Run setup
setupDatabase();

