import express from 'express';
import {
  getSettings,
  updateSettings,
  getDashboardStats,
  ping,
  health,
  heartbeat,
  getSplashScreen,
  updateSplashScreen,
  generateDocx,
  downloadApk,
  uploadApk
} from '../controllers/system.controller.js';
import { adminMiddleware } from '../middleware/auth.js';
import { apkUpload } from '../middleware/upload.middleware.js';
import { authLimiter, publicLimiter } from '../middleware/security.js';

const router = express.Router();

// Settings
router.get('/settings', getSettings);
router.put('/settings', adminMiddleware, updateSettings);

// Dashboard (Requires Admin Middleware)
router.get('/dashboard/stats', adminMiddleware, getDashboardStats);

// Infrastructure (Standardized for /api mount)
router.get('/ping', ping);
router.get('/health', health);
router.post('/heartbeat', heartbeat);

// Splash Screen (Phase 19E)
router.get('/splash-screen', getSplashScreen);
router.put('/splash-screen', adminMiddleware, updateSplashScreen);

// DOCX Generation (Phase 19G)
router.post('/generate-docx', adminMiddleware, generateDocx);

// APK Management (Stabilization)
router.get('/download/apk', publicLimiter, downloadApk);
router.post('/upload/apk', authLimiter, adminMiddleware, apkUpload.single('file'), uploadApk);

export default router;
