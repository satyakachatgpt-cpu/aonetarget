import express from 'express';
import {
  generateReferralCode,
  getReferralStats,
  getReferralHistory,
  applyReferralCode,
  getAdminReferralSettings,
  updateAdminReferralSettings,
  getAllReferralsAdmin,
  updateReferralStatusAdmin
} from '../controllers/referral.controller.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

const referralOwnerOrAdmin = (req, res, next) => {
  if (req.user?.isAdmin || req.user?.role === 'admin') return next();
  if (req.user?.studentId && String(req.user.studentId) === String(req.params.studentId || req.body?.studentId)) return next();
  return res.status(403).json({ error: 'Forbidden' });
};

// Student Routes
router.post('/referrals/generate', authMiddleware, referralOwnerOrAdmin, generateReferralCode);
router.post('/referrals/apply', applyReferralCode);
router.get('/referrals/:studentId', authMiddleware, referralOwnerOrAdmin, getReferralStats);
router.get('/referrals/:studentId/history', authMiddleware, referralOwnerOrAdmin, getReferralHistory);

// Admin Routes
router.get('/admin/referral-settings', adminMiddleware, getAdminReferralSettings);
router.put('/admin/referral-settings', adminMiddleware, updateAdminReferralSettings);
router.get('/admin/referrals', adminMiddleware, getAllReferralsAdmin);
router.put('/admin/referrals/update-status', adminMiddleware, updateReferralStatusAdmin);

export default router;
