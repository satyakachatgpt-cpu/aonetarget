import express from 'express';
import { 
  getCourses, 
  createCourse, 
  bulkUpdateCourses, 
  deleteAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse
} from '../controllers/course.controller.js';
import { adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route GET /api/courses
 * @desc Get all courses with filters/pagination
 */
router.get('/courses', getCourses);

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
