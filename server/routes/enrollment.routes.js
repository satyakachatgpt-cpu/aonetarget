import express from 'express';
import {
  getStudentCourses,
  enrollStudent,
  checkEnrollment,
  getCourseProgress,
  updateCourseProgress
} from '../controllers/enrollment.controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

const studentOwnerOrAdmin = (req, res, next) => {
  if (req.admin || req.user?.isAdmin || req.user?.role === 'admin') return next();
  if (req.user?.studentId && String(req.user.studentId) === String(req.params.id)) return next();
  return res.status(403).json({ error: 'Forbidden' });
};

// Student-facing Admission & Enrollment checks
router.get('/students/:id/courses', authMiddleware, studentOwnerOrAdmin, getStudentCourses);
router.get('/students/:id/enrolled/:courseId', authMiddleware, studentOwnerOrAdmin, checkEnrollment);
router.get('/students/:id/courses/:courseId/progress', authMiddleware, studentOwnerOrAdmin, getCourseProgress);
router.put('/students/:id/courses/:courseId/progress', authMiddleware, studentOwnerOrAdmin, updateCourseProgress);

// Enrollment Actions
router.post('/students/:id/enroll', authMiddleware, studentOwnerOrAdmin, enrollStudent);

export default router;
