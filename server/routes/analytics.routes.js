import express from 'express';
import { saveProgress, getProgress, trackActivity, getAdminAnalytics } from '../controllers/analytics.controller.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

const userOwnerOrAdmin = (req, res, next) => {
  if (req.user?.isAdmin || req.user?.role === 'admin') return next();
  if (req.user?.studentId && String(req.user.studentId) === String(req.params.userId)) return next();
  return res.status(403).json({ error: 'Forbidden' });
};

/**
 * @route POST /api/progress/save
 * @desc Save video progress for a student
 */
router.post('/progress/save', authMiddleware, saveProgress);

/**
 * @route GET /api/progress/:userId
 * @desc Get video progress for a student
 */
router.get('/progress/:userId', authMiddleware, userOwnerOrAdmin, getProgress);

/**
 * @route POST /api/activity/track
 * @desc Track user activity (course open, purchase click)
 */
router.post('/activity/track', authMiddleware, trackActivity);

/**
 * @route GET /api/admin/analytics
 * @desc Get high-level admin analytics
 */
router.get('/admin/analytics', adminMiddleware, getAdminAnalytics);

export default router;
