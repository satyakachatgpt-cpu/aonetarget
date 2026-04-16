import express from 'express';
import * as testController from '../controllers/test.controller.js';
import { adminMiddleware } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

// Routes for Course-linked Tests (/api/courses/:courseId/tests)
router.get('/', testController.getCourseTests);
router.post('/', adminMiddleware, testController.addTestToCourse);
router.put('/:testId', adminMiddleware, testController.updateCourseTest);
router.delete('/:testId', adminMiddleware, testController.deleteCourseTest);

export default router;
