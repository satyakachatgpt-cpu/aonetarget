import express from 'express';
import mongoose from 'mongoose';
import {
  getStudentCourses,
  enrollStudent,
  checkEnrollment,
  getCourseProgress,
  updateCourseProgress,
  unenrollStudent
} from '../controllers/enrollment.controller.js';
import { authMiddleware, studentOwnerOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// Student-facing Admission & Enrollment checks
router.get('/students/:id/courses', authMiddleware, studentOwnerOrAdmin, getStudentCourses);
router.get('/students/:id/enrolled/:courseId', authMiddleware, studentOwnerOrAdmin, checkEnrollment);
router.get('/students/:id/courses/:courseId/progress', authMiddleware, studentOwnerOrAdmin, getCourseProgress);
router.put('/students/:id/courses/:courseId/progress', authMiddleware, studentOwnerOrAdmin, updateCourseProgress);

// Enrollment Actions
router.post('/students/:id/enroll', authMiddleware, studentOwnerOrAdmin, enrollStudent);
router.delete('/students/:id/unenroll/:courseId', authMiddleware, studentOwnerOrAdmin, unenrollStudent);

export default router;
