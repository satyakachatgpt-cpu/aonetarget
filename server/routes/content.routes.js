import express from 'express';
import {
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  reorderBanners,
  getNews,
  createNews,
  updateNews,
  deleteNews,
  getQuickLinks,
  createQuickLink,
  updateQuickLink,
  deleteQuickLink,
  reorderQuickLinks,
  getInstructions,
  createInstruction,
  updateInstruction,
  deleteInstruction,
  getBlogPosts,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  getExamDocuments,
  createExamDocument,
  updateExamDocument,
  deleteExamDocument,
  createStandalonePdf,
  deleteAllPdfs,
  bulkCreatePdfs,
  updateAllPdfs,
  updateStandaloneNote,
  deleteStandaloneNote,
  getGenericPdfs,
  updateGenericPdf,
  deleteGenericPdf
} from '../controllers/appContent.controller.js';
import {
  getCourseNotes,
  createCourseNote,
  updateCourseNote,
  deleteCourseNote,
  getCourseVideos,
  createCourseVideo,
  updateCourseVideo,
  deleteCourseVideo
} from '../controllers/courseMedia.controller.js';
import {
  getCoursePosts,
  createCoursePost,
  deleteCoursePost
} from '../controllers/courseSocial.controller.js';
import { importCourseContent } from '../controllers/content.controller.js';
import { signVideoUrl } from '../controllers/mediaUrl.controller.js';
import { authMiddleware, adminMiddleware, optionalAuth } from '../middleware/auth.js';
import { publicLimiter, catalogLimiter } from '../middleware/security.js';

const router = express.Router();

// Banners
router.get('/banners', getBanners);
router.post('/banners', adminMiddleware, createBanner);
router.put('/banners/:id', adminMiddleware, updateBanner);
router.delete('/banners/:id', adminMiddleware, deleteBanner);
router.patch('/banners/reorder', adminMiddleware, reorderBanners);

// News
router.get('/news', getNews);
router.post('/news', adminMiddleware, createNews);
router.put('/news/:id', adminMiddleware, updateNews);
router.delete('/news/:id', adminMiddleware, deleteNews);

// Quick Links
router.get('/quick-links', getQuickLinks);
router.post('/quick-links', adminMiddleware, createQuickLink);
router.put('/quick-links/:id', adminMiddleware, updateQuickLink);
router.delete('/quick-links/:id', adminMiddleware, deleteQuickLink);
router.patch('/quick-links/reorder', adminMiddleware, reorderQuickLinks);

// Instructions
router.get('/instructions', getInstructions);
router.post('/instructions', adminMiddleware, createInstruction);
router.put('/instructions/:id', adminMiddleware, updateInstruction);
router.delete('/instructions/:id', adminMiddleware, deleteInstruction);

// Blog
router.get('/blog', getBlogPosts);
router.post('/blog', adminMiddleware, createBlogPost);
router.put('/blog/:id', adminMiddleware, updateBlogPost);
router.delete('/blog/:id', adminMiddleware, deleteBlogPost);

// Notes (Course-specific)
router.get('/courses/:id/notes', optionalAuth, getCourseNotes);
router.post('/courses/:id/notes', adminMiddleware, createCourseNote);
router.put('/courses/:id/notes/:noteId', adminMiddleware, updateCourseNote);
router.delete('/courses/:id/notes/:noteId', adminMiddleware, deleteCourseNote);

// PDFs (Standalone)
router.get('/pdfs', catalogLimiter, getGenericPdfs);
router.post('/pdfs', adminMiddleware, createStandalonePdf);
router.put('/pdfs/:id', adminMiddleware, updateGenericPdf);
router.delete('/pdfs/:id', adminMiddleware, deleteGenericPdf);
router.delete('/pdfs', adminMiddleware, deleteAllPdfs);
router.post('/pdfs/bulk', adminMiddleware, bulkCreatePdfs);
router.put('/pdfs/update-all', adminMiddleware, updateAllPdfs);

// Notes (Generic / Standalone)
router.put('/notes/:id', adminMiddleware, updateStandaloneNote);
router.delete('/notes/:id', adminMiddleware, deleteStandaloneNote);

router.get('/courses/:id/posts', optionalAuth, getCoursePosts);
router.post('/courses/:id/posts', adminMiddleware, createCoursePost);
router.delete('/courses/:id/posts/:postId', adminMiddleware, deleteCoursePost);

// Videos (Phase 19H & Stabilization)
router.get('/courses/:id/videos', optionalAuth, getCourseVideos);
router.post('/courses/:id/videos', adminMiddleware, createCourseVideo);
router.put('/courses/:id/videos/:videoId', adminMiddleware, updateCourseVideo);
router.delete('/courses/:id/videos/:videoId', adminMiddleware, deleteCourseVideo);
router.post('/video/sign-url', authMiddleware, signVideoUrl);

// Course Import
// Course Import (Changed to avoid route shadowing with /courses/:id)
router.post('/content/import', adminMiddleware, importCourseContent);

// Exam Documents
router.get('/exam-documents', getExamDocuments);
router.post('/exam-documents', adminMiddleware, createExamDocument);
router.put('/exam-documents/:id', adminMiddleware, updateExamDocument);
router.delete('/exam-documents/:id', adminMiddleware, deleteExamDocument);

export default router;
