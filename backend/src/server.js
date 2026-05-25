const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Import route modules
const authRoutes = require('./routes/auth');
const sessionsRoutes = require('./routes/sessions');
const scanRoutes = require('./routes/scan');
const assetRoutes = require('./routes/assets');
const rfidRoutes = require('./routes/rfid');

dotenv.config();

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI is not defined');
  process.exit(1);
}

const app = express();
const legacyBarcodeAliasesEnabled = ['1', 'true', 'yes', 'on', 'enabled'].includes(
  String(process.env.LEGACY_BARCODE_ALIAS_MODE || 'disabled').toLowerCase(),
);

const legacyBarcodeAliasMoved = legacyPath => (req, res) => {
  res.setHeader('X-Migration-Path', legacyPath);
  return res.status(410).json({
    success: false,
    error: 'Legacy barcode API alias is retired from the primary asset platform surface.',
    legacyPath,
    migrationPath: '/api/assets and /api/rfid',
    compatibility:
      'Use the /api/legacy/* path for read-only archive access, or set LEGACY_BARCODE_ALIAS_MODE=enabled for emergency rollback.',
  });
};

const allowedOrigins = [
  'https://embroider-scann-app.onrender.com',
  'http://localhost:19006',  // Expo dev server
  'http://localhost:3000',   // local frontend dev
  'exp://127.0.0.1:19000',  // Expo app URL scheme if needed
];

// CORS middleware with whitelist and null origin allowance
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS policy does not allow access from this origin'), false);
    }
    return callback(null, true);
  },
  credentials: true,
}));

app.use(express.json());

// Health check endpoint
app.get('/', (_req, res) => {
  res.json({ status: '✅ API is running', timestamp: new Date().toISOString() });
});



// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/legacy/sessions', sessionsRoutes);
app.use('/api/legacy/scan', scanRoutes);
if (legacyBarcodeAliasesEnabled) {
  app.use('/api/sessions', sessionsRoutes);
  app.use('/api/scan', scanRoutes);
} else {
  app.use('/api/sessions', legacyBarcodeAliasMoved('/api/legacy/sessions'));
  app.use('/api/scan', legacyBarcodeAliasMoved('/api/legacy/scan'));
}
app.use('/api/assets', assetRoutes);
app.use('/api/asset', assetRoutes);
app.use('/api/rfid', rfidRoutes);

app.use('/api', (req, res) => {
  return res.status(404).json({
    success: false,
    error: `API route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use((error, _req, res, _next) => {
  console.error('Unhandled API error:', error);

  return res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Internal server error',
  });
});

// Connect to MongoDB and start the server
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Listening on http://0.0.0.0:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });
