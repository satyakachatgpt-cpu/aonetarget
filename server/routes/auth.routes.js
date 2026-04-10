import express from 'express';
import { 
  adminLogin, 
  studentLogin, 
  forgotPassword, 
  resetPassword, 
  logout 
} from '../controllers/auth.controller.js';
import { bruteForceGate } from '../middleware/security.js';

const router = express.Router();

/**
 * @route POST /api/admin/login
 * @desc Admin Login with brute-force protection
 */
router.post('/admin/login', bruteForceGate('adminId'), adminLogin);

/**
 * @route POST /api/students/login
 * @desc Student Login with brute-force protection
 */
router.post('/students/login', bruteForceGate('phone'), studentLogin);

/**
 * @route POST /api/auth/forgot-password
 * @desc Forgot Password Request
 */
router.post('/auth/forgot-password', bruteForceGate('identifier'), forgotPassword);

/**
 * @route POST /api/auth/reset-password
 * @desc Reset Password with token
 */
router.post('/auth/reset-password', resetPassword);

/**
 * @route POST /api/auth/logout
 * @desc Secure Logout & Revocation
 */
router.post('/auth/logout', logout);

export default router;
