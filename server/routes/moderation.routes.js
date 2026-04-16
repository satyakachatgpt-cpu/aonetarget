import express from 'express';
import {
  reportQuestion,
  getReportedQuestions,
  updateReportStatus
} from '../controllers/moderation.controller.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Student-facing Reporting
router.post('/reported-questions', authMiddleware, reportQuestion);

// Admin Moderation Dashboard
router.get('/admin/reported-questions', adminMiddleware, getReportedQuestions);
router.patch('/admin/reported-questions/:id', adminMiddleware, updateReportStatus);

export default router;
