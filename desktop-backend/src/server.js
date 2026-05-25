import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDesktopDatabase } from './config/desktopDatabase.js';

// Import routes
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import reportsRoutes from './routes/reports.js';
import messagingRoutes from './routes/messaging.js';
import assetRoutes from './routes/assets.js';
import featureRoutes from './routes/features.js';
import { createAssetReadModelIndexes } from './models/assetReadModels.js';
import { legacyRouteGuard } from './middleware/legacyRouteGuard.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetConsolePath = path.join(__dirname, '..', 'public', 'asset-console');

const loadDesktopEnvironment = () => {
  dotenv.config({ path: path.join(__dirname, '..', '.env') });

  const rootEnvPath = path.join(__dirname, '..', '..', '.env');
  if (!fs.existsSync(rootEnvPath)) return;

  const parsed = dotenv.parse(fs.readFileSync(rootEnvPath));
  const allowedKeys = new Set([
    'JWT_SECRET',
    'MOBILE_API_URL',
    'ALLOWED_ORIGINS',
    'ASSET_API_CREATE_INDEXES',
  ]);
  const allowedPrefixes = ['DESKTOP_', 'ASSET_UI_', 'RATE_LIMIT_'];

  Object.entries(parsed).forEach(([key, value]) => {
    const allowed = allowedKeys.has(key) || allowedPrefixes.some(prefix => key.startsWith(prefix));
    if (allowed && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
};

loadDesktopEnvironment();

const PORT = process.env.PORT || 5011;
const enableLegacyAliases = ['1', 'true', 'yes', 'on', 'enabled'].includes(
  String(process.env.DESKTOP_LEGACY_ALIAS_MODE || 'disabled').toLowerCase(),
);

const desktopHealth = () => ({
  status: 'ok',
  service: 'Desktop RFID Asset Console',
  timestamp: new Date().toISOString(),
  version: '1.0.0',
  assetConsole: '/asset-console/',
});

const legacyAliasMoved = legacyPath => (req, res) => {
  res.setHeader('X-Migration-Path', legacyPath);
  return res.status(410).json({
    success: false,
    error: 'Legacy desktop API alias is retired from the primary desktop surface.',
    legacyPath,
    migrationPath: '/api/assets/*',
    compatibility:
      'Use the /api/legacy/* path for read-only archive access, or set DESKTOP_LEGACY_ALIAS_MODE=enabled for emergency rollback.',
  });
};

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:19006'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/asset-console', express.static(assetConsolePath));

// Canonical desktop entrypoint
app.get('/', (req, res) => {
  res.redirect(302, '/asset-console/');
});

// Health check endpoint for Render and uptime probes
app.get('/health', (req, res) => {
  res.json(desktopHealth());
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/features', featureRoutes);
app.use('/api/legacy/admin', legacyRouteGuard, adminRoutes);
app.use('/api/legacy/reports', legacyRouteGuard, reportsRoutes);
app.use('/api/legacy/messaging', legacyRouteGuard, messagingRoutes);

if (enableLegacyAliases) {
  app.use('/api/admin', legacyRouteGuard, adminRoutes);
  app.use('/api/reports', legacyRouteGuard, reportsRoutes);
  app.use('/api/messaging', legacyRouteGuard, messagingRoutes);
} else {
  app.use('/api/admin', legacyAliasMoved('/api/legacy/admin'));
  app.use('/api/reports', legacyAliasMoved('/api/legacy/reports'));
  app.use('/api/messaging', legacyAliasMoved('/api/legacy/messaging'));
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

const startServer = async () => {
  const connected = await connectDesktopDatabase();
  if (connected && process.env.ASSET_API_CREATE_INDEXES !== 'false') {
    try {
      await createAssetReadModelIndexes();
      console.log('Asset API indexes are ready');
    } catch (error) {
      console.error('Asset API index creation failed:', error.message);
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Desktop RFID Asset Console running on http://0.0.0.0:${PORT}`);
    console.log(`Asset Console: http://localhost:${PORT}/asset-console/`);
    console.log(`Health: http://localhost:${PORT}/health`);
    console.log(`Asset APIs: http://localhost:${PORT}/api/assets`);
  });
};

startServer();
