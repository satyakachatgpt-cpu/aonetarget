import express from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * Admin Infrastructure Routes
 * Mounted at /api via app.js
 */

// Global Verify (Standard Header Check)
router.get('/admin/verify', adminController.verifyAdmin);

// Dashboard Analytics (No middleware in legacy server.js)
router.get('/admin/dashboard-stats', adminMiddleware, adminController.getDashboardStats);

// Institute Settings
router.get('/institute', adminController.getInstituteSettings);
router.put('/institute', adminMiddleware, adminController.updateInstituteSettings);

// Device Management (Requires Admin Middleware)
router.post('/admin/approve-device', adminMiddleware, adminController.approveDevice);
router.post('/admin/reject-device', adminMiddleware, adminController.rejectDevice);
router.post('/admin/reset-device', adminMiddleware, adminController.resetDevice);

export default router;
