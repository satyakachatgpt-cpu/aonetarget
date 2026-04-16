import express from 'express';
import {
  getVideos,
  createVideo,
  updateVideo,
  deleteVideo,
  deleteAllVideosAdmin,
  bulkCreateVideos,
  bulkUpdateVideos,
  getVideoStream
} from '../controllers/asset.controller.js';
import { adminMiddleware, verifySignedUrl } from '../middleware/auth.js';

const router = express.Router();

// General Video Asset Routes
router.get('/videos', getVideos);
router.post('/videos', adminMiddleware, createVideo);
router.put('/videos/:id', adminMiddleware, updateVideo);
router.delete('/videos/:id', adminMiddleware, deleteVideo);

// Bulk & Admin Operations
router.post('/videos/bulk', adminMiddleware, bulkCreateVideos);
router.put('/videos/update-all', adminMiddleware, bulkUpdateVideos);
router.delete('/videos', adminMiddleware, deleteAllVideosAdmin);

// Secure Video Streaming (Stabilization)
router.get('/secure-video/:filename', verifySignedUrl, getVideoStream);

export default router;
