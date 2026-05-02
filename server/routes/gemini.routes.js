import express from 'express';
import multer from 'multer';
import { parsePDFWithGemini } from '../controllers/gemini.controller.js';
import { adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

router.post('/parse/gemini-pdf', adminMiddleware, upload.single('pdf'), parsePDFWithGemini);

export default router;
