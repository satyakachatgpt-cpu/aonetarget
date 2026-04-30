import express from 'express';
import { 
  getCourses, 
  createCourse, 
  bulkUpdateCourses, 
  deleteAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  getStudentCourseTests
} from '../controllers/course.controller.js';
import { adminMiddleware, optionalAuth } from '../middleware/auth.js';
import { catalogLimiter } from '../middleware/security.js';

const router = express.Router();

/**
 * @route GET /api/courses
 * @desc Get all courses with filters/pagination
 */
router.get('/courses', catalogLimiter, getCourses);

/**
 * @route POST /api/courses
 * @desc Create new course (Admin only)
 */
router.post('/courses', adminMiddleware, createCourse);

/**
 * @route PUT /api/courses
 * @desc Bulk update courses (Admin only)
 */
router.put('/courses', adminMiddleware, bulkUpdateCourses);

/**
 * @route DELETE /api/courses
 * @desc Delete all courses (Admin only - Destructive)
 */
router.delete('/courses', adminMiddleware, deleteAllCourses);

/**
 * @route GET /api/courses/:id/tests
 * @desc Get tests for a course — STUDENT-FACING version.
 * Uses rich filtering: related ID variants, isSeries exclusion, status filter,
 * and attached test-series resolution.
 * Must be registered BEFORE GET /courses/:id to avoid route shadowing.
 * NOT interchangeable with /api/courses/:courseId/tests (admin panel).
 */
router.get('/courses/:id/tests', optionalAuth, getStudentCourseTests);

/**
 * @route GET /api/courses/:id
 * @desc Get single course or package by ID/Slug
 */
router.get('/courses/:id', getCourseById);

/**
 * @route PUT /api/courses/:id
 * @desc Update single course or package (Admin only)
 */
router.put('/courses/:id', adminMiddleware, updateCourse);

/**
 * @route POST /api/courses/:id
 * @desc Alias for Update (Legacy compatibility)
 */
router.post('/courses/:id', adminMiddleware, updateCourse);

/**
 * @route DELETE /api/courses/:id
 * @desc Delete single course or package (Admin only)
 */
router.delete('/courses/:id', adminMiddleware, deleteCourse);

export default router;
