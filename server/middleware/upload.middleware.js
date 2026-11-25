import multer from 'multer';
import path from 'path';
import fs from 'fs';

// 1. Storage Configurations
const memoryStorage = multer.memoryStorage();

const tempStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/temp/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/gi, '');
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf', '.docx', '.xlsx', '.csv', '.apk', '.mp4'];
    const safeExt = allowed.includes(ext) ? ext : '.bin';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + safeExt);
  }
});

// Read limits from .env
const IMAGE_LIMIT = (parseInt(process.env.IMAGE_MAX_SIZE_MB) || 5) * 1024 * 1024;
const PDF_LIMIT   = (parseInt(process.env.PDF_MAX_SIZE_MB)   || 100) * 1024 * 1024; // Updated default to 100MB for R2
const VIDEO_LIMIT = (parseInt(process.env.VIDEO_MAX_SIZE_MB) || 95) * 1024 * 1024;

// 1. uploadImage (Keep memory for small images)
export const uploadImage = multer({
  storage: memoryStorage,
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

// 2. uploadDocument (Use disk for larger docs)
export const uploadPDF = multer({
  storage: tempStorage,
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain'
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("INVALID_TYPE: Only PDF, Word, Excel, CSV, PPT, and Text files allowed"), false);
    }
  },
  limits: { fileSize: PDF_LIMIT }
});

// 3. uploadVideo (Use disk for large videos)
export const uploadVideo = multer({
  storage: tempStorage,
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

// 4. uploadAPK (Standardized Disk Storage for larger files)
const apkStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/apks/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/gi, '');
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf', '.docx', '.xlsx', '.csv', '.apk', '.mp4'];
    const safeExt = allowed.includes(ext) ? ext : '.bin';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + safeExt);
  }
});

export const apkUpload = multer({
  storage: apkStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.apk' || file.mimetype === 'application/vnd.android.package-archive' || file.mimetype === 'application/octet-stream') {
      cb(null, true);
    } else {
      cb(new Error('Only Android .apk files are allowed'), false);
    }
  }
});

// 5. excelUpload (Standalone Memory Storage for parsing)
export const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});
