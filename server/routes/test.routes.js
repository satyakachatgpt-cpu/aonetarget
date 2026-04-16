import express from 'express';
import * as testController from '../controllers/test.controller.js';
import { excelUpload } from '../middleware/upload.middleware.js';
import { adminMiddleware } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

// Standalone MCQ Framework routes (/api/tests)
router.get('/', testController.getAllTests);
router.post('/', adminMiddleware, testController.createTest);
router.delete('/', adminMiddleware, testController.deleteAllTests);
router.post('/bulk', adminMiddleware, testController.bulkCreateTests);
router.put('/update-all', adminMiddleware, testController.updateAllTests);

router.get('/:id', testController.getTestById);
router.put('/:id', adminMiddleware, testController.updateTest);
router.delete('/:id', adminMiddleware, testController.deleteTest);
router.patch('/:id/publish', adminMiddleware, testController.publishTest);
router.post('/:id/duplicate', adminMiddleware, testController.duplicateTest);
router.get('/:id/export', testController.exportTestToFile);

// Bulk operations with middleware
router.post('/:testId/bulk-excel', adminMiddleware, excelUpload.single('file'), testController.bulkExcelImport);
router.post('/:testId/bulk-questions', adminMiddleware, testController.bulkQuestionsImport);

export default router;
