import express from 'express';
import { uploadImage, uploadPDF, uploadVideo } from '../middleware/upload.middleware.js';
import { authMiddleware } from '../middleware/auth.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../services/cloudinary.service.js';

const router = express.Router();

// ─────────────────────────────────
// POST /api/v2/upload/image
// ─────────────────────────────────
router.post('/v2/upload/image', authMiddleware, uploadImage.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "No image provided" });
  }

  try {
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'aot/images',
      resource_type: 'image',
      allowed_formats: ['jpg', 'png', 'webp', 'gif']
    });

    return res.status(200).json({
      success: true,
      url: result.url,
      public_id: result.public_id,
      format: result.format,
      bytes: result.bytes
    });
  } catch (error) {
    console.error('Image upload failed:', error);
    return res.status(500).json({ success: false, error: "Failed to upload image" });
  }
});

// ─────────────────────────────────
// POST /api/v2/upload/pdf
// ─────────────────────────────────
router.post('/v2/upload/pdf', authMiddleware, uploadPDF.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "No PDF provided" });
  }

  try {
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'aot/pdfs',
      resource_type: 'raw',
      allowed_formats: ['pdf']
    });

    return res.status(200).json({
      success: true,
      url: result.url,
      public_id: result.public_id,
      bytes: result.bytes
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: "Failed to upload PDF" });
  }
});

// ─────────────────────────────────
// POST /api/v2/upload/video
/*
  VIDEO UPLOAD LIMITS:
  Cloudinary Free Plan → 100MB max per video
  Cloudinary Paid Plan → up to 5GB per video
  Current limit: 95MB (set in .env VIDEO_MAX_SIZE_MB)
  To increase limit: upgrade Cloudinary plan and 
  update VIDEO_MAX_SIZE_MB in .env
*/
// ─────────────────────────────────
router.post('/v2/upload/video', authMiddleware, uploadVideo.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "No video provided" });
  }

  // Check file size against Cloudinary free plan limit
  const MAX_VIDEO_BYTES = (parseInt(process.env.VIDEO_MAX_SIZE_MB) || 95) * 1024 * 1024;
  if (req.file.buffer.length > MAX_VIDEO_BYTES) {
    return res.status(400).json({
      success: false,
      error: `Video too large. Maximum size is ${process.env.VIDEO_MAX_SIZE_MB || 95}MB`,
      code: 'FILE_TOO_LARGE',
      maxSizeMB: parseInt(process.env.VIDEO_MAX_SIZE_MB) || 95
    });
  }

  try {
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'aot/videos',
      resource_type: 'video',
      allowed_formats: ['mp4', 'mov', 'webm', 'avi']
    });

    return res.status(200).json({
      success: true,
      url: result.url,
      public_id: result.public_id,
      bytes: result.bytes,
      duration: result.duration || null
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: "Failed to upload video" });
  }
});

// ─────────────────────────────────
// DELETE /api/v2/upload
// ─────────────────────────────────
router.delete('/v2/upload', authMiddleware, async (req, res) => {
  const { public_id, type } = req.query;

  if (!public_id || !type) {
    return res.status(400).json({ success: false, error: "public_id and type required" });
  }

  const allowedTypes = ['image', 'video', 'raw'];
  if (!allowedTypes.includes(type)) {
    return res.status(400).json({ success: false, error: "Type must be image, video or raw" });
  }

  const result = await deleteFromCloudinary(public_id, type);
  if (result.success) {
    return res.status(200).json({ success: true, message: "File deleted successfully" });
  } else {
    return res.status(500).json({ success: false, error: "Failed to delete file" });
  }
});

// ─────────────────────────────────
// GET /api/v2/upload/settings
// ─────────────────────────────────
router.get('/v2/upload/settings', (req, res) => {
  res.json({
    success: true,
    limits: {
      imageMB: process.env.IMAGE_MAX_SIZE_MB || 5,
      pdfMB: process.env.PDF_MAX_SIZE_MB || 10,
      videoMB: process.env.VIDEO_MAX_SIZE_MB || 95
    }
  });
});

export default router;
