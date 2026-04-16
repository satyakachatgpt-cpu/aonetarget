import express from 'express';
import { adminMiddleware, authMiddleware } from '../middleware/auth.js';
import { 
  validateTestId, 
  validateSubmitPayload 
} from '../middleware/validation.middleware.js';
import {
  getStudentTestResults,
  getAdminTestResults,
  deleteAllTestResults,
  deleteTestResult,
  reevaluateTest,
  rawInsertTestResult,
  submitTest,
} from '../controllers/result.controller.js';

const router = express.Router();

const studentOwnerOrAdmin = (req, res, next) => {
  if (req.user?.isAdmin || req.user?.role === 'admin') return next();
  if (req.user?.studentId && String(req.user.studentId) === String(req.params.id)) return next();
  return res.status(403).json({ error: 'Forbidden' });
};

// Student result routes
router.get('/students/:id/test-results', authMiddleware, studentOwnerOrAdmin, getStudentTestResults);
router.post('/tests/:testId/submit', authMiddleware, validateTestId, validateSubmitPayload, submitTest);

// Admin result routes (all require admin auth)
router.get('/admin/test-results', adminMiddleware, getAdminTestResults);
router.delete('/admin/test-results', adminMiddleware, deleteAllTestResults);
router.delete('/admin/test-results/:id', adminMiddleware, deleteTestResult);

// Reevaluate (admin only — modifies stored scores)
router.post('/tests/:id/reevaluate', adminMiddleware, reevaluateTest);

// [UNSAFE] Raw insert — admin only, legacy compatibility
router.post('/students/:id/test-results', adminMiddleware, rawInsertTestResult);

export default router;
