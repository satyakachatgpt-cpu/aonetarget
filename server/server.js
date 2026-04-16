import 'dotenv/config';
import app from './app.js';
import http from 'http';
import { connectDB } from './config/db.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
const currentPort = process.env.PORT || 5000;

/**
 * server.js - CLEAN BOOTSTRAP LAYER
 */

// --- ENV VALIDATION ---
const criticalEnv = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'MONGODB_URI'];
if (isProduction) criticalEnv.push('NODE_ENV');

criticalEnv.forEach(key => {
  if (!process.env[key]) {
    console.error(`[FATAL] Missing mandatory environment variable: ${key}`);
    process.exit(1);
  }
});

// Mask MongoDB URI for logging safety
const maskedUri = process.env.MONGODB_URI?.replace(/:([^@]+)@/, ':****@');
console.log(`[STARTUP] MONGODB_URI: ${maskedUri}`);

const serviceEnv = ['EMAIL_USER', 'EMAIL_PASS', 'CLOUDINARY_API_KEY'];
serviceEnv.forEach(key => {
  if (!process.env[key]) {
    console.warn(`[ENV WARNING] Missing ${key}. Some features may be disabled.`);
  }
});

async function startServer() {
  try {
    // 1. Connect to Database
    await connectDB();
    console.log('✅ Database connected successfully');

    // 2. Create HTTP Server
    const httpServer = http.createServer(app);

    // 3. Setup global server error handlers
    httpServer.on('error', (e) => {
      if (e.code === 'EADDRINUSE') {
        console.error(`❌ Port ${currentPort} is already in use.`);
        process.exit(1);
      } else {
        console.error('❌ Server startup error:', e);
      }
    });

    // 4. Start Listening
    httpServer.listen(currentPort, '0.0.0.0', () => {
      console.log(`\n🚀 AOneTarget Server running on http://localhost:${currentPort}`);
      console.log(`📡 Deployment Mode: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}\n`);
    });

  } catch (err) {
    console.error('[FATAL] Cannot start server:', err.message || err);
    process.exit(1);
  }
}

// Global Process Handlers
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the bootstrap process
startServer();
