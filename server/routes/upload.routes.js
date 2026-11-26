import express from 'express';
import path from 'path';
import { uploadImage, uploadPDF, uploadVideo, uploadNewsPDF } from '../middleware/upload.middleware.js';
import { authMiddleware } from '../middleware/auth.js';
import { uploadLimiter, videoUploadLimiter } from '../middleware/security.js';
import { uploadToCloudinary, deleteFromCloudinary, uploadBase64ToCloudinary } from '../services/cloudinary.service.js';
import { uploadFileToR2 } from '../services/r2.service.js';
import fs from 'fs';

const router = express.Router();

// ─────────────────────────────────
// GET /api/v2/upload/presigned-url (Direct Upload Support)
// ─────────────────────────────────
router.get('/v2/upload/presigned-url', authMiddleware, async (req, res) => {
  try {
    const { filename, fileType } = req.query;
    
    if (!filename || !fileType) {
      return res.status(400).json({ success: false, error: "Filename and fileType are required" });
    }

    if (process.env.PDF_STORAGE_PROVIDER !== 'r2') {
      return res.status(400).json({ success: false, error: "Direct upload is only supported for R2 storage" });
    }

    const { getPresignedUrl } = await import('../services/r2.service.js');
    const result = await getPresignedUrl(filename, fileType);

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Failed to generate presigned URL:', error);
    return res.status(500).json({ success: false, error: "Failed to generate presigned URL" });
  }
});

// ─────────────────────────────────
// POST /api/upload (CKEditor 4 Direct Image Upload with Cloudinary & disk fallback)
// ─────────────────────────────────
router.post('/upload', (req, res, next) => {
  uploadImage.any()(req, res, (err) => {
    if (err) {
      console.error('CKEditor Multer Error:', err);
      return res.status(200).json({ uploaded: 0, error: { message: err.message || "Multer error" } });
    }
    req.file = (req.files && req.files[0]) || req.file;
    next();
  });
}, async (req, res) => {
  if (!req.file) {
    return res.status(200).json({ uploaded: 0, error: { message: "No image file provided" } });
  }

  try {
    let imageUrl = '';
    try {
      const result = await uploadToCloudinary(req.file.buffer, {
        folder: 'aot/images',
        resource_type: 'image'
      });
      imageUrl = result.url;
    } catch (cloudErr) {
      console.warn('Cloudinary upload fallback to server disk for editor image:', cloudErr.message);
      // Fallback: save to server/uploads/news_images/
      const imgDir = path.resolve(__dirname, '../uploads/news_images');
      if (!fs.existsSync(imgDir)) {
        fs.mkdirSync(imgDir, { recursive: true });
      }
      const ext = path.extname(req.file.originalname) || '.png';
      const fileName = `editor-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
      const filePath = path.join(imgDir, fileName);
      fs.writeFileSync(filePath, req.file.buffer);
      imageUrl = `/uploads/news_images/${fileName}`;
    }

    // Support CKEditor 4 iframe callback
    if (req.query.CKEditorFuncNum) {
      return res.send(`
        <script type="text/javascript">
          window.parent.CKEDITOR.tools.callFunction(${req.query.CKEditorFuncNum}, "${imageUrl}", "");
        </script>
      `);
    }

    // Support CKEditor 4 JSON response (XHR / Drag-Drop / Paste)
    return res.status(200).json({
      uploaded: 1,
      fileName: req.file.originalname,
      url: imageUrl
    });
  } catch (err) {
    console.error('CKEditor upload error:', err);
    if (req.query.CKEditorFuncNum) {
      return res.send(`
        <script type="text/javascript">
          window.parent.CKEDITOR.tools.callFunction(${req.query.CKEditorFuncNum}, "", "${err.message || 'Upload failed'}");
        </script>
      `);
    }
    return res.status(200).json({ uploaded: 0, error: { message: err.message || "Upload failed" } });
  }
});

// ─────────────────────────────────
// POST /api/v2/upload/image
// ─────────────────────────────────
router.post('/v2/upload/image', authMiddleware, uploadLimiter, uploadImage.single('file'), async (req, res) => {
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
// POST /api/v2/upload/image/base64
// ─────────────────────────────────
router.post('/v2/upload/image/base64', authMiddleware, uploadLimiter, async (req, res) => {
  const { image } = req.body;
  if (!image) {
    return res.status(400).json({ success: false, error: "No image data provided" });
  }

  try {
    const result = await uploadBase64ToCloudinary(image, {
      folder: 'aot/images/diagrams',
      resource_type: 'image'
    });

    return res.status(200).json({
      success: true,
      url: result.url,
      public_id: result.public_id,
      format: result.format,
      bytes: result.bytes
    });
  } catch (error) {
    console.error('Base64 image upload failed:', error);
    return res.status(500).json({ success: false, error: "Failed to upload base64 image" });
  }
});

// ─────────────────────────────────
// POST /api/v2/upload/news-pdf (Direct Server Disk Storage for News / Job Vacancy PDFs)
// ─────────────────────────────────
const handleNewsPdfUpload = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "No PDF file provided" });
  }

  try {
    // Relative path accessible via static /uploads route
    const fileName = path.basename(req.file.path);
    const relativeUrl = `/uploads/news_pdfs/${fileName}`;

    // Format file size nicely
    const bytes = req.file.size;
    let formattedSize = `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes >= 1024 * 1024) {
      formattedSize = `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    return res.status(200).json({
      success: true,
      url: relativeUrl,
      fileName: req.file.originalname,
      size: formattedSize,
      bytes: bytes
    });
  } catch (error) {
    console.error('News PDF upload failed:', error);
    return res.status(500).json({ success: false, error: "Failed to upload news PDF to server" });
  }
};

router.post('/v2/upload/news-pdf', authMiddleware, uploadNewsPDF.single('file'), handleNewsPdfUpload);
router.post('/upload/news-pdf', authMiddleware, uploadNewsPDF.single('file'), handleNewsPdfUpload);

// POST /api/v2/upload/pdf (Handles all documents: PDF, Word, Excel, etc.)
router.post('/v2/upload/pdf', authMiddleware, uploadLimiter, uploadPDF.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "No document provided" });
  }

  try {
    let result;
    
    // Check if R2 is configured as the storage provider for documents
    if (process.env.PDF_STORAGE_PROVIDER === 'r2') {
      result = await uploadFileToR2(req.file.path, req.file.originalname, req.file.mimetype);
    } else {
      // Using auto resource_type for documents. req.file.path is available from diskStorage
      result = await uploadToCloudinary(req.file.path, {
        folder: 'aot/documents',
        resource_type: 'auto'
      });
    }

    return res.status(200).json({
      success: true,
      url: result.url,
      public_id: result.public_id,
      bytes: result.bytes,
      format: result.format,
      storage: result.storage || 'cloudinary',
      provider: result.provider || 'cloudinary'
    });
  } catch (error) {
    console.error('Document upload failed:', error);
    return res.status(500).json({ success: false, error: "Failed to upload document" });
  } finally {
    // Cleanup temporary file
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Failed to delete temp file:', req.file.path, err);
      });
    }
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
router.post('/v2/upload/video', authMiddleware, videoUploadLimiter, uploadVideo.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "No video provided" });
  }

  // Check file size (req.file.size is provided by multer)
  const MAX_VIDEO_BYTES = (parseInt(process.env.VIDEO_MAX_SIZE_MB) || 95) * 1024 * 1024;
  if (req.file.size > MAX_VIDEO_BYTES) {
    // Cleanup before returning
    if (req.file.path) fs.unlinkSync(req.file.path);

    return res.status(400).json({
      success: false,
      error: `Video too large. Maximum size is ${process.env.VIDEO_MAX_SIZE_MB || 95}MB`,
      code: 'FILE_TOO_LARGE',
      maxSizeMB: parseInt(process.env.VIDEO_MAX_SIZE_MB) || 95
    });
  }

  try {
    const result = await uploadToCloudinary(req.file.path, {
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
    console.error('Video upload failed:', error);
    return res.status(500).json({ success: false, error: "Failed to upload video" });
  } finally {
    // Cleanup temporary file
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Failed to delete temp video file:', req.file.path, err);
      });
    }
  }
});

// ─────────────────────────────────
// DELETE /api/v2/upload
// ─────────────────────────────────
router.delete('/v2/upload', authMiddleware, uploadLimiter, async (req, res) => {
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
      pdfMB: process.env.PDF_MAX_SIZE_MB || 50,
      videoMB: process.env.VIDEO_MAX_SIZE_MB || 95
    }
  });
});

export default router;
