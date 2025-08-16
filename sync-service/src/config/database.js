const mongoose = require('mongoose');
require('dotenv').config();

// Mobile App Database (Source)
const mobileConnection = mongoose.createConnection(process.env.MOBILE_MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Desktop Database (Target)
const desktopConnection = mongoose.createConnection(process.env.DESKTOP_MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Connection event handlers
mobileConnection.on('connected', () => {
  console.log('✅ Connected to Mobile App Database');
});

mobileConnection.on('error', (err) => {
  console.error('❌ Mobile Database Connection Error:', err);
});

desktopConnection.on('connected', () => {
  console.log('✅ Connected to Desktop Database');
});

desktopConnection.on('error', (err) => {
  console.error('❌ Desktop Database Connection Error:', err);
});

module.exports = {
  mobileConnection,
  desktopConnection
};

