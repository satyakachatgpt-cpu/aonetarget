import express from 'express';
import * as authController from '../controllers/auth.controller.js';
import { 
  getCurrentUser, 
  logout as studentLogout, 
  getUserById, 
  createUser 
} from '../controllers/student.controller.js';
import { bruteForceGate, publicLimiter, authLimiter } from '../middleware/security.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

/**
 * Standard Rate Limiters (Mirrored from server.js)
 */
const otpLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { error: 'Too many OTP requests from this IP, please try again after a minute' }
});

/**
 * Admin Routes
 */
router.post('/admin/login', bruteForceGate('adminId'), authController.adminLogin);

/**
 * Student Authentication & Registration (Mirrored from server.js)
 */
router.post('/students/register', publicLimiter, authController.registerStudent);
router.post('/students/login', bruteForceGate('phone'), authController.studentLogin);
router.post('/students/login-password', bruteForceGate('phone'), authController.loginWithPassword);

/**
 * OTP Routes
 */
router.post('/otp/send', otpLimiter, authController.sendOtp);
router.post('/otp/verify', authLimiter, authController.verifyOtp);

/**
 * Registration/Signup Specific OTPs (Aliases for modularity)
 */
router.post('/students/signup/send-otp', otpLimiter, authController.sendOtp);
router.post('/students/signup/verify-otp', authLimiter, authController.verifyOtp);

/**
 * Password Management (OTP Based - Mirrored from server.js)
 */
router.post('/students/forgot-password/send-otp', otpLimiter, authController.forgotPasswordSendOtp);
router.post('/students/forgot-password/verify-otp', authLimiter, authController.forgotPasswordVerifyOtp);
router.post('/students/reset-password', authLimiter, bruteForceGate('phone'), authController.resetPasswordWithOtp);
router.post('/students/change-password', authMiddleware, authController.changePassword);

/**
 * Password Management (Link/Token Based - Existing Modular)
 */
router.post('/auth/forgot-password', bruteForceGate('identifier'), authController.forgotPassword);
router.post('/auth/reset-password', authController.resetPassword);

/**
 * Session & Token Management
 */
router.post('/auth/refresh', authController.refreshAccessToken);
router.post('/auth/logout', authController.logout);

/**
 * Identity Checks (Managed in student.routes.js)
 */

/**
 * Migrated Identity & User Management (Phase H1)
 */
router.get('/me', getCurrentUser);
router.post('/logout', studentLogout);
router.get('/users/:id', adminMiddleware, getUserById);
router.post('/users', adminMiddleware, createUser);

export default router;
