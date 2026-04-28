import express from 'express';
import {
  getCategories, createCategory, updateCategory, deleteCategory, seedCategories,
  getSubcategories, createSubcategory, updateSubcategory, deleteSubcategory,
  getSubjects, createSubject, updateSubject, deleteSubject,
  getTopics, createTopic, updateTopic, deleteTopic,
  getFoldersByCourse, createFolder, updateFolder, deleteFolder,
  getPackages, createPackage, updatePackage, deletePackage,
  getSubcourses, createSubcourse, updateSubcourse, deleteSubcourse,
  getInstructors, bulkCreateCourses
} from '../controllers/academic.controller.js';
import { publicLimiter } from '../middleware/security.js';
import { adminMiddleware, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Categories
router.get('/categories', publicLimiter, getCategories);
router.post('/categories', adminMiddleware, createCategory);
router.put('/categories/:id', adminMiddleware, updateCategory);
router.delete('/categories/:id', adminMiddleware, deleteCategory);
router.post('/categories/seed', adminMiddleware, seedCategories);

// Subcategories
router.get('/subcategories', getSubcategories);
router.post('/subcategories', adminMiddleware, createSubcategory);
router.put('/subcategories/:id', adminMiddleware, updateSubcategory);
router.delete('/subcategories/:id', adminMiddleware, deleteSubcategory);

// Subjects
router.get('/subjects', getSubjects);
router.post('/subjects', adminMiddleware, createSubject);
router.put('/subjects/:id', adminMiddleware, updateSubject);
router.delete('/subjects/:id', adminMiddleware, deleteSubject);

// Topics
router.get('/topics', getTopics);
router.post('/topics', adminMiddleware, createTopic);
router.put('/topics/:id', adminMiddleware, updateTopic);
router.delete('/topics/:id', adminMiddleware, deleteTopic);

// Folders
router.get('/courses/:courseId/folders', optionalAuth, getFoldersByCourse);
router.post('/courses/:courseId/folders', adminMiddleware, createFolder);
router.put('/courses/:courseId/folders/:folderId', adminMiddleware, updateFolder);
router.delete('/courses/:courseId/folders/:folderId', adminMiddleware, deleteFolder);

// Instructors
router.get('/instructors', getInstructors);

// Subcourses
router.get('/subcourses', getSubcourses);
router.post('/subcourses', adminMiddleware, createSubcourse);
router.put('/subcourses/:id', adminMiddleware, updateSubcourse);
router.delete('/subcourses/:id', adminMiddleware, deleteSubcourse);

// Packages (Batches)
router.get('/packages', getPackages);
router.post('/packages', adminMiddleware, createPackage);
router.put('/packages/:id', adminMiddleware, updatePackage);
router.delete('/packages/:id', adminMiddleware, deletePackage);

// Bulk Operations
router.post('/courses/bulk', adminMiddleware, bulkCreateCourses);

export default router;
