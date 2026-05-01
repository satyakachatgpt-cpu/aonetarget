import express from 'express';
import {
  getAllSubjectiveTests,
  createSubjectiveTest,
  updateSubjectiveTest,
  deleteSubjectiveTest,
  deleteAllSubjectiveTests,
  bulkCreateSubjectiveTests,
  bulkUpdateSubjectiveTests
} from '../controllers/subjective.controller.js';
import { adminMiddleware, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Subjective Test Management Routes
router.get('/', optionalAuth, getAllSubjectiveTests);
router.post('/', adminMiddleware, createSubjectiveTest);
router.delete('/', adminMiddleware, deleteAllSubjectiveTests);

// Bulk Operations
router.post('/bulk', adminMiddleware, bulkCreateSubjectiveTests);
router.put('/update-all', adminMiddleware, bulkUpdateSubjectiveTests);

// Specific Test Operations
router.put('/:id', adminMiddleware, updateSubjectiveTest);
router.delete('/:id', adminMiddleware, deleteSubjectiveTest);

export default router;
