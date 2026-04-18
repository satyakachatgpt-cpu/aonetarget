import express from 'express';
import {
  getAllQuestions,
  createQuestion,
  bulkUpdateQuestions,
  updateQuestion,
  deleteQuestion,
  deleteAllQuestions,
  bulkDeleteQuestions,
  bulkCreateQuestions,
  bulkExcelUpload,
  deleteQuestionsByTest
} from '../controllers/question.controller.js';
import { excelUpload } from '../middleware/upload.middleware.js';
import { adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Question Bank Routes
router.get('/', getAllQuestions);
router.post('/', adminMiddleware, createQuestion);
router.put('/update-all', adminMiddleware, bulkUpdateQuestions);
router.delete('/', adminMiddleware, deleteAllQuestions);

// Bulk Operations
router.post('/bulk', adminMiddleware, bulkCreateQuestions);
router.post('/bulk-delete', adminMiddleware, bulkDeleteQuestions);
router.post('/bulk-excel', adminMiddleware, excelUpload.single('file'), bulkExcelUpload);

// Specific Question Operations
router.put('/:id', adminMiddleware, updateQuestion);
router.delete('/:id', adminMiddleware, deleteQuestion);
router.delete('/test/:testId', adminMiddleware, deleteQuestionsByTest);

export default router;
