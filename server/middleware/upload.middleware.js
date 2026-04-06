import multer from 'multer';

// Using memoryStorage for streaming directly to Cloudinary
const storage = multer.memoryStorage();

// Read limits from .env
const IMAGE_LIMIT = (parseInt(process.env.IMAGE_MAX_SIZE_MB) || 5) * 1024 * 1024;
const PDF_LIMIT   = (parseInt(process.env.PDF_MAX_SIZE_MB)   || 10) * 1024 * 1024;
const VIDEO_LIMIT = (parseInt(process.env.VIDEO_MAX_SIZE_MB) || 95) * 1024 * 1024;

// 1. uploadImage
export const uploadImage = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("INVALID_TYPE: Only JPG PNG WEBP GIF allowed"), false);
    }
  },
  limits: { fileSize: IMAGE_LIMIT }
});

// 2. uploadPDF
export const uploadPDF = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error("INVALID_TYPE: Only PDF allowed"), false);
    }
  },
  limits: { fileSize: PDF_LIMIT }
});

// 3. uploadVideo
export const uploadVideo = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("INVALID_TYPE: Only MP4 MOV WEBM AVI allowed"), false);
    }
  },
  limits: { fileSize: VIDEO_LIMIT }
});

// 4. uploadAPK (Legacy Support - rare but kept for compatibility)
export const uploadAPK = multer({
  storage: storage,
  limits: { fileSize: IMAGE_LIMIT } 
});
