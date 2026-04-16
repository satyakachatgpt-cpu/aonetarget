import express from 'express';
import {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  deleteAllStudents,
  bulkCreateStudents,
  updateAllStudents,
  bulkCreateFromExcel,
  getDownloads,
  createDownload,
  deleteDownload,
  getWatchHistory,
  saveWatchHistory,
  clearWatchHistory
} from '../controllers/student.controller.js';
import * as authController from '../controllers/auth.controller.js';
import { excelUpload } from '../middleware/upload.middleware.js';
import { publicLimiter } from '../middleware/security.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

const studentOwnerOrAdmin = (req, res, next) => {
  if (req.admin || req.user?.isAdmin || req.user?.role === 'admin') return next();
  const tokenStudentId = req.user?.studentId;
  if (tokenStudentId && String(tokenStudentId) === String(req.params.id)) return next();
  return res.status(403).json({ error: 'Forbidden' });
};

// 1. Session / Validation (Specific)
router.post('/session/validate', authController.validateSession);
router.post('/check-phone', publicLimiter, authController.checkPhone);
router.post('/check-email', publicLimiter, authController.checkEmail);

// 2. Bulk Operations
router.post('/bulk-excel', adminMiddleware, excelUpload.single('file'), bulkCreateFromExcel);
router.post('/bulk', adminMiddleware, bulkCreateStudents);
router.put('/update-all', adminMiddleware, updateAllStudents);

// 3. Activity / Assets (Phase 19F)
router.get('/:id/downloads', authMiddleware, studentOwnerOrAdmin, getDownloads);
router.post('/:id/downloads', authMiddleware, studentOwnerOrAdmin, createDownload);
router.delete('/:id/downloads/:downloadId', authMiddleware, studentOwnerOrAdmin, deleteDownload);
router.get('/:id/watch-history', authMiddleware, studentOwnerOrAdmin, getWatchHistory);
router.post('/:id/watch-history', authMiddleware, studentOwnerOrAdmin, saveWatchHistory);
router.delete('/:id/watch-history', authMiddleware, studentOwnerOrAdmin, clearWatchHistory);

// 4. Individual Student (Wildcard)
router.get('/:id', authMiddleware, studentOwnerOrAdmin, getStudentById);
router.put('/:id', authMiddleware, studentOwnerOrAdmin, updateStudent);
router.delete('/:id', adminMiddleware, deleteStudent);

// 4. General / Collection
router.get('/', adminMiddleware, getStudents);
router.post('/', adminMiddleware, createStudent);
router.delete('/', adminMiddleware, deleteAllStudents);

export default router;
