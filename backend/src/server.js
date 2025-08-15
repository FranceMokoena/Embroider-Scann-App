import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

// Import route modules (CommonJS-style compiled, so import full module)
import authRoutesModule from './routes/auth.js';
import sessionsRoutesModule from './routes/sessions.js';
import scanRoutesModule from './routes/scan.js';

dotenv.config();

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI is not defined');
  process.exit(1);
}

const app = express();

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

// Extract router exports from .default because these are CommonJS compiled modules
const authRoutes = authRoutesModule.default;
const sessionsRoutes = sessionsRoutesModule.default;
const scanRoutes = scanRoutesModule.default;

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/scan', scanRoutes);

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
