import express from 'express';
import { getLiveClasses, createLiveClass, updateLiveClass, deleteLiveClass, getLiveVideos, createLiveVideo, updateLiveVideo, deleteLiveVideo, getCourseLiveClasses, deleteCourseLiveClass, startLiveStream, endLiveStream, syncLiveStreamsReconciliation, getStudentLiveClasses } from '../controllers/liveclass.controller.js';
import { authMiddleware, adminMiddleware, studentOwnerOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// Live Video Admin
router.get('/live-videos', getLiveVideos);
router.post('/live-videos', adminMiddleware, createLiveVideo);
router.put('/live-videos/:id', adminMiddleware, updateLiveVideo);
router.delete('/live-videos/:id', adminMiddleware, deleteLiveVideo);

// Live Class Admin
router.get('/live-classes', getLiveClasses);
router.post('/live-classes', adminMiddleware, createLiveClass);
router.put('/live-classes/:id', adminMiddleware, updateLiveClass);
router.delete('/live-classes/:id', adminMiddleware, deleteLiveClass);

// Course Specific Live Classes
router.get('/courses/:courseId/live-classes', getCourseLiveClasses);
router.delete('/courses/:courseId/live-classes/:id', adminMiddleware, deleteCourseLiveClass);

// Streaming Controls (Phase 19H)
router.post('/live-stream/start/:id', adminMiddleware, startLiveStream);
router.post('/live-stream/end/:id', adminMiddleware, endLiveStream);

// Admin Reconciliation
router.post('/admin/sync-live-streams', adminMiddleware, syncLiveStreamsReconciliation);

// Student Live Classes (Stabilization)
router.get('/students/:id/live-classes', authMiddleware, studentOwnerOrAdmin, getStudentLiveClasses);

export default router;
