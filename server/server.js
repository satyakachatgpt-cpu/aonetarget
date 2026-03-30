import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from "url";
import path from 'path';
import fs from 'fs';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import * as XLSX from 'xlsx';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dns from 'dns';
import {
  generateTokens, verifyAccessToken, verifyRefreshToken,
  authMiddleware, optionalAuth, generateDeviceId,
  generateSignedUrl, verifySignedUrl
} from './middleware/auth.js';
import compression from 'compression';
import { globalLimiter, authLimiter, securityHeaders, sanitizeInput } from './middleware/security.js';
import { sendEmail, templates } from './utils/email.js';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';



// Config moved to top
const app = express();
console.log('============================================');
console.log('SERVER IS STARTING (VERSION: EMAIL_FIX_v1)');
console.log('============================================');
app.use(compression());
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
const isProduction = process.env.NODE_ENV === 'production';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(securityHeaders);
app.use(cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-client-id'
  ],
  maxAge: 86400
}));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(sanitizeInput);
app.use(cookieParser());
app.use('/api/', globalLimiter);

const rootPath = path.resolve(__dirname, '..');
app.use('/attach-assist', express.static(path.join(__dirname, '../client/public/attach-assist')));
// Redirect old path to new path for database compatibility
app.use('/attached_assets', (req, res, next) => {
  // Try to serve statically from old path first if it exists, otherwise redirect
  const oldPath = path.join(__dirname, '../attached_assets', req.path);
  if (fs.existsSync(oldPath) && !fs.lstatSync(oldPath).isDirectory()) {
    return express.static(path.join(__dirname, '../attached_assets'))(req, res, next);
  }
  res.redirect(301, `/attach-assist${req.path}`);
});

// Routes
app.get('/api/secure-video/:filename', authMiddleware, async (req, res) => {
  try {
    const { filename } = req.params;
    const { sig, exp } = req.query;

    if (sig && exp) {
      if (!verifySignedUrl(filename, sig, exp)) {
        return res.status(403).json({ error: 'Invalid or expired video URL' });
      }
    }

    let student = null;

    if (req.user) {
      student = await db.collection('students').findOne({
        $or: [
          { id: req.user.studentId },
          ...(req.user.studentId && /^[a-f\d]{24}$/i.test(req.user.studentId) ? [{ _id: new ObjectId(req.user.studentId) }] : [])
        ]
      });
    } else if (req._legacySession && req.cookies.sessionToken) {
      student = await db.collection('students').findOne({ sessionToken: req.cookies.sessionToken });
    }

    if (!student) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const filePath = path.join(__dirname, 'uploads', filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'inline');

    const stat = fs.statSync(filePath);
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize
      });

      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.setHeader('Content-Length', stat.size);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    console.error('Secure video error:', error);
    res.status(500).json({ error: 'Failed to stream video' });
  }
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf',
      'video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov',
      'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv', 'video/mpeg',
      'application/vnd.android.package-archive',
      'application/octet-stream',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv', 'text/plain',
      'application/csv'
    ];
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(null, true); // accept all for now to avoid issues with browser mime type detection
  }
});

// Excel/CSV file parser middleware
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path === '/health') {
    const logMsg = `[${new Date().toISOString()}] ${req.method} ${req.path}\n`;
    console.log(logMsg);
    try {
      fs.appendFileSync(path.join(__dirname, 'api_requests.log'), logMsg);
    } catch (e) { }
  }
  if (req.path.startsWith('/api') && !db) {
    return res.status(503).json({ error: 'Database connecting, please retry' });
  }
  next();
});

if (isProduction) {
  app.use(express.static(path.join(__dirname, "dist")));
}


import mongoose from 'mongoose';
const { ObjectId } = mongoose.Types;

// Import Mongoose Models
import Student from './models/Student.js';
import Course from './models/Course.js';
import Folder from './models/Folder.js';
import Category from './models/Category.js';
import Video from './models/Video.js';
import Post from './models/Post.js';

let db;

// MongoDB Connection with Mongoose
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: 'aonetarget',
      serverSelectionTimeoutMS: 10000 // Give more time for Atlas handshake
    });

    db = mongoose.connection.db;
    console.log('MongoDB connected successfully with Mongoose');

    try {
      const existingIndexes = await db.collection('students').indexes();
      const existingNames = existingIndexes.map(i => i.name);
      if (!existingNames.includes('phone_1')) {
        await db.collection('students').createIndex({ phone: 1 }, { unique: true, sparse: true });
      }
      if (!existingNames.includes('sessionToken_1')) {
        await db.collection('students').createIndex({ sessionToken: 1 }, { sparse: true });
      }
      if (!existingNames.includes('id_1')) {
        await db.collection('students').createIndex({ id: 1 }, { sparse: true });
      }
      await db.collection('videos').createIndex({ courseId: 1 });
      await db.collection('videos').createIndex({ folderId: 1 });
      await db.collection('courses').createIndex({ id: 1 }, { sparse: true });
      await db.collection('packages').createIndex({ id: 1 }, { sparse: true });
      await db.collection('folders').createIndex({ courseId: 1, parentId: 1 });
      await db.collection('tests').createIndex({ courseId: 1 });
      await db.collection('pdfs').createIndex({ courseId: 1 });
      console.log('MongoDB indexes ensured');
    } catch (indexErr) {
      console.warn('Index creation warning (non-fatal):', indexErr.message);
    }
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Watch Progress API
app.get('/api/watch-progress/:courseId/:videoId', authMiddleware, async (req, res) => {
  try {
    const progress = await db.collection('watch_progress').findOne({
      userId: req.user.studentId,
      videoId: req.params.videoId
    });
    res.json(progress || { watchedTime: 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/watch-progress', authMiddleware, async (req, res) => {
  const { courseId, videoId, watchedTime } = req.body;
  try {
    await db.collection('watch_progress').updateOne(
      { userId: req.user.studentId, videoId },
      { $set: { courseId, watchedTime, updatedAt: new Date() } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Initialize DB on startup
connectDB();

// File Upload endpoint
app.get('/api/ping', (req, res) => {
  console.log('Ping received');
  res.json({ message: 'pong', timestamp: new Date(), version: '1.0.3' });
});

// === Watch History Routes ===
app.get('/api/students/:studentId/watch-history', async (req, res) => {
  try {
    const { studentId } = req.params;
    const history = await db.collection('watchHistory')
      .find({ studentId })
      .sort({ watchedAt: -1 })
      .limit(100)
      .toArray();
    res.json(history);
  } catch (error) {
    console.error('Fetch watch history error:', error);
    res.status(500).json({ error: 'Failed to fetch watch history' });
  }
});

app.post('/api/students/:studentId/watch-history', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { videoId, title, courseId, courseTitle, thumbnail, duration, watchProgress } = req.body;

    if (!videoId) return res.status(400).json({ error: 'videoId is required' });

    const now = new Date();
    await db.collection('watchHistory').updateOne(
      { studentId, videoId },
      {
        $set: {
          studentId,
          videoId,
          title: title || '',
          courseId: courseId || '',
          courseTitle: courseTitle || '',
          thumbnail: thumbnail || '',
          duration: duration || '',
          watchProgress: watchProgress || 0,
          watchedAt: now
        }
      },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update watch history error:', error);
    res.status(500).json({ error: 'Failed to update watch history' });
  }
});
// === End Watch History Routes ===

// Routes for Folders
app.get('/api/courses/:courseId/folders', async (req, res) => {
  try {
    const course = await findCourse(req.params.courseId);
    if (!course) return res.json([]);

    const idVariants = await getRelatedCourseIds(course, req.params.courseId);
    const query = {
      courseId: { $in: idVariants }
    };
    const folders = await Folder.find(query).sort({ order: 1, sortingOrder: 1 }).lean();
    res.json(folders || []);
  } catch (error) {
    console.error('Fetch folders error:', error);
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

app.post('/api/courses/:courseId/folders', async (req, res) => {
  try {
    const folderData = {
      ...req.body,
      courseId: req.params.courseId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const folder = new Folder(folderData);
    await folder.save();
    res.status(201).json(folder);
  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/courses/:courseId/folders/:folderId', async (req, res) => {
  console.log(`PUT /api/courses/${req.params.courseId}/folders/${req.params.folderId}`);
  try {
    const course = await findCourse(req.params.courseId);
    const folderId = req.params.folderId;

    const query = {
      $or: [
        { id: folderId },
        { _id: ObjectId.isValid(folderId) ? new ObjectId(folderId) : null }
      ].filter(v => v.id || v._id)
    };

    if (course) {
      query.courseId = { $in: [course.id, course._id.toString(), req.params.courseId] };
    }

    const { _id, ...updateData } = req.body;
    const result = await Folder.updateOne(
      query,
      { $set: { ...updateData, updatedAt: new Date() } }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Folder not found' });
    res.json({ success: true, message: 'Folder updated' });
  } catch (error) {
    console.error('Update folder error:', error);
    res.status(500).json({ error: 'Failed to update folder' });
  }
});

app.delete('/api/courses/:courseId/folders/:folderId', async (req, res) => {
  console.log(`DELETE /api/courses/${req.params.courseId}/folders/${req.params.folderId}`);
  try {
    const course = await findCourse(req.params.courseId);
    const folderId = req.params.folderId;
    const courseId = course ? (course.id || course._id.toString()) : req.params.courseId;

    // Local helper to normalize an ID to a plain string
    const toStr = (id) => (id ? id.toString() : null);

    // Recursive function to find all nested folder IDs (as strings)
    const getAllNestedFolderIds = async (id) => {
      let ids = [toStr(id)].filter(Boolean);
      const subFolders = await Folder.find({
        $or: [
          { parentId: id },
          { parentId: toStr(id) },
          ...(ObjectId.isValid(id) ? [{ parentId: new ObjectId(id) }] : [])
        ],
        courseId: courseId
      }).lean();

      for (const sub of subFolders) {
        const subId = toStr(sub.id || sub._id);
        if (subId) {
          const nestedIds = await getAllNestedFolderIds(subId);
          ids = [...ids, ...nestedIds];
        }
      }
      return ids;
    };

    const allFolderStringIds = Array.from(new Set(await getAllNestedFolderIds(folderId)));
    const allFolderObjectIds = allFolderStringIds
      .filter(id => ObjectId.isValid(id))
      .map(id => new ObjectId(id));

    // Filter for all folders to delete (match by custom string id OR ObjectId _id)
    const folderFilter = {
      $or: [
        { id: { $in: allFolderStringIds } },
        { _id: { $in: allFolderObjectIds } }
      ]
    };

    // Filter for all content within those folders
    const contentFilter = {
      $or: [
        { folderId: { $in: allFolderStringIds } },
        { folderId: { $in: allFolderObjectIds } }
      ]
    };

    // Delete content within these folders and the folders themselves
    await Promise.all([
      db.collection('videos').deleteMany(contentFilter),
      db.collection('notes').deleteMany(contentFilter),
      db.collection('pdfs').deleteMany(contentFilter),
      db.collection('tests').deleteMany(contentFilter),
      Folder.deleteMany(folderFilter)
    ]);

    res.json({ success: true, message: 'Folder and its content deleted' });
  } catch (error) {
    console.error('Delete folder error:', error);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      url: fileUrl,
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// ✅ REAL DOCX Generation Endpoint
app.post('/api/generate-docx', async (req, res) => {
  try {
    const { questions, title = 'Question Paper' } = req.body;
    if (!questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'Questions array required' });
    }

    const children = [
      new Paragraph({
        text: title.toUpperCase(),
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 }
      })
    ];

    questions.forEach((q, idx) => {
      // Question Header
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `Question ${idx + 1}: `, bold: true, size: 28 }),
          new TextRun({ text: (q.questionEn || q.question || '').replace(/<[^>]*>/g, '').trim(), size: 28 })
        ],
        spacing: { before: 400, after: 200 }
      }));

      // Options
      if (q.options && Array.isArray(q.options)) {
        q.options.forEach((opt, optIdx) => {
          children.push(new Paragraph({
            children: [
              new TextRun({ text: `${String.fromCharCode(65 + optIdx)}) `, bold: true, size: 24 }),
              new TextRun({ text: String(opt).replace(/<[^>]*>/g, '').trim(), size: 24 })
            ],
            indent: { left: 400 },
            spacing: { after: 100 }
          }));
        });
      }

      // Metadata (Answer & Marks)
      children.push(new Paragraph({
        children: [
          new TextRun({ text: "Correct Answer: ", bold: true, size: 22 }),
          new TextRun({ text: String(q.correctAnswer || '').toUpperCase(), bold: true, color: "008000", size: 22 }),
          new TextRun({ text: "    |    ", size: 22 }),
          new TextRun({ text: `Marks: +${q.positiveMarks} / ${q.negativeMarks}`, size: 22 })
        ],
        spacing: { before: 200, after: 300 }
      }));
    });

    const doc = new Document({
      sections: [{ children }]
    });

    const buffer = await Packer.toBuffer(doc);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="output.docx"');
    res.send(buffer);
  } catch (err) {
    console.error('DOCX Generation Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// APK Download endpoint - serves the latest APK file
app.get('/api/download/apk', (req, res) => {
  try {
    // Directories to search for APK
    const searchDirs = [
      path.join(__dirname, 'uploads'),
      path.join(__dirname, 'attached_assets'),
      path.join(__dirname, 'apk'),
      __dirname
    ];

    let apkPath = null;
    for (const dir of searchDirs) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        const apkFiles = files.filter(f => f.endsWith('.apk')).sort().reverse(); // Latest first
        if (apkFiles.length > 0) {
          apkPath = path.join(dir, apkFiles[0]);
          break;
        }
      }
    }

    if (apkPath && fs.existsSync(apkPath)) {
      const filename = path.basename(apkPath);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.sendFile(apkPath);
    } else {
      res.status(404).json({ error: 'APK file not found. Please upload via admin panel.' });
    }
  } catch (error) {
    console.error('APK download error:', error);
    res.status(500).json({ error: 'Failed to serve APK' });
  }
});

// APK upload endpoint (admin only)
app.post('/api/upload/apk', upload.single('apk'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No APK file uploaded' });
    const apkDir = path.join(__dirname, 'uploads');
    const newName = `AoneTarget_Latest_${Date.now()}.apk`;
    const newPath = path.join(apkDir, newName);
    fs.renameSync(req.file.path, newPath);
    res.json({ success: true, message: 'APK uploaded successfully', filename: newName });
  } catch (error) {
    console.error('APK upload error:', error);
    res.status(500).json({ error: 'APK upload failed' });
  }
});

// Routes for Courses
app.get('/api/courses', async (req, res) => {
  try {
    const filter = {};
    if (req.query.examType) filter.examType = req.query.examType;
    if (req.query.contentType) filter.contentType = req.query.contentType;
    if (req.query.subject) filter.subject = req.query.subject;
    if (req.query.boardType) filter.boardType = req.query.boardType;
    if (req.query.categoryId) filter.categoryId = req.query.categoryId;
    if (req.query.subcategoryId) filter.subcategoryId = req.query.subcategoryId;
    if (req.query.category) {
      filter.category = { $regex: req.query.category, $options: 'i' };
    }

    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { title: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const limit = parseInt(req.query.limit);
    const skip = parseInt(req.query.skip);
    const page = parseInt(req.query.page) || 1;

    let computedSkip = 0;
    if (!isNaN(skip)) {
      computedSkip = skip;
    } else if (!isNaN(limit)) {
      computedSkip = (page - 1) * limit;
    }

    let query = Course.find(filter);

    if (!isNaN(limit) && limit > 0) {
      query = query.skip(computedSkip).limit(limit);
    }

    const courses = await query.lean();

    // Fetch video counts for each course
    const coursesWithCounts = await Promise.all(courses.map(async (c) => {
      const courseId = c.id || c._id.toString();
      const videoCount = await Video.countDocuments({
        courseId: { $in: [courseId, c._id.toString()] }
      });
      return {
        ...c,
        id: courseId,
        lessons: videoCount,
        videoCount: videoCount
      };
    }));

    if (!isNaN(limit) && limit > 0) {
      const totalCourses = await Course.countDocuments(filter);
      res.json({
        courses: coursesWithCounts,
        total: totalCourses,
        totalCourses,
        currentPage: page,
        totalPages: Math.ceil(totalCourses / limit)
      });
    } else {
      res.json(coursesWithCounts);
    }
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

app.post('/api/courses', async (req, res) => {
  try {
    const course = new Course(req.body);
    await course.save();
    res.status(201).json(course);
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Failed to create course: ' + error.message });
  }
});

app.put('/api/courses', async (req, res) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates)) return res.status(400).json({ error: 'Updates must be an array' });

    for (const update of updates) {
      const { id, ...data } = update;
      const { _id, ...updateData } = data;
      let filter = { id: id };
      if (ObjectId.isValid(id)) filter = { _id: new ObjectId(id) };
      await db.collection('courses').updateOne(
        filter,
        { $set: { ...updateData, updatedAt: new Date().toISOString() } }
      );
    }
    res.json({ success: true, message: `Updated ${updates.length} courses` });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Failed to bulk update courses' });
  }
});

// DELETE ALL courses
app.delete('/api/courses', async (req, res) => {
  try {
    const result = await db.collection('courses').deleteMany({});
    res.json({ success: true, message: `Deleted ${result.deletedCount} courses` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete all courses' });
  }
});

// Bulk create courses
app.post('/api/courses/bulk', async (req, res) => {
  try {
    const { courses } = req.body;
    if (!Array.isArray(courses) || courses.length === 0) return res.status(400).json({ error: 'No courses provided' });
    const result = await db.collection('courses').insertMany(courses);
    res.status(201).json({ success: true, inserted: result.insertedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk create courses' });
  }
});


// Specific routes follow below...




// Routes for Instructors
app.get('/api/instructors', async (req, res) => {
  try {
    const instructors = await db.collection('instructors').find({}).toArray();
    res.json(instructors);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch instructors' });
  }
});

// Routes for Course Videos
// Helper to find a course by any ID (custom or ObjectId)
async function findCourse(id) {
  if (!id) return null;
  const collections = ['courses', 'packages', 'testSeries', 'test-series', 'subcourses', 'tests', 'test_series'];

  for (const colName of collections) {
    try {
      // Try custom id or slug first
      let item = await db.collection(colName).findOne({
        $or: [
          { id: id },
          { slug: id }
        ]
      });

      // Try _id as string or ObjectId
      if (!item) {
        item = await db.collection(colName).findOne({ _id: id });
      }
      if (!item && ObjectId.isValid(id)) {
        item = await db.collection(colName).findOne({ _id: new ObjectId(id) });
      }

      if (item) return item;
    } catch (e) {
      console.warn(`Search in ${colName} failed:`, e.message);
    }
  }

  return null;
}

// Helper for dynamic stream status calculation
function calculateStreamStatus(item) {
  const now = new Date();
  const startTimeVal = item.startTime || item.publishOn || item.date || item.startDateTime || item.createdAt;
  const startTime = new Date(startTimeVal);
  
  // If manual status is 'ended', always return 'ended'
  if (item.status === 'ended' || item.status === 'inactive' || item.status === 'completed') {
    return 'ended';
  }

  const duration = parseInt(item.duration) || 60; // Default 60 mins if missing
  const endTimeVal = item.endTime || item.endDateTime;
  const endTime = endTimeVal ? new Date(endTimeVal) : new Date(startTime.getTime() + duration * 60 * 1000);
  
  const joinBeforeMin = parseInt(item.joinBeforeMinutes) || 10;
  const joinTime = new Date(startTime.getTime() - joinBeforeMin * 60 * 1000);

  if (now < joinTime) {
    return 'upcoming';
  } else if (now >= joinTime && now <= endTime) {
    return 'live';
  } else {
    return 'ended';
  }
}

// Function to find all related IDs by name and/or slug/id for content linking
async function getCourseIdVariants(courseId) {
  if (!courseId) return [];
  const course = await findCourse(courseId);
  return getRelatedCourseIds(course, String(courseId));
}

async function getRelatedCourseIds(course, originalId) {
  if (!course) return [originalId].filter(Boolean);

  const relatedIds = new Set([
    String(course.id || ''),
    String(course._id || ''),
    originalId
  ].filter(Boolean));

  // Also check names or titles for cross-collection linking
  const names = [course.name, course.title].filter(Boolean);
  if (names.length > 0) {
    const allPossibleCollections = ['courses', 'packages', 'subcourses', 'testSeries', 'test-series', 'test_series'];
    for (const col of allPossibleCollections) {
      try {
        // Escape special regex characters in names
        const escapedNames = names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const matchedItems = await db.collection(col).find({
          $or: [
            { name: { $in: names } },
            { title: { $in: names } },
            { name: { $regex: new RegExp("^" + escapedNames[0] + "$", "i") } }, // Case-insensitive exact name match
            { title: { $regex: new RegExp("^" + escapedNames[0] + "$", "i") } } // Case-insensitive exact title match
          ]
        }).project({ _id: 1, id: 1 }).toArray();

        matchedItems.forEach(item => {
          if (item._id) relatedIds.add(item._id.toString());
          if (item.id) relatedIds.add(item.id.toString());
        });
      } catch (e) { }
    }
  }

  return Array.from(relatedIds);
}

// Alias for getRelatedCourseIds used in some parts of the code


// Routes for Course Videos
app.get('/api/courses/:id/videos', async (req, res) => {
  try {
    const course = await findCourse(req.params.id);
    if (!course) return res.json([]);

    const idVariants = await getRelatedCourseIds(course, req.params.id);
    let videos = await db.collection('videos').find({ courseId: { $in: idVariants } }).sort({ order: 1 }).toArray();

    if (videos.length === 0) {
      const courseNames = [course.name, course.title].filter(Boolean);
      if (courseNames.length > 0) {
        videos = await db.collection('videos').find({
          $or: [
            { course: { $in: courseNames } },
            { courseId: { $in: idVariants } }
          ]
        }).sort({ order: 1 }).toArray();
      }
    }

    res.json(videos);
  } catch (error) {
    console.error('Fetch videos error:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});
// Import Content Route (copy or move items between courses)
app.post('/api/courses/import', async (req, res) => {
  console.log('[AGENT_ROUTER] POST /api/courses/import', req.body);
  try {
    const { sourceCourseId, targetCourseId, itemIds, action } = req.body;
    if (!sourceCourseId || !targetCourseId || !itemIds || !Array.isArray(itemIds)) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const collections = ['folders', 'videos', 'notes', 'tests'];
    let processedCount = 0;

    for (const itemId of itemIds) {
      let itemToProcess = null;
      let targetCollection = null;

      const isOid = /^[a-fA-F0-9]{24}$/.test(String(itemId));
      const queryList = [{ id: String(itemId) }];
      if (isOid) {
        try {
          queryList.push({ _id: new ObjectId(itemId) });
          queryList.push({ _id: String(itemId) });
        } catch (e) { }
      }

      for (const collName of collections) {
        const found = await db.collection(collName).findOne({ $or: queryList });
        if (found) {
          itemToProcess = found;
          targetCollection = collName;
          break;
        }
      }

      if (itemToProcess && targetCollection) {
        if (action === 'copy') {
          const newItem = { ...itemToProcess };
          delete newItem._id;
          newItem.id = `${targetCollection}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          newItem.courseId = String(targetCourseId);
          newItem.folderId = null; // Put in root folder
          newItem.createdAt = new Date().toISOString();
          await db.collection(targetCollection).insertOne(newItem);
        } else if (action === 'move') {
          let updatedCourseId = String(targetCourseId);
          await db.collection(targetCollection).updateOne(
            { _id: itemToProcess._id },
            { $set: { courseId: updatedCourseId, folderId: null } }
          );
        }
        processedCount++;
      }
    }

    res.status(200).json({ success: true, processed: processedCount });
  } catch (error) {
    console.error('Import action error:', error);
    res.status(500).json({ error: 'Failed to process import action' });
  }
});

app.post('/api/courses/:id/videos', async (req, res) => {
  console.log(`[AGENT_ROUTER] POST /api/courses/${req.params.id}/videos`, req.body);
  try {
    const course = await findCourse(req.params.id);
    const courseId = course ? (course._id ? course._id.toString() : course.id) : req.params.id;

    // Sanitize folderId
    let folderId = req.body.folderId;
    if (folderId === 'null' || folderId === 'undefined' || !folderId) {
      folderId = null;
    } else {
      folderId = String(folderId);
    }

    const videoData = { ...req.body };
    const isLiveStream = videoData.contentType === 'live_stream' || videoData.type === 'live';

    const video = {
      ...videoData,
      ...(isLiveStream ? {
        title: videoData.title,
        platform: videoData.platform,
        meetingLink: videoData.meetingLink || videoData.link || videoData.url,
        startTime: videoData.startTime || videoData.publishOn || videoData.startDateTime,
        startDateTime: videoData.startDateTime || videoData.startTime || videoData.publishOn,
        publishOn: videoData.publishOn || videoData.startTime || videoData.startDateTime,
        isFree: videoData.isFree,
        isPaid: videoData.isPaid !== undefined ? videoData.isPaid : !videoData.isFree,
        thumbnail: videoData.thumbnail || videoData.image,
        contentType: 'live_stream', // Legacy compatibility
        type: videoData.type || 'live',
        status: videoData.status || 'upcoming',
        url: videoData.meetingLink || videoData.url || videoData.link
      } : {}),
      courseId: String(courseId),
      folderId: folderId,
      createdAt: new Date().toISOString()
    };
    if (isLiveStream) {
      // Preserve end times and other streaming control fields
      if (videoData.endTime) video.endTime = videoData.endTime;
      if (videoData.endDateTime) video.endDateTime = videoData.endDateTime;
      if (videoData.joinBeforeMinutes) video.joinBeforeMinutes = videoData.joinBeforeMinutes;
      if (videoData.visibility) video.visibility = videoData.visibility;
    }
    delete video.instructor;

    const result = await db.collection('videos').insertOne(video);
    res.status(201).json({ _id: result.insertedId, ...video });
  } catch (error) {
    console.error('Video save error:', error);
    res.status(500).json({ error: 'Failed to add video' });
  }
});

app.put('/api/courses/:id/videos/:videoId', async (req, res) => {
  try {
    const course = await findCourse(req.params.id);
    const videoId = req.params.videoId;

    const query = {
      $or: [
        { id: videoId },
        { _id: ObjectId.isValid(videoId) ? new ObjectId(videoId) : null }
      ].filter(v => v.id || v._id)
    };

    if (course) {
      query.courseId = { $in: [String(course.id || ''), String(course._id || ''), req.params.id] };
    }

    const { _id, ...updateData } = req.body;
    const isLiveStream = updateData.contentType === 'live_stream' || updateData.type === 'live';

    const finalUpdate = { ...updateData };

    if (isLiveStream) {
      Object.assign(finalUpdate, {
        title: updateData.title || finalUpdate.title,
        platform: updateData.platform || finalUpdate.platform,
        meetingLink: updateData.meetingLink || updateData.link || updateData.url || finalUpdate.meetingLink,
        startTime: updateData.startTime || updateData.publishOn || updateData.startDateTime || finalUpdate.startTime,
        startDateTime: updateData.startDateTime || updateData.startTime || updateData.publishOn || finalUpdate.startDateTime,
        publishOn: updateData.publishOn || updateData.startTime || updateData.startDateTime || finalUpdate.publishOn,
        isFree: updateData.isFree !== undefined ? updateData.isFree : finalUpdate.isFree,
        isPaid: updateData.isPaid !== undefined ? updateData.isPaid : (updateData.isFree !== undefined ? !updateData.isFree : finalUpdate.isPaid),
        thumbnail: updateData.thumbnail || updateData.image || finalUpdate.thumbnail,
        contentType: 'live_stream', // Legacy compatibility
        type: updateData.type || 'live',
        status: updateData.status || finalUpdate.status || 'upcoming',
        url: updateData.meetingLink || updateData.url || updateData.link || finalUpdate.url
      });
      
      // Preserve end times and other streaming control fields
      if (updateData.endTime) finalUpdate.endTime = updateData.endTime;
      if (updateData.endDateTime) finalUpdate.endDateTime = updateData.endDateTime;
      if (updateData.joinBeforeMinutes) finalUpdate.joinBeforeMinutes = updateData.joinBeforeMinutes;
      if (updateData.visibility) finalUpdate.visibility = updateData.visibility;
    }
    delete finalUpdate.instructor;

    // Sanitize folderId if present in update
    if (finalUpdate.folderId !== undefined) {
      if (finalUpdate.folderId === 'null' || finalUpdate.folderId === 'undefined' || !finalUpdate.folderId) {
        finalUpdate.folderId = null;
      } else {
        finalUpdate.folderId = String(finalUpdate.folderId);
      }
    }

    const result = await db.collection('videos').updateOne(
      query,
      { $set: { ...finalUpdate, updatedAt: new Date().toISOString() } }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Video not found' });
    res.json({ success: true, message: isLiveStream ? 'Live stream updated' : 'Video updated' });
  } catch (error) {
    console.error('Video update error:', error);
    res.status(500).json({ error: 'Failed to update video' });
  }
});

app.post('/api/live-stream/end/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const update = {
      status: 'ended',
      isLive: false,
      endedAt: new Date().toISOString(),
      endTime: new Date().toISOString() // Compatibility with getCalculatedLiveStatus
    };
    const query = {
      $or: [
        { id: id },
        { _id: ObjectId.isValid(id) ? new ObjectId(id) : null }
      ].filter(v => v.id || v._id)
    };
    
    // Update all potential collections where the stream might reside
    await Promise.all([
      db.collection('videos').updateOne(query, { $set: update }),
      db.collection('liveVideos').updateOne(query, { $set: update }),
      db.collection('liveClasses').updateOne(query, { $set: update })
    ]);
    
    res.json({ success: true, message: 'Live stream ended successfully' });
  } catch (error) {
    console.error('End live stream error:', error);
    res.status(500).json({ error: 'Failed to end live stream' });
  }
});

app.delete('/api/courses/:id/videos/:videoId', async (req, res) => {
  try {
    const course = await findCourse(req.params.id);
    const videoId = req.params.videoId;

    const query = {
      $or: [
        { id: videoId },
        { _id: ObjectId.isValid(videoId) ? new ObjectId(videoId) : null }
      ].filter(v => v.id || v._id)
    };

    if (course) {
      query.courseId = { $in: [course.id, course._id.toString(), req.params.id] };
    }

    const result = await db.collection('videos').deleteOne(query);
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Video not found' });
    res.json({ success: true, message: 'Video deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete video' });
  }
});

// Generic routes for Videos
app.get('/api/videos', async (req, res) => {
  try {
    const isFree = req.query.isFree === 'true';
    const query = isFree ? { isFree: true } : {};
    const videos = await db.collection('videos').find(query).toArray();
    res.json(videos);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

app.put('/api/videos/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const query = {
      $or: [
        { id: id },
        { _id: ObjectId.isValid(id) ? new ObjectId(id) : null }
      ].filter(v => v.id || v._id)
    };
    const { _id, ...updateData } = req.body;
    await db.collection('videos').updateOne(query, { $set: updateData });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.delete('/api/videos/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const query = {
      $or: [
        { id: id },
        { _id: ObjectId.isValid(id) ? new ObjectId(id) : null }
      ].filter(v => v.id || v._id)
    };
    await db.collection('videos').deleteOne(query);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Generic routes for Notes (consistency with CourseContentManager bulk actions)
app.put('/api/notes/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const query = {
      $or: [
        { id: id },
        { _id: ObjectId.isValid(id) ? new ObjectId(id) : null }
      ].filter(v => v.id || v._id)
    };
    const { _id, ...updateData } = req.body;
    let result = await db.collection('pdfs').updateOne(query, { $set: updateData });
    if (result.matchedCount === 0) {
      result = await db.collection('notes').updateOne(query, { $set: updateData });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.delete('/api/notes/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const query = {
      $or: [
        { id: id },
        { _id: ObjectId.isValid(id) ? new ObjectId(id) : null }
      ].filter(v => v.id || v._id)
    };
    let result = await db.collection('pdfs').deleteOne(query);
    if (result.deletedCount === 0) {
      result = await db.collection('notes').deleteOne(query);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Generic routes for PDFs
app.get('/api/pdfs', async (req, res) => {
  try {
    const isFree = req.query.isFree === 'true';
    const query = isFree ? { isFree: true } : {};
    const pdfs = await db.collection('pdfs').find(query).toArray();
    res.json(pdfs);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.put('/api/pdfs/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const query = {
      $or: [
        { id: id },
        { _id: ObjectId.isValid(id) ? new ObjectId(id) : null }
      ].filter(v => v.id || v._id)
    };
    const { _id, ...updateData } = req.body;
    await db.collection('pdfs').updateOne(query, { $set: updateData });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.delete('/api/pdfs/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const query = {
      $or: [
        { id: id },
        { _id: ObjectId.isValid(id) ? new ObjectId(id) : null }
      ].filter(v => v.id || v._id)
    };
    await db.collection('pdfs').deleteOne(query);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Same for tests
app.delete('/api/tests/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const orConditions = [
      { id: id },
      { id: !isNaN(id) ? Number(id) : null },
      { _id: id },
      { _id: ObjectId.isValid(id) ? new ObjectId(id) : null }
    ].filter(v => v.id !== null && v.id !== undefined || v._id !== null && v._id !== undefined);
    const query = { $or: orConditions };
    await db.collection('tests').deleteOne(query);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.put('/api/tests/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const orConditions = [
      { id: id },
      { id: !isNaN(id) ? Number(id) : null },
      { _id: id },
      { _id: ObjectId.isValid(id) ? new ObjectId(id) : null }
    ].filter(v => v.id !== null && v.id !== undefined || v._id !== null && v._id !== undefined);
    const query = { $or: orConditions };
    const { _id, ...updateData } = req.body;
    await db.collection('tests').updateOne(query, { $set: updateData }, { upsert: true });
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating test:', error);
    res.status(500).json({ error: 'Failed to update test' });
  }
});

// Removed Demo Content routes

// Routes for Course Notes (uses pdfs collection - consistent with admin uploads)
app.get('/api/courses/:id/notes', async (req, res) => {
  try {
    const course = await findCourse(req.params.id);
    if (!course) return res.json([]);

    const idVariants = await getRelatedCourseIds(course, req.params.id);
    const query = {
      courseId: { $in: idVariants }
    };
    // Check both pdfs and notes collections for backward compatibility
    const pdfs = await db.collection('pdfs').find(query).sort({ order: 1 }).toArray();
    const notes = await db.collection('notes').find(query).sort({ order: 1 }).toArray();
    // Merge both, deduplicating by id
    const allNotes = [...pdfs];
    notes.forEach(n => {
      if (!allNotes.find(p => (p.id && n.id && p.id === n.id) || p._id.toString() === n._id.toString())) allNotes.push(n);
    });
    res.json(allNotes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

app.post('/api/courses/:id/notes', async (req, res) => {
  try {
    const course = await findCourse(req.params.id);
    const courseId = course ? (course.id || course._id.toString()) : req.params.id;

    const note = {
      ...req.body,
      courseId,
      createdAt: new Date().toISOString()
    };
    const result = await db.collection('pdfs').insertOne(note);
    res.status(201).json({ _id: result.insertedId, ...note });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add note' });
  }
});

app.put('/api/courses/:id/notes/:noteId', async (req, res) => {
  try {
    const course = await findCourse(req.params.id);
    const noteId = req.params.noteId;

    const query = {
      $or: [
        { id: noteId },
        { _id: ObjectId.isValid(noteId) ? new ObjectId(noteId) : null }
      ].filter(v => v.id || v._id)
    };

    if (course) {
      query.courseId = { $in: [course.id, course._id.toString(), req.params.id] };
    }

    const { _id, ...updateData } = req.body;
    // Try pdfs collection first, then notes
    let result = await db.collection('pdfs').updateOne(
      query,
      { $set: { ...updateData, updatedAt: new Date().toISOString() } }
    );
    if (result.matchedCount === 0) {
      result = await db.collection('notes').updateOne(
        query,
        { $set: { ...updateData, updatedAt: new Date().toISOString() } }
      );
    }
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Note not found' });
    res.json({ success: true, message: 'Note updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update note' });
  }
});

app.delete('/api/courses/:id/notes/:noteId', async (req, res) => {
  try {
    const course = await findCourse(req.params.id);
    const noteId = req.params.noteId;

    const query = {
      $or: [
        { id: noteId },
        { _id: ObjectId.isValid(noteId) ? new ObjectId(noteId) : null }
      ].filter(v => v.id || v._id)
    };

    if (course) {
      query.courseId = { $in: [course.id, course._id.toString(), req.params.id] };
    }

    // Try pdfs collection first, then notes
    let result = await db.collection('pdfs').deleteOne(query);
    if (result.deletedCount === 0) {
      result = await db.collection('notes').deleteOne(query);
    }
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Note not found' });
    res.json({ success: true, message: 'Note deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete note' });
  }
});


// Routes for Course Tests
app.get('/api/courses/:id/tests', async (req, res) => {
  try {
    const course = await findCourse(req.params.id);
    if (!course) return res.json([]);

    const idVariants = await getRelatedCourseIds(course, req.params.id);

    // Initial query to find tests directly associated with this course
    let query = {
      $or: [
        { courseId: { $in: idVariants } },
        { testSeriesId: { $in: idVariants } }
      ],
      isSeries: { $ne: true }, // Filter out Test Series containers
      $and: [{ $or: [{ status: 'active' }, { status: { $exists: false } }] }]
    };

    // Include tests from explicitly attached test series
    if (course.content && Array.isArray(course.content.testSeries) && course.content.testSeries.length > 0) {
      const attachedSeries = await db.collection('tests').find({
        $or: [
          { name: { $in: course.content.testSeries } },
          { title: { $in: course.content.testSeries } },
          { seriesName: { $in: course.content.testSeries } }
        ],
        isSeries: true
      }).toArray();

      const attachedSeriesIds = attachedSeries.map(s => String(s.id || s._id || ''));
      if (attachedSeriesIds.length > 0) {
        query.$or.push({ testSeriesId: { $in: attachedSeriesIds } });
      }
    }

    const tests = await db.collection('tests').find(query).toArray();
    console.log(`GET /api/courses/${req.params.id}/tests - Found ${tests.length} tests (filtered for course and attached series)`);
    res.json(tests);
  } catch (error) {
    console.error('Error fetching course tests:', error);
    res.status(500).json({ error: 'Failed to fetch course tests' });
  }
});

app.get('/api/courses/:id/live-classes', optionalAuth, async (req, res) => {
  try {
    const courseId = req.params.id;
    const course = await findCourse(courseId);
    const idVariants = await getRelatedCourseIds(course, courseId);
    const query = {
      courseId: { $in: idVariants }
    };

    const [c1, c2, c3] = await Promise.all([
      db.collection('liveVideos').find(query).toArray(),
      db.collection('liveClasses').find(query).toArray(),
      db.collection('videos').find({ ...query, contentType: { $in: ['youtube_zoom', 'live_stream'] } }).toArray()
    ]);

    // Check enrollment for private streams if student is logged in
    let isEnrolled = false;
    if (req.user && req.user.studentId) {
      const enrollment = await db.collection('enrollments').findOne({
        studentId: req.user.studentId,
        courseId: { $in: idVariants }
      });
      isEnrolled = !!enrollment;
    }

    const merged = [...c1, ...c2, ...c3].map(item => {
      // Dynamic Status Calculation using helper
      item.status = calculateStreamStatus(item);

      // Ensure date/startTime properties exist for the calendar view if they are missing
      if (!item.date && (item.publishOn || item.startTime)) {
        const d = new Date(item.publishOn || item.startTime);
        if (!isNaN(d.getTime())) {
          item.date = d.toISOString().split('T')[0];
          item.startTimeString = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        }
      }

      // Map 'url' or 'meetingLink' consistently
      if (!item.meetingLink) {
        item.meetingLink = item.url || item.videoUrl || item.link;
      }

      return item;
    })
    .filter(item => {
      // Visibility Filter: 
      // - Public streams are visible to everyone
      // - Private streams are only visible if the student is enrolled (or if they are admin, but this route is for students)
      if (item.visibility === 'private' && !isEnrolled) {
        return false;
      }
      return true;
    })
    .sort((a,b) => new Date(a.date || a.publishOn || a.createdAt) - new Date(b.date || b.publishOn || b.createdAt));
    
    res.json(merged);
  } catch (error) {
    console.error('Error fetching live classes:', error);
    res.status(500).json({ error: 'Failed to fetch live classes' });
  }
});

// Routes for Course Posts
app.get('/api/courses/:id/posts', async (req, res) => {
  try {
    const course = await findCourse(req.params.id);
    if (!course) return res.json([]);
    const query = {
      courseId: { $in: [String(course.id || ''), String(course._id || ''), req.params.id].filter(Boolean) }
    };
    const posts = await db.collection('posts').find(query).sort({ createdAt: -1 }).toArray();
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

app.post('/api/courses/:id/posts', async (req, res) => {
  try {
    const course = await findCourse(req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    const courseId = course.id || course._id.toString();
    const post = {
      ...req.body,
      courseId,
      createdAt: new Date().toISOString(),
      likes: 0,
      comments: []
    };
    const result = await db.collection('posts').insertOne(post);
    res.status(201).json({ _id: result.insertedId, ...post });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create post' });
  }
});

app.delete('/api/courses/:id/posts/:postId', async (req, res) => {
  try {
    const postId = req.params.postId;
    const filter = ObjectId.isValid(postId) ? { _id: new ObjectId(postId) } : { id: postId };
    const result = await db.collection('posts').deleteOne(filter);
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Post not found' });
    res.json({ success: true, message: 'Post deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// Generic Course Routes (Correctly placed at the end)
app.get('/api/courses/:id', async (req, res) => {
  try {
    console.log(`GET /api/courses/${req.params.id} - Aggressive lookup...`);
    const course = await findCourse(req.params.id);

    if (course) {
      const relatedIds = await getRelatedCourseIds(course, req.params.id);
      res.json({
        ...course,
        id: course.id || course._id.toString(),
        relatedIds: relatedIds
      });
    } else {
      res.status(404).json({ error: 'Course not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

app.put('/api/courses/:id', async (req, res) => {
  try {
    console.log(`PUT /api/courses/${req.params.id} - Body size: ${JSON.stringify(req.body).length} bytes`);
    const { _id, ...updateData } = req.body;
    const id = req.params.id;
    console.log(`Aggressive PUT lookup for identifier: ${id}`);

    // Try finding in both collections with all variants
    let record = await db.collection('courses').findOne({ $or: [{ id: id }, { _id: id }] });
    if (!record && mongoose.Types.ObjectId.isValid(id)) {
      record = await db.collection('courses').findOne({ _id: new mongoose.Types.ObjectId(id) });
    }

    let targetCollection = 'courses';
    if (!record) {
      record = await db.collection('packages').findOne({ $or: [{ id: id }, { _id: id }] });
      if (!record && mongoose.Types.ObjectId.isValid(id)) {
        record = await db.collection('packages').findOne({ _id: new mongoose.Types.ObjectId(id) });
      }
      if (record) targetCollection = 'packages';
    }

    if (!record) {
      console.warn(`[UPDATE FAILED] No record found in any collection for: ${id}`);
      return res.status(404).json({ error: 'Package/Course not found in DB' });
    }

    console.log(`[TARGET MATCH] Collection: ${targetCollection}, DB _id: ${record._id}`);

    await db.collection(targetCollection).updateOne(
      { _id: record._id },
      { $set: { ...updateData, updatedAt: new Date().toISOString() } }
    );

    res.json({ success: true, message: 'Updated successfully', collection: targetCollection });
  } catch (error) {
    console.error(`Failed to update course ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update course', details: error.message });
  }
});

app.delete('/api/courses/:id', async (req, res) => {
  try {
    let filter = { id: req.params.id };
    if (mongoose.Types.ObjectId.isValid(req.params.id)) filter = { _id: new mongoose.Types.ObjectId(req.params.id) };

    let result = await db.collection('courses').deleteOne(filter);
    if (result.deletedCount === 0) {
      result = await db.collection('packages').deleteOne(filter);
    }
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Course not found' });
    res.json({ success: true, message: 'Course/Package deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete course' });
  }
});


// Routes for Students/Users
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await db.collection('users').findOne({ id: req.params.id });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const result = await db.collection('users').insertOne(req.body);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Routes for Students
app.get('/api/students', async (req, res) => {
  try {
    const students = await Student.find({}).lean();
    console.log('GET /api/students - Found', students.length, 'students');
    res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Failed to fetch students', details: error.message });
  }
});

app.get('/api/students/:id', async (req, res) => {
  try {
    let query = { id: req.params.id };
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      query = { $or: [{ id: req.params.id }, { _id: req.params.id }] };
    }
    const student = await Student.findOne(query).lean();
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch student' });
  }
});

app.get('/api/students/:id/live-classes', async (req, res) => {
  try {
    let studentQuery = { id: req.params.id };
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      studentQuery = { $or: [{ id: req.params.id }, { _id: req.params.id }] };
    }
    const student = await Student.findOne(studentQuery).lean();
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const enrolledCourses = student.enrolledCourses || [];
    if (enrolledCourses.length === 0) return res.json([]);

    // Get all variants for all enrolled courses
    let allIdVariants = [];
    for (const courseId of enrolledCourses) {
      const variants = await getCourseIdVariants(courseId);
      allIdVariants = [...allIdVariants, ...variants];
    }

    // Remote duplicates
    allIdVariants = [...new Set(allIdVariants)];

    const query = {
      courseId: { $in: allIdVariants }
    };

    const [c1, c2, c3] = await Promise.all([
      db.collection('liveVideos').find(query).toArray(),
      db.collection('liveClasses').find(query).toArray(),
      db.collection('videos').find({ ...query, contentType: { $in: ['youtube_zoom', 'live_stream'] } }).toArray()
    ]);

    const merged = [...c1, ...c2, ...c3].map(item => {
      const now = new Date();
      const startTime = new Date(item.publishOn || item.date || item.createdAt);
      const targetEnd = item.endTime || item.endDateTime;
      const endTime = targetEnd ? new Date(targetEnd) : new Date(startTime.getTime() + 60 * 60 * 1000); // Default 1 hour
      const joinBeforeMin = parseInt(item.joinBeforeMinutes) || 10;
      const joinTime = new Date(startTime.getTime() - joinBeforeMin * 60 * 1000);

      // Dynamic Status Calculation
      if (item.status === 'inactive' || item.status === 'ended' || item.status === 'completed') {
        item.status = 'ended';
      } else if (now < joinTime) {
        item.status = 'upcoming';
      } else if (now >= joinTime && now <= endTime) {
        item.status = 'live';
      } else {
        item.status = 'ended';
      }

      // Ensure date/startTime properties exist
      if (!item.date && (item.publishOn || item.createdAt)) {
        const d = new Date(item.publishOn || item.createdAt);
        if (!isNaN(d.getTime())) {
          item.date = d.toISOString().split('T')[0];
          item.startTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        }
      }

      if (!item.meetingLink) {
        item.meetingLink = item.url || item.videoUrl || item.link;
      }

      return item;
    }).sort((a, b) => new Date(a.date || a.publishOn || a.createdAt) - new Date(b.date || b.publishOn || b.createdAt));

    res.json(merged);
  } catch (error) {
    console.error('Error fetching student live classes:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/students', async (req, res) => {
  try {
    console.log('POST /api/students - Received admission data:', req.body);
    const { email, phone } = req.body;

    // Duplicate check
    const existingStudent = await Student.findOne({ 
      $or: [
        { phone },
        ...(email ? [{ email }] : [])
      ] 
    });

    if (existingStudent) {
      const field = existingStudent.phone === phone ? 'phone' : 'email';
      return res.status(400).json({ error: `Student with this ${field} already exists.` });
    }

    // Generate unique student ID
    const studentId = "STU-" + Date.now() + Math.floor(Math.random() * 1000);

    // Structure data for new schema
    const studentData = {
      id: studentId,
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      dob: req.body.dob,
      city: req.body.city,
      course: req.body.course,
      status: req.body.status || 'active',
      registrationType: req.body.registrationType || 'regular',
      registrationDate: req.body.registrationDate || new Date().toISOString().split('T')[0],
      notes: req.body.notes,
      paymentStatus: req.body.paymentStatus || 'pending',

      admission: {
        fatherName: req.body.fatherName,
        motherName: req.body.motherName,
        gender: req.body.gender,
        alternatePhone: req.body.alternatePhone,
        fullAddress: req.body.fullAddress,
        batchTiming: req.body.batchTiming,
        admissionDate: req.body.admissionDate || new Date()
      },
      fees: {
        totalFees: Number(req.body.totalFees || 0),
        paidAmount: Number(req.body.paidAmount || 0),
        remainingAmount: Number(req.body.totalFees || 0) - Number(req.body.paidAmount || 0)
      },
      academic: {
        previousClass: req.body.previousClass,
        schoolName: req.body.schoolName,
        marksPercentage: req.body.marksPercentage,
        passingYear: req.body.passingYear
      },
      documents: {
        aadharCard: req.body.aadharCard,
        marksheet: req.body.marksheet,
        photo: req.body.photo,
        profilePhoto: req.body.profilePhoto
      }
    };

    const student = new Student(studentData);
    await student.save();

    console.log('Student created successfully with ID:', studentId);
    res.status(201).json(student);
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ error: 'Failed to create student', details: error.message });
  }
});

app.put('/api/students/:id', async (req, res) => {
  try {
    console.log('PUT /api/students/:id - Updating student:', req.params.id, req.body);
    const { _id, ...body } = req.body;

    const updateData = {
      name: body.name,
      email: body.email,
      phone: body.phone,
      dob: body.dob,
      city: body.city,
      course: body.course,
      status: body.status,
      registrationType: body.registrationType,
      registrationDate: body.registrationDate,
      notes: body.notes,
      paymentStatus: body.paymentStatus,
      admission: {
        fatherName: body.fatherName,
        motherName: body.motherName,
        gender: body.gender,
        alternatePhone: body.alternatePhone,
        fullAddress: body.fullAddress,
        batchTiming: body.batchTiming,
        admissionDate: body.admissionDate
      },
      fees: {
        totalFees: Number(body.totalFees || 0),
        paidAmount: Number(body.paidAmount || 0),
        remainingAmount: Number(body.totalFees || 0) - Number(body.paidAmount || 0)
      },
      academic: {
        previousClass: body.previousClass,
        schoolName: body.schoolName,
        marksPercentage: body.marksPercentage,
        passingYear: body.passingYear
      },
      documents: {
        aadharCard: body.aadharCard,
        marksheet: body.marksheet,
        photo: body.photo,
        profilePhoto: body.profilePhoto
      }
    };

    const student = await Student.findOneAndUpdate(
      { id: req.params.id },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!student) {
      console.warn('Student not found:', req.params.id);
      return res.status(404).json({ error: 'Student not found' });
    }

    console.log('Student updated successfully:', req.params.id);
    res.json(student);
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ error: 'Failed to update student', details: error.message });
  }
});

app.delete('/api/students/:id', async (req, res) => {
  try {
    console.log('DELETE /api/students/:id - Deleting student:', req.params.id);
    const result = await db.collection('students').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) {
      console.warn('Student not found for deletion:', req.params.id);
      return res.status(404).json({ error: 'Student not found' });
    }
    console.log('Student deleted successfully:', req.params.id);
    res.json({ success: true, message: 'Student deleted' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ error: 'Failed to delete student', details: error.message });
  }
});

// DELETE ALL students
app.delete('/api/students', async (req, res) => {
  try {
    const result = await db.collection('students').deleteMany({});
    res.json({ success: true, message: `Deleted ${result.deletedCount} students` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete all students' });
  }
});

// Bulk create students (JSON body)
app.post('/api/students/bulk', async (req, res) => {
  try {
    const { students } = req.body;
    if (!Array.isArray(students) || students.length === 0) return res.status(400).json({ error: 'No students provided' });
    const result = await db.collection('students').insertMany(students);
    res.status(201).json({ success: true, inserted: result.insertedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk create students' });
  }
});

// Update all students (bulk update)
app.put('/api/students/update-all', async (req, res) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates)) return res.status(400).json({ error: 'Updates must be an array' });
    for (const update of updates) {
      const { id, _id, ...data } = update;
      await db.collection('students').updateOne({ id }, { $set: data });
    }
    res.json({ success: true, message: `Updated ${updates.length} students` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update all students' });
  }
});

// Bulk upload students from Excel/CSV file
app.post('/api/students/bulk-excel', excelUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    if (jsonData.length === 0) return res.status(400).json({ error: 'No data found in file' });

    const students = jsonData.map((row, idx) => ({
      id: row.id || row.ID || `ST-${String(Date.now() + idx).slice(-6)}`,
      name: row.name || row.Name || row['Full Name'] || row['Student Name'] || '',
      email: row.email || row.Email || '',
      phone: String(row.phone || row.Phone || row.Mobile || row.mobile || ''),
      dob: row.dob || row.DOB || row['Date of Birth'] || '',
      course: row.course || row.Course || '',
      city: row.city || row.City || '',
      registrationDate: row.registrationDate || row['Registration Date'] || new Date().toISOString().split('T')[0],
      registrationType: row.registrationType || row['Registration Type'] || 'regular',
      status: (row.status || row.Status || 'active').toString().toLowerCase(),
      paymentStatus: (row.paymentStatus || row['Payment Status'] || 'pending').toString().toLowerCase(),
      notes: row.notes || row.Notes || ''
    })).filter(s => s.name || s.email || s.phone);

    if (students.length === 0) return res.status(400).json({ error: 'No valid student data found' });
    const result = await db.collection('students').insertMany(students);
    res.json({ success: true, inserted: result.insertedCount, students });
  } catch (error) {
    console.error('Excel upload error:', error);
    res.status(500).json({ error: 'Failed to process Excel file: ' + error.message });
  }
});

// Routes for Orders/Payments
app.post('/api/orders', async (req, res) => {
  try {
    const order = {
      ...req.body,
      createdAt: new Date(),
      status: 'pending'
    };
    const result = await db.collection('orders').insertOne(order);
    res.status(201).json({ _id: result.insertedId, ...order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create order' });
  }
});

app.get('/api/orders/:userId', async (req, res) => {
  try {
    const orders = await db.collection('orders').find({ userId: req.params.userId }).toArray();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Routes for Buyers
app.get('/api/buyers', async (req, res) => {
  try {
    const buyers = await db.collection('buyers').find({}).toArray();
    res.json(buyers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch buyers' });
  }
});

app.post('/api/buyers', async (req, res) => {
  try {
    const result = await db.collection('buyers').insertOne(req.body);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create buyer' });
  }
});

app.put('/api/buyers/:id', async (req, res) => {
  try {
    const idParam = req.params.id;
    const { _id, id: rawId, ...updateData } = req.body;

    console.log(`[Buyer Update Attempt] URL ID: ${idParam}`);

    // EXTREMELY AGGRESSIVE FILTER: Try every possible way to find this record
    const filterConditions = [
      { _id: idParam },
      { id: idParam }
    ];

    if (mongoose.Types.ObjectId.isValid(idParam)) {
      filterConditions.push({ _id: new mongoose.Types.ObjectId(idParam) });
    }

    // FALLBACK: If we have the name and amount, search by those too
    if (updateData.studentName && updateData.amount) {
      filterConditions.push({
        studentName: updateData.studentName,
        amount: updateData.amount
      });
    }

    const filter = { $or: filterConditions };

    // 1. Find the document first to confirm we have it
    const targetDoc = await db.collection('buyers').findOne(filter);

    if (!targetDoc) {
      console.log(`[Buyer Update FAILED] No doc matched any filter for ID: ${idParam}`);
      return res.status(404).json({
        error: 'Buyer not found',
        details: `We searched for ID ${idParam} and student name ${updateData.studentName} but no record was found.`
      });
    }

    // 2. Perform the update using its specific _id
    const result = await db.collection('buyers').updateOne(
      { _id: targetDoc._id },
      { $set: { ...updateData, updatedAt: new Date().toISOString() } }
    );

    // 3. Return updated doc
    const updated = await db.collection('buyers').findOne({ _id: targetDoc._id });
    console.log(`[Buyer Update SUCCESS] Document updated: ${targetDoc._id}`);
    res.json(updated);
  } catch (error) {
    console.error('[Buyer Update Error]', error);
    res.status(500).json({ error: 'Failed to update: ' + error.message });
  }
});

app.delete('/api/buyers/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const filter = {
      $or: [
        { _id: id },
        { id: id }
      ]
    };

    if (mongoose.Types.ObjectId.isValid(id)) {
      filter.$or.push({ _id: new mongoose.Types.ObjectId(id) });
    }

    const result = await db.collection('buyers').deleteOne(filter);
    if (result.deletedCount === 0) {
      console.log(`Delete failed - Buyer not found for ID: ${id}`);
      return res.status(404).json({ error: 'Buyer not found' });
    }
    res.json({ success: true, message: 'Buyer deleted' });
  } catch (error) {
    console.error('Delete buyer error:', error);
    res.status(500).json({ error: 'Failed to delete buyer' });
  }
});

// DELETE ALL buyers
app.delete('/api/buyers', async (req, res) => {
  try {
    const result = await db.collection('buyers').deleteMany({});
    res.json({ success: true, message: `Deleted ${result.deletedCount} buyers` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete all buyers' });
  }
});

// Bulk create buyers
app.post('/api/buyers/bulk', async (req, res) => {
  try {
    const { buyers } = req.body;
    if (!Array.isArray(buyers) || buyers.length === 0) return res.status(400).json({ error: 'No buyers provided' });
    const result = await db.collection('buyers').insertMany(buyers);
    res.status(201).json({ success: true, inserted: result.insertedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk create buyers' });
  }
});

// Update-all buyers
app.put('/api/buyers/update-all', async (req, res) => {
  try {
    const updates = (req.body && req.body.updates) ? req.body.updates : (Array.isArray(req.body) ? req.body : []);
    for (const update of updates) {
      const { id, _id, ...data } = update;
      if (id) await db.collection('buyers').updateOne({ id }, { $set: data });
    }
    res.json({ success: true, message: `Updated ${updates.length} buyers` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update all buyers' });
  }
});

// Routes for Tokens
app.get('/api/tokens', async (req, res) => {
  try {
    const tokens = await db.collection('tokens').find({}).toArray();
    res.json(tokens);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tokens' });
  }
});

app.post('/api/tokens', async (req, res) => {
  try {
    const result = await db.collection('tokens').insertOne(req.body);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create token' });
  }
});

app.put('/api/tokens/:id', async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const result = await db.collection('tokens').updateOne(
      { id: req.params.id },
      { $set: updateData }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Token not found' });
    }
    res.json({ success: true, message: 'Token updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update token' });
  }
});

app.delete('/api/tokens/:id', async (req, res) => {
  try {
    const result = await db.collection('tokens').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Token not found' });
    }
    res.json({ success: true, message: 'Token deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete token' });
  }
});

// DELETE ALL tokens
app.delete('/api/tokens', async (req, res) => {
  try {
    const result = await db.collection('tokens').deleteMany({});
    res.json({ success: true, message: `Deleted ${result.deletedCount} tokens` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete all tokens' });
  }
});

// Bulk create tokens
app.post('/api/tokens/bulk', async (req, res) => {
  try {
    const { tokens } = req.body;
    if (!Array.isArray(tokens) || tokens.length === 0) return res.status(400).json({ error: 'No tokens provided' });
    const result = await db.collection('tokens').insertMany(tokens);
    res.status(201).json({ success: true, inserted: result.insertedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk create tokens' });
  }
});

// Update-all tokens
app.put('/api/tokens/update-all', async (req, res) => {
  try {
    const updates = (req.body && req.body.updates) ? req.body.updates : (Array.isArray(req.body) ? req.body : []);
    for (const update of updates) {
      const { id, _id, ...data } = update;
      if (id) await db.collection('tokens').updateOne({ id }, { $set: data });
    }
    res.json({ success: true, message: `Updated ${updates.length} tokens` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update all tokens' });
  }
});

// Routes for Coupons
app.get('/api/coupons', async (req, res) => {
  try {
    const coupons = await db.collection('coupons').find({}).toArray();
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

app.post('/api/coupons', async (req, res) => {
  try {
    const result = await db.collection('coupons').insertOne(req.body);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create coupon' });
  }
});

app.put('/api/coupons/:id', async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const result = await db.collection('coupons').updateOne(
      { id: req.params.id },
      { $set: updateData }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Coupon not found' });
    }
    res.json({ success: true, message: 'Coupon updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update coupon' });
  }
});

app.delete('/api/coupons/:id', async (req, res) => {
  try {
    const result = await db.collection('coupons').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Coupon not found' });
    }
    res.json({ success: true, message: 'Coupon deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
});

// DELETE ALL coupons
app.delete('/api/coupons', async (req, res) => {
  try {
    const result = await db.collection('coupons').deleteMany({});
    res.json({ success: true, message: `Deleted ${result.deletedCount} coupons` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete all coupons' });
  }
});

// Bulk create coupons
app.post('/api/coupons/bulk', async (req, res) => {
  try {
    const { coupons } = req.body;
    if (!Array.isArray(coupons) || coupons.length === 0) return res.status(400).json({ error: 'No coupons provided' });
    const result = await db.collection('coupons').insertMany(coupons);
    res.status(201).json({ success: true, inserted: result.insertedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk create coupons' });
  }
});

// Update-all coupons
app.put('/api/coupons/update-all', async (req, res) => {
  try {
    const updates = (req.body && req.body.updates) ? req.body.updates : (Array.isArray(req.body) ? req.body : []);
    for (const update of updates) {
      const { id, _id, ...data } = update;
      if (id) await db.collection('coupons').updateOne({ id }, { $set: data });
    }
    res.json({ success: true, message: `Updated ${updates.length} coupons` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update all coupons' });
  }
});

// Admin Authentication Routes
app.post('/api/admin/login', async (req, res) => {
  try {
    let { adminId, password } = req.body;

    // Trim inputs to avoid whitespace issues
    adminId = adminId?.trim();
    password = password?.trim();

    console.log(`[LOGIN ATTEMPT] AdminID: ${adminId}, Time: ${new Date().toISOString()}`);

    if (!adminId || !password) {
      return res.status(400).json({ error: 'Admin ID and password are required' });
    }

    const admin = await db.collection('admins').findOne({ adminId });

    if (!admin) {
      console.warn(`[LOGIN FAILED] Admin not found: ${adminId}`);
      return res.status(401).json({ error: 'Invalid Admin ID or Password' });
    }

    // Secure comparison (consider bcrypt in future)
    if (admin.password !== password) {
      console.warn(`[LOGIN FAILED] Wrong password for admin: ${adminId}`);
      return res.status(401).json({ error: 'Invalid Admin ID or Password' });
    }

    console.log(`[LOGIN SUCCESS] Admin: ${adminId}, Name: ${admin.name}`);
    res.json({
      success: true,
      message: 'Login successful',
      adminId: admin.adminId,
      name: admin.name
    });
  } catch (error) {
    console.error('[LOGIN ERROR]', error);
    res.status(500).json({ error: 'Login failed due to server error' });
  }
});

app.get('/api/admin/verify', async (req, res) => {
  try {
    const adminId = req.headers['x-admin-id'];

    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const admin = await db.collection('admins').findOne({ adminId });

    if (!admin) {
      return res.status(401).json({ error: 'Admin not found' });
    }

    res.json({
      success: true,
      adminId: admin.adminId,
      name: admin.name
    });
  } catch (error) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Get Dashboard Stats for Admin
app.get('/api/admin/dashboard-stats', async (req, res) => {
  try {
    const { type = 'Daily', date, from, to } = req.query;
    const now = new Date();

    let start, end;
    if (type === 'Custom' && from && to) {
      start = new Date(from);
      end = new Date(to);
    } else if (type === 'Weekly') {
      start = new Date(now);
      start.setDate(now.getDate() - 42); // 6 weeks
      end = now;
    } else if (type === 'Monthly') {
      start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      end = now;
    } else {
      const baseDate = date ? new Date(date) : now;
      start = new Date(baseDate);
      start.setDate(baseDate.getDate() - 14);
      end = baseDate;
    }

    const totalStudents = await db.collection('students').countDocuments();
    const totalCourses = await db.collection('courses').countDocuments();

    const duration = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - duration);
    const prevEnd = new Date(start.getTime());

    const purchases = await db.collection('purchases').find({
      status: 'completed',
      createdAt: { $gte: prevStart, $lte: end }
    }).toArray();

    const students = await db.collection('students').find({
      createdAt: { $gte: prevStart, $lte: end }
    }).toArray();

    let currentRevenue = 0, currentSales = 0;
    let prevRevenue = 0, prevSales = 0;

    purchases.forEach(p => {
      const d = new Date(p.createdAt);
      const amount = Number(p.amount) || 0;
      if (d >= start && d <= end) {
        currentRevenue += amount;
        currentSales += 1;
      } else if (d >= prevStart && d < start) {
        prevRevenue += amount;
        prevSales += 1;
      }
    });

    const dailyStats = {};
    if (type === 'Weekly') {
      let curr = new Date(start);
      while (curr <= end) {
        const key = `W_${curr.getTime()}`;
        dailyStats[key] = { name: `Week ${Math.ceil(curr.getDate() / 7)}`, sales: 0, revenue: 0, signups: 0, _s: curr.getTime(), _e: curr.getTime() + 7 * 24 * 60 * 60 * 1000 };
        curr.setDate(curr.getDate() + 7);
      }
    } else if (type === 'Monthly') {
      for (let i = 0; i < 6; i++) {
        const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
        const key = d.toISOString().substring(0, 7);
        dailyStats[key] = { name: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), sales: 0, revenue: 0, signups: 0 };
      }
    } else {
      let curr = new Date(start);
      while (curr <= end) {
        const key = curr.toISOString().split('T')[0];
        dailyStats[key] = { name: curr.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), sales: 0, revenue: 0, signups: 0 };
        curr.setDate(curr.getDate() + 1);
        if (Object.keys(dailyStats).length > 62) break;
      }
    }

    purchases.forEach(p => {
      const d = new Date(p.createdAt);
      if (d < start) return;
      let key;
      if (type === 'Weekly') key = Object.keys(dailyStats).find(k => d.getTime() >= dailyStats[k]._s && d.getTime() < dailyStats[k]._e);
      else if (type === 'Monthly') key = d.toISOString().substring(0, 7);
      else key = d.toISOString().split('T')[0];

      if (dailyStats[key]) {
        dailyStats[key].sales += 1;
        dailyStats[key].revenue += (Number(p.amount) || 0);
      }
    });

    students.forEach(s => {
      const d = new Date(s.createdAt);
      if (d < start) return;
      let key;
      if (type === 'Weekly') key = Object.keys(dailyStats).find(k => d.getTime() >= dailyStats[k]._s && d.getTime() < dailyStats[k]._e);
      else if (type === 'Monthly') key = d.toISOString().substring(0, 7);
      else key = d.toISOString().split('T')[0];
      if (dailyStats[key]) dailyStats[key].signups += 1;
    });

    const chartData = Object.keys(dailyStats).sort().map(k => ({
      ...dailyStats[k],
      vol: dailyStats[k].sales
    }));

    res.json({
      totalStudents, totalCourses,
      totalRevenue: currentRevenue,
      salesVolume: currentSales,
      prevRevenue, prevSales,
      rank: Math.max(1, 1271 - Math.floor(totalStudents / 5)),
      chartData
    });
  } catch (error) {
    console.error('Stats Error:', error);
    res.status(500).json({ error: 'Failed' });
  }
});

// Routes for Store/Products

app.get('/api/store', async (req, res) => {
  try {
    const products = await db.collection('store').find({}).toArray();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch store products' });
  }
});

// Routes for E-Books
app.get('/api/ebooks', async (req, res) => {
  try {
    const filter = {};
    if (req.query.subject) filter.subject = req.query.subject;
    const ebooks = await db.collection('ebooks').find(filter).sort({ createdAt: -1 }).toArray();
    res.json(ebooks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ebooks' });
  }
});

app.post('/api/ebooks', async (req, res) => {
  try {
    const ebook = { ...req.body, createdAt: new Date().toISOString() };
    const result = await db.collection('ebooks').insertOne(ebook);
    res.status(201).json({ _id: result.insertedId, ...ebook });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create ebook' });
  }
});

app.put('/api/ebooks/:id', async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const result = await db.collection('ebooks').updateOne(
      { id: req.params.id },
      { $set: { ...updateData, updatedAt: new Date().toISOString() } }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Ebook not found' });
    res.json({ success: true, message: 'Ebook updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update ebook' });
  }
});

app.delete('/api/ebooks/:id', async (req, res) => {
  try {
    const result = await db.collection('ebooks').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Ebook not found' });
    res.json({ success: true, message: 'Ebook deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete ebook' });
  }
});

app.post('/api/store', async (req, res) => {
  try {
    const result = await db.collection('store').insertOne(req.body);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product' });
  }
});

app.put('/api/store/:id', async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const result = await db.collection('store').updateOne(
      { id: req.params.id },
      { $set: updateData }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true, message: 'Product updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

app.delete('/api/store/:id', async (req, res) => {
  try {
    const result = await db.collection('store').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// DELETE ALL store products
app.delete('/api/store', async (req, res) => {
  try {
    const result = await db.collection('store').deleteMany({});
    res.json({ success: true, message: `Deleted ${result.deletedCount} products` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete all products' });
  }
});

// Bulk create store products
app.post('/api/store/bulk', async (req, res) => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products) || products.length === 0) return res.status(400).json({ error: 'No products provided' });
    const result = await db.collection('store').insertMany(products);
    res.status(201).json({ success: true, inserted: result.insertedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk create products' });
  }
});

// Update-all store products
app.put('/api/store/update-all', async (req, res) => {
  try {
    const updates = (req.body && req.body.updates) ? req.body.updates : (Array.isArray(req.body) ? req.body : []);
    for (const update of updates) {
      const { id, _id, ...data } = update;
      if (id) await db.collection('store').updateOne({ id }, { $set: data });
    }
    res.json({ success: true, message: `Updated ${updates.length} products` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update all products' });
  }
});

// Routes for Institute Settings
app.get('/api/institute', async (req, res) => {
  try {
    const settings = await db.collection('institute').findOne({});
    res.json(settings || { name: '', email: '', phone: '', address: '', logo: '' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch institute settings' });
  }
});

app.put('/api/institute', async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const result = await db.collection('institute').updateOne(
      {},
      { $set: updateData },
      { upsert: true }
    );
    res.json({ success: true, message: 'Institute settings updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update institute settings' });
  }
});

// Routes for Questions
app.get('/api/questions', async (req, res) => {
  try {
    const filter = {};
    if (req.query.testId) filter.testId = req.query.testId;
    if (req.query.courseId) filter.courseId = req.query.courseId;
    const questions = await db.collection('questions').find(filter).sort({ orderIndex: 1, id: 1 }).toArray();
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

app.post('/api/questions', async (req, res) => {
  try {
    const result = await db.collection('questions').insertOne(req.body);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create question' });
  }
});

app.put('/api/questions/:id', async (req, res) => {
  const id = req.params.id;
  const logToFile = (msg) => {
    try {
      fs.appendFileSync(path.join(__dirname, 'api_requests.log'), `[DEBUG][Question Update] ${msg}\n`);
    } catch (e) { }
    console.log(`[Question Update] ${msg}`);
  };

  logToFile(`Started update for ID: ${id}`);
  try {
    const { _id, ...updateData } = req.body;

    // Build flexible query
    const orConditions = [{ id: id }];
    if (!isNaN(id)) orConditions.push({ id: Number(id) });

    if (id && id.length === 24) {
      try {
        const oid = new mongoose.Types.ObjectId(id);
        orConditions.push({ _id: oid });
        logToFile(`Added ObjectId condition: ${oid}`);
      } catch (e) {
        logToFile(`Skipped ObjectId creation: invalid format`);
      }
    }
    orConditions.push({ _id: id });

    logToFile(`Final query conditions: ${JSON.stringify(orConditions)}`);

    // Plan A
    const mainResult = await db.collection('questions').updateOne(
      { $or: orConditions },
      { $set: { ...updateData, updatedAt: new Date().toISOString() } }
    );

    logToFile(`Plan A (Standalone) Matched: ${mainResult.matchedCount}, Modified: ${mainResult.modifiedCount}`);

    if (mainResult.matchedCount > 0) {
      return res.json({ success: true, message: 'Question updated in global collection' });
    }

    // Plan B
    logToFile(`Searching embedded questions...`);
    let embeddedMatch = false;
    for (const condition of orConditions) {
      const searchKey = Object.keys(condition)[0];
      const searchValue = condition[searchKey];
      const testQuery = { [`questions.${searchKey}`]: searchValue };

      const testUpdate = await db.collection('tests').updateMany(
        testQuery,
        { $set: { ...Object.fromEntries(Object.entries(updateData).map(([k, v]) => [`questions.$.${k}`, v])) } }
      );

      if (testUpdate.matchedCount > 0) {
        logToFile(`Plan B (Embedded) SUCCESS using ${JSON.stringify(condition)}`);
        embeddedMatch = true;
        break;
      }
    }

    if (embeddedMatch) {
      return res.json({ success: true, message: 'Question updated in tests' });
    }

    logToFile(`FAILED: No match found for ${id}`);
    return res.status(404).json({ error: 'Question not found' });
  } catch (error) {
    logToFile(`CRASH: ${error.message}`);
    res.status(500).json({ error: 'Failed to update question: ' + error.message });
  }
});

app.delete('/api/questions/:id', async (req, res) => {
  try {
    const id = req.params.id;

    // Build flexible query to match by id field, _id string, or ObjectId
    const orConditions = [
      { id: id }
    ];
    if (!isNaN(id)) orConditions.push({ id: Number(id) });
    if (mongoose && mongoose.Types && mongoose.Types.ObjectId.isValid(id)) {
      orConditions.push({ _id: new mongoose.Types.ObjectId(id) });
    }
    orConditions.push({ _id: id });

    // Deleting from global questions collection
    const mainResult = await db.collection('questions').deleteMany({ $or: orConditions });

    // Clean up embedded questions in any test
    const testResult = await db.collection('tests').updateMany(
      {},
      {
        $pull: {
          questions: {
            $or: orConditions.map(c => {
              const key = Object.keys(c)[0];
              const val = c[key];
              return { [key]: val };
            })
          }
        }
      }
    );

    if (mainResult.deletedCount === 0 && testResult.matchedCount === 0) {
      console.warn(`[Question Delete] No match found for ID: ${id} to delete`);
      return res.status(404).json({ error: 'Question not found' });
    }

    console.log(`[Question Delete] Deleted ${mainResult.deletedCount} from global and removed from matching tests`);
    res.json({ success: true, message: 'Question deleted successfully' });
  } catch (error) {
    console.error('[Question Delete] Error:', error);
    res.status(500).json({ error: 'Failed to delete question: ' + error.message });
  }
});

// DELETE ALL questions
app.delete('/api/questions', async (req, res) => {
  try {
    const result = await db.collection('questions').deleteMany({});
    res.json({ success: true, message: `Deleted ${result.deletedCount} questions` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete all questions' });
  }
});

// Bulk delete questions by IDs
app.post('/api/questions/bulk-delete', async (req, res) => {
  try {
    const { ids, questionIds } = req.body;
    const finalIds = ids || questionIds;

    if (!Array.isArray(finalIds) || finalIds.length === 0) {
      return res.status(400).json({ error: 'No question IDs provided' });
    }

    // Attempt to delete by both 'id' field and MongoDB '_id' for compatibility
    const filter = {
      $or: [
        { id: { $in: finalIds } },
        { _id: { $in: finalIds.filter(id => id && /^[a-f\d]{24}$/i.test(id)).map(id => new ObjectId(id)) } }
      ]
    };

    const result = await db.collection('questions').deleteMany(filter);
    console.log(`[Bulk Delete] Deleted ${result.deletedCount} questions from the questions collection.`);

    // Important: Also remove these questions from any tests that might have them embedded
    // We search all tests and pull any question where its id or _id is in the list
    // We only apply this to documents where 'questions' is actually an array
    await db.collection('tests').updateMany(
      { questions: { $type: 'array' } },
      {
        $pull: {
          questions: {
            $or: [
              { id: { $in: finalIds } },
              { _id: { $in: finalIds.filter(id => id && /^[a-f\d]{24}$/i.test(id)).map(id => new ObjectId(id)) } }
            ]
          }
        }
      }
    );

    res.json({
      success: true,
      message: `Questions deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Bulk delete questions error:', error);
    res.status(500).json({ error: 'Failed to bulk delete questions', details: error.message });
  }
});

// Bulk create questions
app.post('/api/questions/bulk', async (req, res) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) return res.status(400).json({ error: 'No questions provided' });
    const result = await db.collection('questions').insertMany(questions);
    res.status(201).json({ success: true, inserted: result.insertedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk create questions' });
  }
});

// Bulk delete questions (Using POST to ensure body is sent/parsed correctly)
app.post('/api/questions/bulk-delete', async (req, res) => {
  try {
    const { questionIds } = req.body;
    console.log('[Bulk Delete] Processing IDs:', (questionIds || []).length);

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({ error: 'No IDs provided for bulk delete' });
    }

    // Ensure all IDs are strings for consistency
    const stringIds = questionIds.map(id => String(id));

    // Collect possible Mongo ObjectIds
    const mongoIds = [];
    stringIds.forEach(id => {
      if (id && id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id)) {
        try {
          mongoIds.push(new mongoose.mongo.ObjectId(id));
        } catch (e) { }
      }
    });

    // Delete from both the separate questions collection and potentially from ALL test embedded arrays
    const qFilter = {
      $or: [
        { id: { $in: questionIds } },  // Might be numbers
        { id: { $in: stringIds } },    // As strings
        { _id: { $in: mongoIds } }     // As ObjectIds
      ]
    };

    const result = await db.collection('questions').deleteMany(qFilter);

    // Also remove from any tests that might have these questions embedded
    try {
      await db.collection('tests').updateMany(
        {},
        {
          $pull: {
            questions: {
              $or: [
                { id: { $in: questionIds } },
                { id: { $in: stringIds } },
                { _id: { $in: stringIds } }
              ]
            }
          }
        }
      );
    } catch (pullErr) {
      console.warn('[Bulk Delete] Embedded cleanup warning:', pullErr.message);
    }

    console.log(`[Bulk Delete] Result: ${result.deletedCount} items permanently deleted`);
    res.json({ success: true, deleted: result.deletedCount });
  } catch (error) {
    console.error('[Bulk Delete] Server Crash:', error);
    res.status(500).json({
      error: 'Bulk delete operation failed internally',
      details: error.message,
      stack: isProduction ? undefined : error.stack
    });
  }
});


// Update-all questions
app.put('/api/questions/update-all', async (req, res) => {
  try {
    const updates = (req.body && req.body.updates) ? req.body.updates : (Array.isArray(req.body) ? req.body : []);
    for (const update of updates) {
      const { id, _id, ...data } = update;
      if (id) await db.collection('questions').updateOne({ id }, { $set: data });
    }
    res.json({ success: true, message: `Updated ${updates.length} questions` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update all questions' });
  }
});

// Bulk upload questions from Excel
app.post('/api/questions/bulk-excel', excelUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
    const questions = jsonData.map((row, i) => ({
      id: row.id || `q_${Date.now()}_${i}`,
      question: row.question || row.Question || '',
      optionA: row.optionA || row['Option A'] || '',
      optionB: row.optionB || row['Option B'] || '',
      optionC: row.optionC || row['Option C'] || '',
      optionD: row.optionD || row['Option D'] || '',
      correctAnswer: (row.correctAnswer || row['Correct Answer'] || 'A').toString().toUpperCase(),
      explanation: row.explanation || '',
      marks: parseInt(row.marks) || 4,
      negativeMarks: parseFloat(row.negativeMarks) || 0
    }));
    if (questions.length === 0) return res.status(400).json({ error: 'No valid question data found' });
    const result = await db.collection('questions').insertMany(questions);
    res.status(201).json({ success: true, inserted: result.insertedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process Excel: ' + error.message });
  }
});

// Routes for Tests
app.get('/api/courses/:courseId/tests', async (req, res) => {
  try {
    const { courseId } = req.params;
    const query = { $or: [{ courseId }, { course: courseId }] };
    const tests = await db.collection('tests').find(query).toArray();

    // Fetch question counts
    const testsWithCounts = await Promise.all(tests.map(async (test) => {
      const testId = test.id || test._id?.toString();
      const questionFilter = { $or: [{ testId: testId }, { testId: String(testId) }, { testId: testId?.toString() }] };
      if (testId && !isNaN(testId)) questionFilter.$or.push({ testId: Number(testId) });
      if (test._id && global.ObjectId && ObjectId.isValid(test._id.toString())) {
        questionFilter.$or.push({ testId: new ObjectId(test._id.toString()) });
      }
      const questionCount = await db.collection('questions').countDocuments(questionFilter);

      return {
        ...test,
        questions: questionCount || (Array.isArray(test.questions) ? test.questions.length : (test.questions || 0))
      };
    }));

    res.json(testsWithCounts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch course tests' });
  }
});

app.get('/api/tests', async (req, res) => {
  try {
    const { courseId } = req.query;
    const query = courseId ? { courseId } : {};
    const tests = await db.collection('tests').find(query).toArray();

    // Fetch question counts for each test
    const testsWithCounts = await Promise.all(tests.map(async (test) => {
      const testId = test.id || test._id?.toString();
      const questionFilter = { $or: [{ testId: testId }, { testId: String(testId) }, { testId: testId?.toString() }] };
      if (testId && !isNaN(testId)) questionFilter.$or.push({ testId: Number(testId) });
      if (test._id && global.ObjectId && ObjectId.isValid(test._id.toString())) {
        questionFilter.$or.push({ testId: new ObjectId(test._id.toString()) });
      }
      const questionCount = await db.collection('questions').countDocuments(questionFilter);

      return {
        ...test,
        questions: questionCount || (test.questions ? (Array.isArray(test.questions) ? test.questions.length : (test.questions || 0)) : 0)
      };
    }));

    console.log('GET /api/tests - Found', testsWithCounts.length, 'tests with counts');
    res.json(testsWithCounts);
  } catch (error) {
    console.error('Error fetching tests:', error);
    res.status(500).json({ error: 'Failed to fetch tests' });
  }
});

// Get single test by ID
app.get('/api/tests/:id', async (req, res) => {
  try {
    const id = req.params.id;
    // Build flexible query to match id as string, number, or _id
    const orConditions = [
      { id: id },
      { id: !isNaN(id) ? Number(id) : null },
      { _id: id }
    ].filter(v => v.id !== null && v.id !== undefined || v._id !== null && v._id !== undefined);

    // Also try ObjectId for _id
    if (ObjectId.isValid(id)) {
      orConditions.push({ _id: new ObjectId(id) });
    }

    let test = await db.collection('tests').findOne({ $or: orConditions });

    // Fallback: If test doc is missing but questions exist, create a virtual placeholder
    if (!test) {
      const questionCount = await db.collection('questions').countDocuments({
        $or: [{ testId: id }, { testId: !isNaN(id) ? Number(id) : id }]
      });
      if (questionCount > 0) {
        test = {
          id,
          name: `Unregistered Test ${id}`,
          questions: [],
          temp: true
        };
      } else {
        return res.status(404).json({ error: 'Test not found' });
      }
    }

    // Also search questions by both string and number id, and ObjectId
    const testIdStr = test.id ? String(test.id) : test._id?.toString();
    const questionFilter = {
      $or: [
        { testId: id },
        { testId: testIdStr },
        { testId: String(id) },
        { testId: "test_" + id },
        { testId: "test_" + testIdStr }
      ]
    };

    if (!isNaN(id)) questionFilter.$or.push({ testId: Number(id) });
    if (testIdStr && !isNaN(testIdStr)) questionFilter.$or.push({ testId: Number(testIdStr) });
    if (global.ObjectId && ObjectId.isValid(id)) questionFilter.$or.push({ testId: new ObjectId(id) });
    if (test._id && global.ObjectId && ObjectId.isValid(test._id.toString())) {
      questionFilter.$or.push({ testId: new ObjectId(test._id.toString()) });
    }

    const separateQuestions = await db.collection('questions').find(questionFilter).sort({ orderIndex: 1, id: 1 }).toArray();
    const embeddedQuestions = Array.isArray(test.questions) ? test.questions : [];
    const questions = separateQuestions.length > 0 ? separateQuestions : embeddedQuestions;
    res.json({ ...test, questions });
  } catch (error) {
    console.error('Error fetching test:', error);
    res.status(500).json({ error: 'Failed to fetch test' });
  }
});

app.patch('/api/tests/:id/publish', async (req, res) => {
  const id = req.params.id;
  const logToFile = (msg) => {
    try {
      fs.appendFileSync(path.join(__dirname, 'api_requests.log'), `[DEBUG][Publish] ${msg}\n`);
    } catch (e) { }
    console.log(`[Publish] ${msg}`);
  };

  logToFile(`Starting publish for ID: ${id}`);
  try {
    const now = new Date();
    const formatted = now.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    // Check by string, number id, or ObjectId
    const orConditions = [{ id: id }];
    if (!isNaN(id)) orConditions.push({ id: Number(id) });
    if (global.ObjectId && ObjectId.isValid(id)) {
      orConditions.push({ _id: new ObjectId(id) });
    }
    orConditions.push({ _id: id });

    logToFile(`Query conditions: ${JSON.stringify(orConditions)}`);

    const result = await db.collection('tests').updateOne(
      { $or: orConditions },
      { $set: { published: formatted, status: 'active', updatedAt: now.toISOString() } },
      { upsert: true }
    );

    logToFile(`Result: matched=${result.matchedCount}, upserted=${result.upsertedCount}, modified=${result.modifiedCount}`);

    res.json({ success: true, published: formatted });
  } catch (error) {
    logToFile(`ERROR: ${error.message}`);
    res.status(500).json({ error: 'Failed to publish test: ' + error.message });
  }
});

// Submit test answers
app.post('/api/tests/:testId/submit', async (req, res) => {
  try {
    const { studentId, answers, timeTaken } = req.body;
    const tid = req.params.testId;
    const orConditions = [
      { id: tid },
      { id: !isNaN(tid) ? Number(tid) : null },
      { _id: tid }
    ].filter(v => v.id !== null && v.id !== undefined || v._id !== null && v._id !== undefined);
    if (ObjectId.isValid(tid)) orConditions.push({ _id: new ObjectId(tid) });

    let test = await db.collection('tests').findOne({ $or: orConditions });
    if (!test) {
      const questionCount = await db.collection('questions').countDocuments({
        $or: [{ testId: tid }, { testId: !isNaN(tid) ? Number(tid) : tid }]
      });
      if (questionCount > 0) {
        test = { id: tid, temp: true };
      } else {
        return res.status(404).json({ error: 'Test not found' });
      }
    }

    const questionFilter = { $or: [{ testId: tid }, { testId: test.id || test._id.toString() }] };
    if (!isNaN(tid)) questionFilter.$or.push({ testId: Number(tid) });
    const separateQuestions = await db.collection('questions').find(questionFilter).toArray();
    const questions = separateQuestions.length > 0 ? separateQuestions : (test.questions || []);
    const testNegativeMarking = test.negativeMarking || 0;
    let correctCount = 0;
    let wrongCount = 0;
    let totalMarks = 0;
    let obtainedMarks = 0;
    let negativeMarksTotal = 0;
    const questionResults = questions.map((q) => {
      const studentAnswer = answers[q.id] || null;
      const isCorrect = studentAnswer === q.correctAnswer;
      const marks = q.marks || test.marksPerQuestion || 4;
      const negMarks = q.negativeMarks || testNegativeMarking || 0;
      totalMarks += marks;
      if (studentAnswer) {
        if (isCorrect) {
          correctCount++;
          obtainedMarks += marks;
        } else {
          wrongCount++;
          negativeMarksTotal += negMarks;
          obtainedMarks -= negMarks;
        }
      }
      return {
        questionId: q.id,
        studentAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect,
        marks,
        negativeMarks: (!isCorrect && studentAnswer) ? negMarks : 0
      };
    });

    const answeredCount = Object.keys(answers).filter(k => answers[k]).length;

    let studentName = '';
    try {
      const studentDoc = await db.collection('students').findOne({ id: studentId });
      studentName = studentDoc?.name || '';
    } catch (e) { }

    let courseName = test.courseName || test.course || '';
    if (!courseName && test.courseId) {
      try {
        const courseDoc = await findCourse(test.courseId);
        courseName = courseDoc?.name || courseDoc?.title || '';
      } catch (e) { }
    }

    const resultData = {
      id: `result_${Date.now()}`,
      testId: req.params.testId,
      testName: test.name || test.title || '',
      courseId: test.courseId || '',
      courseName,
      studentId,
      studentName,
      answers,
      questionResults,
      totalQuestions: questions.length,
      correctAnswers: correctCount,
      wrongAnswers: wrongCount,
      unanswered: questions.length - answeredCount,
      totalMarks,
      obtainedMarks: Math.max(0, obtainedMarks),
      negativeMarksTotal,
      percentage: totalMarks > 0 ? Math.round((Math.max(0, obtainedMarks) / totalMarks) * 100) : 0,
      timeTaken,
      submittedAt: new Date()
    };

    await db.collection('testResults').insertOne(resultData);
    res.status(201).json(resultData);
  } catch (error) {
    console.error('Error submitting test:', error);
    res.status(500).json({ error: 'Failed to submit test' });
  }
});

// Get tests by course


app.post('/api/tests', async (req, res) => {
  try {
    console.log('POST /api/tests - Received test data:', req.body);
    const result = await db.collection('tests').insertOne(req.body);
    console.log('Test created successfully with ID:', result.insertedId);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    console.error('Error creating test:', error);
    res.status(500).json({ error: 'Failed to create test', details: error.message });
  }
});

app.put('/api/tests/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const orConditions = [
      { id: id },
      { id: !isNaN(id) ? Number(id) : null },
      { _id: id }
    ].filter(v => v.id !== null && v.id !== undefined || v._id !== null && v._id !== undefined);
    if (mongoose.Types.ObjectId.isValid(id)) orConditions.push({ _id: new mongoose.Types.ObjectId(id) });

    const { _id, ...updateData } = req.body;
    const result = await db.collection('tests').updateOne(
      { $or: orConditions },
      { $set: { ...updateData, updatedAt: new Date().toISOString() } }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Test not found' });
    res.json({ success: true, message: 'Test updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update test' });
  }
});

app.delete('/api/tests/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const orConditions = [
      { id: id },
      { id: !isNaN(id) ? Number(id) : null },
      { _id: id }
    ].filter(v => v.id !== null && v.id !== undefined || v._id !== null && v._id !== undefined);
    if (mongoose.Types.ObjectId.isValid(id)) orConditions.push({ _id: new mongoose.Types.ObjectId(id) });

    const result = await db.collection('tests').deleteOne({ $or: orConditions });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Test not found' });
    res.json({ success: true, message: 'Test deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete test' });
  }
});

app.post('/api/tests/:id/duplicate', async (req, res) => {
  try {
    const id = req.params.id;
    const orConditions = [
      { id: id },
      { id: !isNaN(id) ? Number(id) : null },
      { _id: id }
    ].filter(v => v.id !== null && v.id !== undefined || v._id !== null && v._id !== undefined);
    if (mongoose.Types.ObjectId.isValid(id)) orConditions.push({ _id: new mongoose.Types.ObjectId(id) });

    const test = await db.collection('tests').findOne({ $or: orConditions });
    if (!test) return res.status(404).json({ error: 'Test not found' });

    const { _id, id: oldId, ...duplicateData } = test;
    duplicateData.name = `${test.name || test.title || 'Test'} Copy`;
    duplicateData.id = `test_${Date.now()}`;
    duplicateData.createdAt = new Date();
    duplicateData.updatedAt = new Date();
    duplicateData.status = 'draft';

    const result = await db.collection('tests').insertOne(duplicateData);

    // Duplicate questions as well
    const testIdForQuestions = test.id || test._id.toString();
    const questionFilter = { $or: [{ testId: id }, { testId: testIdForQuestions }] };
    if (!isNaN(id)) questionFilter.$or.push({ testId: Number(id) });
    const questions = await db.collection('questions').find(questionFilter).toArray();

    if (questions.length > 0) {
      const newQuestions = questions.map(({ _id, ...q }) => ({
        ...q,
        testId: duplicateData.id,
        createdAt: new Date()
      }));
      await db.collection('questions').insertMany(newQuestions);
    }

    res.status(201).json({ _id: result.insertedId, ...duplicateData });
  } catch (error) {
    console.error('Duplicate error:', error);
    res.status(500).json({ error: 'Failed to duplicate test' });
  }
});

app.post('/api/tests/:id/reevaluate', async (req, res) => {
  try {
    const id = req.params.id;
    const results = await db.collection('testResults').find({ testId: id }).toArray();
    res.json({ success: true, message: `Re-evaluated ${results.length} attempts` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to re-evaluate test' });
  }
});

// DELETE ALL tests
app.delete('/api/tests', async (req, res) => {
  try {
    const result = await db.collection('tests').deleteMany({});
    res.json({ success: true, message: `Deleted ${result.deletedCount} tests` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete all tests' });
  }
});

// Bulk create tests
app.post('/api/tests/bulk', async (req, res) => {
  try {
    const { tests } = req.body;
    if (!Array.isArray(tests) || tests.length === 0) return res.status(400).json({ error: 'No tests provided' });
    const result = await db.collection('tests').insertMany(tests);
    res.status(201).json({ success: true, inserted: result.insertedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk create tests' });
  }
});

// Update-all tests
app.put('/api/tests/update-all', async (req, res) => {
  try {
    const updates = (req.body && req.body.updates) ? req.body.updates : (Array.isArray(req.body) ? req.body : []);
    for (const update of updates) {
      const { id, _id, ...data } = update;
      if (id) await db.collection('tests').updateOne({ id }, { $set: data });
    }
    res.json({ success: true, message: `Updated ${updates.length} tests` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update all tests' });
  }
});

// Bulk upload questions for a test from Excel (CSV/XLSX)
app.get('/api/tests/:id/export', async (req, res) => {
  try {
    const id = req.params.id;
    const { solution } = req.query;
    const orConditions = [
      { id: id },
      { id: !isNaN(id) ? Number(id) : null },
      { _id: id }
    ].filter(v => v.id !== null && v.id !== undefined || v._id !== null && v._id !== undefined);
    if (mongoose.Types.ObjectId.isValid(id)) orConditions.push({ _id: new mongoose.Types.ObjectId(id) });

    const test = await db.collection('tests').findOne({ $or: orConditions });
    if (!test) return res.status(404).json({ error: 'Test not found' });

    const testIdForQuestions = test.id || test._id.toString();
    const questionFilter = { $or: [{ testId: id }, { testId: testIdForQuestions }] };
    if (!isNaN(id)) questionFilter.$or.push({ testId: Number(id) });
    const questions = await db.collection('questions').find(questionFilter).toArray();

    // Since docx is already used in server.js, we'll generate a basic docx for now
    // The client's downloadFile helper handles the blob.
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: test.name || test.title || 'Test',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          ...questions.flatMap((q, i) => [
            new Paragraph({
              children: [
                new TextRun({ text: `Q${i + 1}. ${q.question}`, bold: true }),
              ],
              spacing: { before: 200 },
            }),
            new Paragraph({ text: `A) ${q.optionA}` }),
            new Paragraph({ text: `B) ${q.optionB}` }),
            new Paragraph({ text: `C) ${q.optionC}` }),
            new Paragraph({ text: `D) ${q.optionD}` }),
            ...(solution === 'true' ? [
              new Paragraph({
                children: [
                  new TextRun({ text: `Correct Answer: ${q.correctAnswer}`, color: '008000', bold: true }),
                ],
              }),
              new Paragraph({ text: `Explanation: ${q.explanation || 'None'}` }),
            ] : []),
          ]),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=${(test.name || 'test').replace(/\s+/g, '_')}.docx`);
    res.send(buffer);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export test' });
  }
});

app.post('/api/tests/:testId/bulk-excel', excelUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
    let test = await db.collection('tests').findOne({ id: req.params.testId });
    if (!test && mongoose.Types.ObjectId.isValid(req.params.testId)) {
      test = await db.collection('tests').findOne({ _id: new mongoose.Types.ObjectId(req.params.testId) });
    }
    const existingQuestions = test ? (test.questions || []) : [];
    const newQuestions = jsonData.map((row, i) => ({
      id: `q_${Date.now()}_${i}`,
      question: row.question || row.Question || '',
      optionA: row.optionA || row['Option A'] || '',
      optionB: row.optionB || row['Option B'] || '',
      optionC: row.optionC || row['Option C'] || '',
      optionD: row.optionD || row['Option D'] || '',
      correctAnswer: (row.correctAnswer || row['Correct Answer'] || 'A').toString().toUpperCase(),
      explanation: row.explanation || row.Explanation || '',
      marks: parseInt(row.marks || row.Marks) || 4,
      negativeMarks: parseFloat(row.negativeMarks || row['Negative Marks']) || 0
    }));
    const allQuestions = [...existingQuestions, ...newQuestions];
    if (test) {
      await db.collection('tests').updateOne({ _id: test._id }, { $set: { questions: allQuestions } });
    }
    res.json({ success: true, added: newQuestions.length, total: allQuestions.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process Excel file: ' + error.message });
  }
});

// Bulk upload questions for a test (CSV format)
app.post('/api/tests/:testId/bulk-questions', async (req, res) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'No questions provided' });
    }
    let test = await db.collection('tests').findOne({ id: req.params.testId });
    if (!test) {
      try { test = await db.collection('tests').findOne({ _id: new mongoose.Types.ObjectId(req.params.testId) }); } catch (e) { }
    }
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }
    const existingQuestions = test.questions || [];
    const newQuestions = questions.map((q, i) => ({
      id: `q_${Date.now()}_${i}`,
      question: q.question || '',
      optionA: q.optionA || q.option_a || '',
      optionB: q.optionB || q.option_b || '',
      optionC: q.optionC || q.option_c || '',
      optionD: q.optionD || q.option_d || '',
      correctAnswer: (q.correctAnswer || q.correct_answer || q.answer || 'A').toUpperCase(),
      explanation: q.explanation || '',
      marks: parseInt(q.marks) || 4,
      negativeMarks: parseFloat(q.negativeMarks || q.negative_marks) || 0,
      questionImage: q.questionImage || '',
    }));
    const allQuestions = [...existingQuestions, ...newQuestions];
    await db.collection('tests').updateOne(
      { _id: test._id },
      { $set: { questions: allQuestions } }
    );
    res.json({ success: true, added: newQuestions.length, total: allQuestions.length });
  } catch (error) {
    console.error('Error bulk uploading questions:', error);
    res.status(500).json({ error: 'Failed to bulk upload questions' });
  }
});

// Routes for Test Series
app.get('/api/test-series', async (req, res) => {
  try {
    const seriesFromCollection = await db.collection('testSeries').find({}).toArray();
    const seriesFromTests = await db.collection('tests').find({ isSeries: true }).toArray();

    const mergedMap = new Map();
    for (const s of seriesFromCollection) {
      const key = s.id || s._id.toString();
      mergedMap.set(key, s);
    }
    for (const s of seriesFromTests) {
      const key = s.id || s._id.toString();
      if (!mergedMap.has(key)) {
        mergedMap.set(key, {
          ...s,
          id: s.id || s._id.toString(),
          seriesName: s.seriesName || s.name || s.title,
          totalTests: s.totalTests || s.questions || 0,
          status: s.status || 'active'
        });
      }
    }
    for (const s of seriesFromCollection) {
      const key = s.id || s._id.toString();
      const existing = mergedMap.get(key);
      if (existing && !existing.id) {
        existing.id = key;
      }
    }

    const combined = Array.from(mergedMap.values());
    console.log('GET /api/test-series - Found', combined.length, 'series (collection:', seriesFromCollection.length, '+ tests:', seriesFromTests.length, ')');
    res.json(combined);
  } catch (error) {
    console.error('Error fetching test series:', error);
    res.status(500).json({ error: 'Failed to fetch test series' });
  }
});

app.post('/api/test-series', async (req, res) => {
  try {
    console.log('POST /api/test-series - Received series data:', req.body);
    const result = await db.collection('testSeries').insertOne(req.body);
    console.log('Series created successfully with ID:', result.insertedId);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    console.error('Error creating test series:', error);
    res.status(500).json({ error: 'Failed to create test series', details: error.message });
  }
});

app.put('/api/test-series/:id', async (req, res) => {
  try {
    console.log('PUT /api/test-series/:id - Updating series:', req.params.id, req.body);
    const { _id, ...updateData } = req.body;
    const result = await db.collection('testSeries').updateOne(
      { id: req.params.id },
      { $set: updateData }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Series not found' });
    console.log('Series updated successfully:', req.params.id);
    res.json({ success: true, message: 'Series updated' });
  } catch (error) {
    console.error('Error updating test series:', error);
    res.status(500).json({ error: 'Failed to update test series', details: error.message });
  }
});

app.delete('/api/test-series/:id', async (req, res) => {
  try {
    console.log('DELETE /api/test-series/:id - Deleting series:', req.params.id);
    const result = await db.collection('testSeries').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Series not found' });
    console.log('Series deleted successfully:', req.params.id);
    res.json({ success: true, message: 'Series deleted' });
  } catch (error) {
    console.error('Error deleting test series:', error);
    res.status(500).json({ error: 'Failed to delete test series', details: error.message });
  }
});

// DELETE ALL test-series
app.delete('/api/test-series', async (req, res) => {
  try {
    const result = await db.collection('testSeries').deleteMany({});
    res.json({ success: true, message: `Deleted ${result.deletedCount} test series` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete all test series' });
  }
});

// Bulk create test-series
app.post('/api/test-series/bulk', async (req, res) => {
  try {
    const { series } = req.body;
    if (!Array.isArray(series) || series.length === 0) return res.status(400).json({ error: 'No series provided' });
    const result = await db.collection('testSeries').insertMany(series);
    res.status(201).json({ success: true, inserted: result.insertedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk create test series' });
  }
});

// Update-all test-series
app.put('/api/test-series/update-all', async (req, res) => {
  try {
    const updates = (req.body && req.body.updates) ? req.body.updates : (Array.isArray(req.body) ? req.body : []);
    for (const update of updates) {
      const { id, _id, ...data } = update;
      if (id) await db.collection('testSeries').updateOne({ id }, { $set: data });
    }
    res.json({ success: true, message: `Updated ${updates.length} series` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update all test series' });
  }
});

// Routes for Subjective Tests
app.get('/api/subjective-tests', async (req, res) => {
  try {
    const tests = await db.collection('subjectiveTests').find({}).toArray();
    console.log('GET /api/subjective-tests - Found', tests.length, 'tests');
    res.json(tests);
  } catch (error) {
    console.error('Error fetching subjective tests:', error);
    res.status(500).json({ error: 'Failed to fetch subjective tests' });
  }
});

app.post('/api/subjective-tests', async (req, res) => {
  try {
    console.log('POST /api/subjective-tests - Received test data:', req.body);
    const result = await db.collection('subjectiveTests').insertOne(req.body);
    console.log('Subjective test created successfully with ID:', result.insertedId);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    console.error('Error creating subjective test:', error);
    res.status(500).json({ error: 'Failed to create subjective test', details: error.message });
  }
});

app.put('/api/subjective-tests/:id', async (req, res) => {
  try {
    console.log('PUT /api/subjective-tests/:id - Updating test:', req.params.id, req.body);
    const { _id, ...updateData } = req.body;
    const result = await db.collection('subjectiveTests').updateOne(
      { id: req.params.id },
      { $set: updateData }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Test not found' });
    console.log('Subjective test updated successfully:', req.params.id);
    res.json({ success: true, message: 'Test updated' });
  } catch (error) {
    console.error('Error updating subjective test:', error);
    res.status(500).json({ error: 'Failed to update subjective test', details: error.message });
  }
});

app.delete('/api/subjective-tests/:id', async (req, res) => {
  try {
    console.log('DELETE /api/subjective-tests/:id - Deleting test:', req.params.id);
    const result = await db.collection('subjectiveTests').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Test not found' });
    console.log('Subjective test deleted successfully:', req.params.id);
    res.json({ success: true, message: 'Test deleted' });
  } catch (error) {
    console.error('Error deleting subjective test:', error);
    res.status(500).json({ error: 'Failed to delete subjective test', details: error.message });
  }
});

// DELETE ALL subjective-tests
app.delete('/api/subjective-tests', async (req, res) => {
  try {
    const result = await db.collection('subjectiveTests').deleteMany({});
    res.json({ success: true, message: `Deleted ${result.deletedCount} subjective tests` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete all subjective tests' });
  }
});

// Bulk create subjective-tests
app.post('/api/subjective-tests/bulk', async (req, res) => {
  try {
    const { tests } = req.body;
    if (!Array.isArray(tests) || tests.length === 0) return res.status(400).json({ error: 'No tests provided' });
    const result = await db.collection('subjectiveTests').insertMany(tests);
    res.status(201).json({ success: true, inserted: result.insertedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk create subjective tests' });
  }
});

// Update-all subjective-tests
app.put('/api/subjective-tests/update-all', async (req, res) => {
  try {
    const updates = (req.body && req.body.updates) ? req.body.updates : (Array.isArray(req.body) ? req.body : []);
    for (const update of updates) {
      const { id, _id, ...data } = update;
      if (id) await db.collection('subjectiveTests').updateOne({ id }, { $set: data });
    }
    res.json({ success: true, message: `Updated ${updates.length} subjective tests` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update all subjective tests' });
  }
});


app.get('/api/videos', async (req, res) => {
  try {
    const { courseId, isFree } = req.query;
    const query = {};
    if (courseId) query.courseId = courseId;
    if (isFree === 'true') {
      query.$or = [
        { isFree: true },
        { isFree: 'true' },
        { isFree: 1 },
        { price: 0 },
        { price: '0' }
      ];
    }
    const videos = await db.collection('videos').find(query).toArray();
    res.json(videos);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// Get videos by course
app.get('/api/courses/:courseId/videos', async (req, res) => {
  try {
    const course = await findCourse(req.params.courseId);
    const courseNames = [];
    if (course) {
      if (course.name) courseNames.push(course.name);
      if (course.title && course.title !== course.name) courseNames.push(course.title);
    }
    const matchConditions = [
      { courseId: req.params.courseId }
    ];
    if (course) {
      const idVariants = [String(course.id || ''), String(course._id || '')].filter(Boolean);
      matchConditions.push({ courseId: { $in: idVariants } });
    }
    if (courseNames.length > 0) {
      matchConditions.push({ course: { $in: courseNames } });
    }
    const videos = await db.collection('videos').find({ $or: matchConditions }).sort({ order: 1 }).toArray();
    res.json(videos);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch course videos' });
  }
});

// Add video to course
app.post('/api/courses/:courseId/videos', async (req, res) => {
  try {
    const videoData = { ...req.body, courseId: req.params.courseId };
    const result = await db.collection('videos').insertOne(videoData);
    res.status(201).json({ _id: result.insertedId, ...videoData });
  } catch (error) {
    console.error('[SERVER_ERROR] POST /api/courses/:courseId/videos:', error);
    res.status(500).json({ error: 'Failed to add video to course', details: error.message });
  }
});

// Update video in course
app.put('/api/courses/:courseId/videos/:videoId', async (req, res) => {
  try {
    const videoId = req.params.videoId;
    const { _id, ...updateData } = req.body;

    // Search by both id and _id for maximum compatibility
    const query = {
      $or: [
        { id: videoId },
        { _id: ObjectId.isValid(videoId) ? new ObjectId(videoId) : null }
      ].filter(v => v.id || v._id),
      courseId: req.params.courseId
    };

    const result = await db.collection('videos').updateOne(query, { $set: updateData });
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Video not found' });
    res.json({ success: true, message: 'Video updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update video' });
  }
});

// Delete video from course
app.delete('/api/courses/:courseId/videos/:videoId', async (req, res) => {
  try {
    const result = await db.collection('videos').deleteOne({ id: req.params.videoId, courseId: req.params.courseId });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Video not found' });
    res.json({ success: true, message: 'Video deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete video' });
  }
});

app.post('/api/videos', async (req, res) => {
  try {
    const videoData = { ...req.body };
    if (!videoData.courseId && videoData.course) {
      const course = await db.collection('courses').findOne({
        $or: [
          { name: videoData.course },
          { title: videoData.course },
          { id: videoData.course }
        ]
      });
      if (course) {
        videoData.courseId = course.id || course._id.toString();
        videoData.courseName = course.name || course.title;
      }
    }
    const result = await db.collection('videos').insertOne(videoData);
    res.status(201).json({ _id: result.insertedId, ...videoData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create video' });
  }
});

app.put('/api/videos/:id', async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const result = await db.collection('videos').updateOne(
      { id: req.params.id },
      { $set: updateData }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Video not found' });
    res.json({ success: true, message: 'Video updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update video' });
  }
});

app.delete('/api/videos/:id', async (req, res) => {
  try {
    const result = await db.collection('videos').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Video not found' });
    res.json({ success: true, message: 'Video deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete video' });
  }
});

// DELETE ALL videos
app.delete('/api/videos', async (req, res) => {
  try {
    const result = await db.collection('videos').deleteMany({});
    res.json({ success: true, message: `Deleted ${result.deletedCount} videos` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete all videos' });
  }
});

// Bulk create videos
app.post('/api/videos/bulk', async (req, res) => {
  try {
    const { videos } = req.body;
    if (!Array.isArray(videos) || videos.length === 0) return res.status(400).json({ error: 'No videos provided' });
    const result = await db.collection('videos').insertMany(videos);
    res.status(201).json({ success: true, inserted: result.insertedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk create videos' });
  }
});

// Update-all videos
app.put('/api/videos/update-all', async (req, res) => {
  try {
    const updates = Array.isArray(req.body) ? req.body : Object.values(req.body);
    for (const update of updates) {
      const { id, _id, ...data } = update;
      if (id) await db.collection('videos').updateOne({ id }, { $set: data });
    }
    res.json({ success: true, message: `Updated ${updates.length} videos` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update all videos' });
  }
});


// Routes for Live Videos/Streams
app.get('/api/live-videos', async (req, res) => {
  try {
    const liveVideos = await db.collection('liveVideos').find({}).toArray();
    const courseLiveStreams = await db.collection('videos').find({ 
      contentType: { $in: ['live_stream', 'youtube_zoom'] } 
    }).toArray();

    const allSessions = [...liveVideos, ...courseLiveStreams];
    const now = new Date();

    const calculated = allSessions.map(item => {
      const startTimeStr = item.publishOn || item.date || item.createdAt;
      const startTime = startTimeStr ? new Date(startTimeStr) : new Date();
      const targetEnd = item.endTime || item.endDateTime;
      const endTime = targetEnd ? new Date(targetEnd) : new Date(startTime.getTime() + 60 * 60 * 1000);
      const joinBeforeMin = parseInt(item.joinBeforeMinutes || 10);
      const joinTime = new Date(startTime.getTime() - joinBeforeMin * 60 * 1000);

      // Dynamic Status Calculation
      let status = item.status || 'upcoming';
      if (item.status === 'inactive' || item.status === 'ended' || item.status === 'completed') {
        status = 'ended';
      } else if (now < joinTime) {
        status = 'upcoming';
      } else if (now >= joinTime && now <= endTime) {
        status = 'live';
      } else {
        status = 'ended';
      }

      return {
        ...item,
        _id: item._id,
        id: (item.id || item._id)?.toString(),
        status,
        isLive: status === 'live'
      };
    }).sort((a,b) => new Date(a.publishOn || a.date || a.createdAt) - new Date(b.publishOn || b.date || b.createdAt));
    
    res.json(calculated);

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch live videos' });
  }
});

app.post('/api/live-videos', async (req, res) => {
  try {
    const result = await db.collection('liveVideos').insertOne(req.body);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create live video' });
  }
});

app.put('/api/live-videos/:id', async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const filter = {
      $or: [
        { id: req.params.id },
        { _id: req.params.id },
        { _id: ObjectId.isValid(req.params.id) ? new ObjectId(req.params.id) : null }
      ].filter(f => f.id || f._id)
    };
    const result = await db.collection('liveVideos').updateOne(filter, { $set: updateData });
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Live video not found' });
    res.json({ success: true, message: 'Live video updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update live video' });
  }
});

app.delete('/api/live-videos/:id', async (req, res) => {
  try {
    const filter = {
      $or: [
        { id: req.params.id },
        { _id: req.params.id },
        { _id: ObjectId.isValid(req.params.id) ? new ObjectId(req.params.id) : null }
      ].filter(f => f.id || f._id)
    };
    const result = await db.collection('liveVideos').deleteOne(filter);
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Live video not found' });
    res.json({ success: true, message: 'Live video deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete live video' });
  }
});

// Routes for PDFs/Notes
app.get('/api/pdfs', async (req, res) => {
  try {
    const { courseId } = req.query;
    const query = courseId ? { courseId } : {};
    const pdfs = await db.collection('pdfs').find(query).toArray();
    res.json(pdfs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch PDFs' });
  }
});

// Get notes/PDFs by course
app.get('/api/courses/:courseId/notes', async (req, res) => {
  try {
    const notes = await db.collection('pdfs').find({ courseId: req.params.courseId }).sort({ order: 1 }).toArray();
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch course notes' });
  }
});

// Add note to course
app.post('/api/courses/:courseId/notes', async (req, res) => {
  try {
    const noteData = { ...req.body, courseId: req.params.courseId };
    const result = await db.collection('pdfs').insertOne(noteData);
    res.status(201).json({ _id: result.insertedId, ...noteData });
  } catch (error) {
    console.error('[SERVER_ERROR] POST /api/courses/:courseId/notes:', error);
    res.status(500).json({ error: 'Failed to add note to course', details: error.message });
  }
});

// Update note in course
app.put('/api/courses/:courseId/notes/:noteId', async (req, res) => {
  try {
    const noteId = req.params.noteId;
    const { _id, ...updateData } = req.body;

    const query = {
      $or: [
        { id: noteId },
        { _id: ObjectId.isValid(noteId) ? new ObjectId(noteId) : null }
      ].filter(v => v.id || v._id),
      courseId: req.params.courseId
    };

    const result = await db.collection('pdfs').updateOne(query, { $set: updateData });
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Note not found' });
    res.json({ success: true, message: 'Note updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// Delete note from course
app.delete('/api/courses/:courseId/notes/:noteId', async (req, res) => {
  try {
    const result = await db.collection('pdfs').deleteOne({ id: req.params.noteId, courseId: req.params.courseId });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Note not found' });
    res.json({ success: true, message: 'Note deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// Get tests by course
app.get('/api/courses/:courseId/tests', async (req, res) => {
  try {
    const tests = await db.collection('tests').find({
      $or: [
        { courseId: req.params.courseId },
        { testSeriesId: req.params.courseId }
      ]
    }).toArray();
    res.json(tests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch course tests' });
  }
});

// Add test to course
app.post('/api/courses/:courseId/tests', async (req, res) => {
  try {
    const testData = { ...req.body, courseId: req.params.courseId };
    const result = await db.collection('tests').insertOne(testData);
    res.status(201).json({ _id: result.insertedId, ...testData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add test to course' });
  }
});

// Update test in course
app.put('/api/courses/:courseId/tests/:testId', async (req, res) => {
  try {
    const course = await findCourse(req.params.courseId);
    const testId = req.params.testId;

    const query = {
      $or: [
        { id: testId },
        { _id: mongoose.Types.ObjectId.isValid(testId) ? new mongoose.Types.ObjectId(testId) : null }
      ].filter(v => v.id || v._id)
    };

    if (course) {
      query.courseId = { $in: [course.id, course._id.toString(), req.params.courseId] };
    }

    const { _id, ...updateData } = req.body;
    const result = await db.collection('tests').updateOne(
      query,
      { $set: { ...updateData, updatedAt: new Date().toISOString() } }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Test not found' });
    res.json({ success: true, message: 'Test updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update test' });
  }
});

// Delete test from course
app.delete('/api/courses/:courseId/tests/:testId', async (req, res) => {
  const { courseId, testId } = req.params;
  console.log(`[DELETE TEST] Attempting to delete test ${testId} from course ${courseId}`);
  try {
    const course = await findCourse(courseId);
    const idVariants = await getRelatedCourseIds(course, courseId);

    // Support string, ObjectId, and Numeric IDs just like the generic route
    const idConditions = [
      { id: testId },
      { id: !isNaN(testId) ? Number(testId) : null },
      { _id: testId },
      { _id: mongoose.Types.ObjectId.isValid(testId) ? new mongoose.Types.ObjectId(testId) : null }
    ].filter(v => (v.id !== null && v.id !== undefined) || (v._id !== null && v._id !== undefined));

    const query = {
      $or: idConditions,
      $and: [{
        $or: [
          { courseId: { $in: idVariants } },
          { testSeriesId: { $in: idVariants } }
        ]
      }]
    };

    console.log('[DELETE TEST] Query:', JSON.stringify(query));
    const result = await db.collection('tests').deleteOne(query);
    console.log('[DELETE TEST] Result:', result);

    if (result.deletedCount === 0) {
      console.warn('[DELETE TEST] No test found matching criteria');
      return res.status(404).json({ error: 'Test not found' });
    }
    res.json({ success: true, message: 'Test deleted' });
  } catch (error) {
    console.error('[DELETE TEST] Error:', error);
    res.status(500).json({ error: 'Failed to delete test' });
  }
});

app.post('/api/pdfs', async (req, res) => {
  try {
    const result = await db.collection('pdfs').insertOne(req.body);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create PDF' });
  }
});

app.put('/api/pdfs/:id', async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const result = await db.collection('pdfs').updateOne(
      { id: req.params.id },
      { $set: updateData }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'PDF not found' });
    res.json({ success: true, message: 'PDF updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update PDF' });
  }
});

app.delete('/api/pdfs/:id', async (req, res) => {
  try {
    const result = await db.collection('pdfs').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'PDF not found' });
    res.json({ success: true, message: 'PDF deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete PDF' });
  }
});

// DELETE ALL pdfs
app.delete('/api/pdfs', async (req, res) => {
  try {
    const result = await db.collection('pdfs').deleteMany({});
    res.json({ success: true, message: `Deleted ${result.deletedCount} PDFs` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete all PDFs' });
  }
});

// Bulk create PDFs
app.post('/api/pdfs/bulk', async (req, res) => {
  try {
    const { pdfs } = req.body;
    if (!Array.isArray(pdfs) || pdfs.length === 0) return res.status(400).json({ error: 'No PDFs provided' });
    const result = await db.collection('pdfs').insertMany(pdfs);
    res.status(201).json({ success: true, inserted: result.insertedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk create PDFs' });
  }
});

// Update-all PDFs
app.put('/api/pdfs/update-all', async (req, res) => {
  try {
    const updates = Array.isArray(req.body) ? req.body : Object.values(req.body);
    for (const update of updates) {
      const { id, _id, ...data } = update;
      if (id) await db.collection('pdfs').updateOne({ id }, { $set: data });
    }
    res.json({ success: true, message: 'PDFs updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update all PDFs' });
  }
});

// Routes for Packages/Batches
app.get('/api/packages', async (req, res) => {
  try {
    const packages = await db.collection('packages').find({}).toArray();
    res.json(packages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

app.post('/api/packages', async (req, res) => {
  try {
    const result = await db.collection('packages').insertOne(req.body);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create package' });
  }
});

app.put('/api/packages/:id', async (req, res) => {
  try {
    console.log(`PUT /api/packages/${req.params.id} - Body size: ${JSON.stringify(req.body).length} bytes`);
    const { _id, ...updateData } = req.body;
    const id = req.params.id;
    console.log(`Aggressive PUT/packages lookup for identifier: ${id}`);

    let record = await db.collection('packages').findOne({ $or: [{ id: id }, { _id: id }] });
    if (!record && mongoose.Types.ObjectId.isValid(id)) {
      record = await db.collection('packages').findOne({ _id: new mongoose.Types.ObjectId(id) });
    }

    let targetCollection = 'packages';
    if (!record) {
      record = await db.collection('courses').findOne({ $or: [{ id: id }, { _id: id }] });
      if (!record && mongoose.Types.ObjectId.isValid(id)) {
        record = await db.collection('courses').findOne({ _id: new mongoose.Types.ObjectId(id) });
      }
      if (record) targetCollection = 'courses';
    }

    if (!record) {
      console.warn(`[UPDATE FAILED] Package/Course not found in DB for id: ${id}`);
      return res.status(404).json({ error: 'Package/Course not found in DB' });
    }

    console.log(`[TARGET MATCH] Collection: ${targetCollection}, DB _id: ${record._id}`);

    await db.collection(targetCollection).updateOne(
      { _id: record._id },
      { $set: { ...updateData, updatedAt: new Date().toISOString() } }
    );

    res.json({ success: true, message: 'Updated successfully', collection: targetCollection });
  } catch (error) {
    console.error(`Failed to update package ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update package', details: error.message });
  }
});

app.delete('/api/packages/:id', async (req, res) => {
  try {
    let filter = {
      $or: [
        { id: req.params.id },
        { _id: ObjectId.isValid(req.params.id) ? new ObjectId(req.params.id) : null }
      ].filter(f => f.id || f._id)
    };
    let result = await db.collection('packages').deleteOne(filter);
    if (result.deletedCount === 0) {
      result = await db.collection('courses').deleteOne(filter);
    }
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Package not found' });
    res.json({ success: true, message: 'Package/Course deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete package' });
  }
});

// Routes for Messages
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await db.collection('messages').find({}).toArray();
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const result = await db.collection('messages').insertOne({
      ...req.body,
      createdAt: new Date(),
      read: false
    });
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create message' });
  }
});

app.put('/api/messages/:id', async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const result = await db.collection('messages').updateOne(
      { id: req.params.id },
      { $set: updateData }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Message not found' });
    res.json({ success: true, message: 'Message updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update message' });
  }
});

app.delete('/api/messages/:id', async (req, res) => {
  try {
    const result = await db.collection('messages').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Message not found' });
    res.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Routes for Blog
app.get('/api/blog', async (req, res) => {
  try {
    const posts = await db.collection('blog').find({}).sort({ createdAt: -1 }).toArray();
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch blog posts' });
  }
});

app.post('/api/blog', async (req, res) => {
  try {
    const result = await db.collection('blog').insertOne({
      ...req.body,
      createdAt: new Date(),
      status: req.body.status || 'draft'
    });
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create blog post' });
  }
});

app.put('/api/blog/:id', async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const result = await db.collection('blog').updateOne(
      { id: req.params.id },
      { $set: updateData }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Blog post not found' });
    res.json({ success: true, message: 'Blog post updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update blog post' });
  }
});

app.delete('/api/blog/:id', async (req, res) => {
  try {
    const result = await db.collection('blog').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Blog post not found' });
    res.json({ success: true, message: 'Blog post deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete blog post' });
  }
});

// Routes for Settings
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await db.collection('settings').findOne({});
    res.json(settings || { paymentGateway: 'razorpay', systemStatus: 'online', maintenanceMode: false });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const result = await db.collection('settings').updateOne(
      {},
      { $set: updateData },
      { upsert: true }
    );
    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Splash Screen Settings
app.get('/api/splash-screen', async (req, res) => {
  try {
    const splash = await db.collection('settings').findOne({ type: 'splash_screen' });
    const defaultSplash = {
      type: 'splash_screen',
      imageUrl: '/attach-assist/ChatGPT_Image_Feb_8,_2026,_05_51_58_PM_1770553325908.png',
      isActive: true,
      duration: 3000
    };
    res.json(splash || defaultSplash);
  } catch (error) {
    console.error('Error fetching splash screen:', error);
    const defaultSplash = {
      type: 'splash_screen',
      imageUrl: '/attach-assist/ChatGPT_Image_Feb_8,_2026,_05_51_58_PM_1770553325908.png',
      isActive: true,
      duration: 3000
    };
    res.json(defaultSplash);
  }
});

app.put('/api/splash-screen', async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    updateData.type = 'splash_screen';
    const result = await db.collection('settings').updateOne(
      { type: 'splash_screen' },
      { $set: updateData },
      { upsert: true }
    );
    res.json({ success: true, message: 'Splash screen settings updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update splash screen settings' });
  }
});

// Routes for Banners
app.get('/api/banners', async (req, res) => {
  try {
    const banners = await db.collection('banners').find({}).toArray();
    res.json(banners);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch banners' });
  }
});

app.post('/api/banners', async (req, res) => {
  try {
    const result = await db.collection('banners').insertOne(req.body);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create banner' });
  }
});

app.put('/api/banners/:id', async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const result = await db.collection('banners').updateOne(
      { id: req.params.id },
      { $set: updateData }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Banner not found' });
    res.json({ success: true, message: 'Banner updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update banner' });
  }
});

app.delete('/api/banners/:id', async (req, res) => {
  try {
    const result = await db.collection('banners').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Banner not found' });
    res.json({ success: true, message: 'Banner deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete banner' });
  }
});


// Routes for Quick Links
app.get('/api/quick-links', async (req, res) => {
  try {
    const links = await db.collection('quickLinks').find({}).sort({ sortBy: -1 }).toArray();
    res.json(links);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch quick links' });
  }
});

app.post('/api/quick-links', async (req, res) => {
  try {
    const result = await db.collection('quickLinks').insertOne(req.body);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create quick link' });
  }
});

app.put('/api/quick-links/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { _id, ...updateData } = req.body;

    let filter = { id: id };
    if (ObjectId.isValid(id)) filter = { $or: [{ id: id }, { _id: new ObjectId(id) }] };

    const result = await db.collection('quickLinks').updateOne(filter, { $set: updateData });
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Quick link not found' });
    res.json({ success: true, message: 'Quick link updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update quick link' });
  }
});

app.delete('/api/quick-links/:id', async (req, res) => {
  try {
    const id = req.params.id;
    let filter = { id: id };
    if (ObjectId.isValid(id)) filter = { $or: [{ id: id }, { _id: new ObjectId(id) }] };

    const result = await db.collection('quickLinks').deleteOne(filter);
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Quick link not found' });
    res.json({ success: true, message: 'Quick link deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete quick link' });
  }
});

// Routes for Misc items (subjects, topics, subcourses, instructions, news, notifications)

app.get('/api/subjects', async (req, res) => {
  try {
    const subjects = await db.collection('subjects').find({}).toArray();
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
});

app.post('/api/subjects', async (req, res) => {
  try {
    const result = await db.collection('subjects').insertOne(req.body);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create subject' });
  }
});

app.put('/api/subjects/:id', async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const result = await db.collection('subjects').updateOne({ id: req.params.id }, { $set: updateData });
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Subject not found' });
    res.json({ success: true, message: 'Subject updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update subject' });
  }
});

app.delete('/api/subjects/:id', async (req, res) => {
  try {
    const result = await db.collection('subjects').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Subject not found' });
    res.json({ success: true, message: 'Subject deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete subject' });
  }
});

app.get('/api/topics', async (req, res) => {
  try {
    const topics = await db.collection('topics').find({}).toArray();
    res.json(topics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch topics' });
  }
});

app.post('/api/topics', async (req, res) => {
  try {
    const result = await db.collection('topics').insertOne(req.body);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create topic' });
  }
});

app.put('/api/topics/:id', async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const result = await db.collection('topics').updateOne({ id: req.params.id }, { $set: updateData });
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Topic not found' });
    res.json({ success: true, message: 'Topic updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update topic' });
  }
});

app.delete('/api/topics/:id', async (req, res) => {
  try {
    const result = await db.collection('topics').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Topic not found' });
    res.json({ success: true, message: 'Topic deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete topic' });
  }
});

app.get('/api/subcourses', async (req, res) => {
  try {
    const subcourses = await db.collection('subcourses').find({}).toArray();
    res.json(subcourses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subcourses' });
  }
});

app.post('/api/subcourses', async (req, res) => {
  try {
    const result = await db.collection('subcourses').insertOne(req.body);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create subcourse' });
  }
});

app.put('/api/subcourses/:id', async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const result = await db.collection('subcourses').updateOne({ id: req.params.id }, { $set: updateData });
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Subcourse not found' });
    res.json({ success: true, message: 'Subcourse updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update subcourse' });
  }
});

app.delete('/api/subcourses/:id', async (req, res) => {
  try {
    const result = await db.collection('subcourses').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Subcourse not found' });
    res.json({ success: true, message: 'Subcourse deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete subcourse' });
  }
});

app.get('/api/instructions', async (req, res) => {
  try {
    const instructions = await db.collection('instructions').find({}).toArray();
    res.json(instructions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch instructions' });
  }
});

app.post('/api/instructions', async (req, res) => {
  try {
    const result = await db.collection('instructions').insertOne(req.body);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create instruction' });
  }
});

app.put('/api/instructions/:id', async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const result = await db.collection('instructions').updateOne({ id: req.params.id }, { $set: updateData });
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Instruction not found' });
    res.json({ success: true, message: 'Instruction updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update instruction' });
  }
});

app.delete('/api/instructions/:id', async (req, res) => {
  try {
    const result = await db.collection('instructions').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Instruction not found' });
    res.json({ success: true, message: 'Instruction deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete instruction' });
  }
});

app.get('/api/exam-documents', async (req, res) => {
  try {
    const docs = await db.collection('examDocuments').find({}).toArray();
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch exam documents' });
  }
});

app.post('/api/exam-documents', async (req, res) => {
  try {
    const result = await db.collection('examDocuments').insertOne(req.body);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create exam document' });
  }
});

app.put('/api/exam-documents/:id', async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const result = await db.collection('examDocuments').updateOne({ id: req.params.id }, { $set: updateData });
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Exam document not found' });
    res.json({ success: true, message: 'Exam document updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update exam document' });
  }
});

app.delete('/api/exam-documents/:id', async (req, res) => {
  try {
    const result = await db.collection('examDocuments').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Exam document not found' });
    res.json({ success: true, message: 'Exam document deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete exam document' });
  }
});

app.get('/api/news', async (req, res) => {
  try {
    const news = await db.collection('news').find({}).sort({ createdAt: -1 }).toArray();
    res.json(news);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

app.post('/api/news', async (req, res) => {
  try {
    const result = await db.collection('news').insertOne({ ...req.body, createdAt: new Date() });
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create news' });
  }
});

app.put('/api/news/:id', async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const result = await db.collection('news').updateOne({ id: req.params.id }, { $set: updateData });
    if (result.matchedCount === 0) return res.status(404).json({ error: 'News not found' });
    res.json({ success: true, message: 'News updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update news' });
  }
});

app.delete('/api/news/:id', async (req, res) => {
  try {
    const result = await db.collection('news').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'News not found' });
    res.json({ success: true, message: 'News deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete news' });
  }
});

app.get('/api/notifications', async (req, res) => {
  try {
    const notifications = await db.collection('notifications').find({}).sort({ createdAt: -1 }).toArray();
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

app.post('/api/notifications', async (req, res) => {
  try {
    const notification = {
      ...req.body,
      createdAt: new Date(),
      isRead: false,
      sent: false
    };
    const result = await db.collection('notifications').insertOne(notification);
    res.status(201).json({ _id: result.insertedId, ...notification });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// 🔥 NEW: Filter users by batch
app.post('/api/notifications/send', async (req, res) => {
  try {
    const { batchId, message } = req.body;

    if (!batchId) {
      return res.status(400).json({ error: 'Batch ID is required' });
    }

    const course = await findCourse(batchId);
    let idVariants = [batchId];
    
    if (course) {
      idVariants = await getRelatedCourseIds(course, batchId);
    }
    
    const objectIdVariants = idVariants
      .filter(id => /^[a-fA-F0-9]{24}$/.test(id))
      .map(id => new ObjectId(id));

    const query = {
      $or: [
        { enrolledCourses: { $in: idVariants } },
        { enrolledCourses: { $in: objectIdVariants } }
      ]
    };

    const students = await db.collection('students').find(query).toArray();

    if (!students.length) {
      return res.status(404).json({ message: 'No students found for this batch' });
    }

    const notifications = students.map(student => {
      const uId = String(student.id || student._id);
      return {
        userId: uId,
        targetStudentId: uId,
        message,
        batchId,
        createdAt: new Date(),
        isRead: false,
        sent: false
      };
    });

    const result = await db.collection('notifications').insertMany(notifications);
    res.status(201).json({ 
      success: true, 
      message: `${students.length} notifications sent successfully`,
      count: result.insertedCount 
    });
  } catch (error) {
    console.error('Error sending batch notification:', error);
    res.status(500).json({ error: 'Failed to send batch notification' });
  }
});

app.put('/api/notifications/:id', async (req, res) => {
  try {
    const id = (req.params.id || '').trim();
    const updateData = { ...req.body };
    delete updateData._id; // Don't update the _id field
    
    let queryId = id;
    if (/^[a-fA-F0-9]{24}$/.test(id)) {
        queryId = new ObjectId(id);
    }

    const result = await db.collection('notifications').updateOne(
      { _id: queryId },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification updated successfully' });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

app.put('/api/notifications/bulk-update', async (req, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: 'Updates must be an array' });
    }

    const bulkOps = updates.map(update => {
      const id = String(update._id || '').trim();
      let queryId = id;
      if (/^[a-fA-F0-9]{24}$/.test(id)) {
        queryId = new ObjectId(id);
      }
      return {
        updateOne: {
          filter: { _id: queryId },
          update: { $set: { ...update, _id: undefined } }
        }
      };
    });

    const result = await db.collection('notifications').bulkWrite(bulkOps);
    res.json({
      success: true,
      message: 'Notifications updated successfully',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error bulk updating notifications:', error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

app.delete('/api/notifications/:id', async (req, res) => {
  try {
    const result = await db.collection('notifications').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Notification not found' });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Dashboard Stats API
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const [testsCount, packagesCount, storeCount, studentsCount, questionsCount, buyersData, ordersData] = await Promise.all([
      db.collection('tests').countDocuments(),
      db.collection('packages').countDocuments(),
      db.collection('store').countDocuments(),
      db.collection('students').countDocuments(),
      db.collection('questions').countDocuments(),
      db.collection('buyers').find({}).sort({ date: -1 }).limit(10).toArray(),
      db.collection('orders').find({}).sort({ createdAt: -1 }).limit(10).toArray()
    ]);

    res.json({
      liveTests: testsCount,
      activePackages: packagesCount + storeCount,
      registrations: studentsCount,
      questionsBank: questionsCount,
      recentBuyers: buyersData,
      recentOrders: ordersData
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Student Authentication Routes
// OTP Storage (in-memory with expiry)
const otpStore = new Map();

// Send OTP via Karix SMS for login
const otpLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 3, // limit to 3 requests per min
  message: { error: 'Too many OTP requests from this IP, please try again after a minute' }
});

app.post('/api/otp/send', otpLimiter, async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    // Check if the user is registered before sending OTP
    const student = await Student.findOne({ $or: [{ phone: cleanPhone }, { phone }] });
    if (!student) {
      return res.status(404).json({ error: 'Account not found. Please sign up first.' });
    }

    const lastSent = otpStore.get(cleanPhone);
    if (lastSent && Date.now() - lastSent.createdAt < 30000) {
      return res.status(429).json({ error: 'Please wait 30 seconds before requesting another OTP' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const apiKey = process.env.KARIX_API_KEY;
    const senderId = process.env.KARIX_SENDER_ID;
    const entityId = process.env.DLT_ENTITY_ID;
    const templateId = process.env.DLT_TEMPLATE_ID;

    const isProduction = process.env.NODE_ENV === 'production';
    // If any required Karix/DLT config is missing, in production we must fail.
    // In development, use a safe fallback: log the OTP and return a dev response.
    // For now, always use development fallback as requested, bypassing Karix.
    // In production, we would normally check for configuration here.
    const forceDummy = true;
    if (forceDummy || !apiKey || !senderId || !entityId || !templateId) {
      if (isProduction && !forceDummy) {
        return res.status(500).json({ error: 'SMS service not configured' });
      }

      console.warn(`Using development OTP fallback for ${cleanPhone}: ${otp}`);

      otpStore.set(cleanPhone, {
        otp,
        createdAt: Date.now(),
        attempts: 0
      });

      setTimeout(() => {
        const stored = otpStore.get(cleanPhone);
        if (stored && stored.otp === otp) {
          otpStore.delete(cleanPhone);
        }
      }, 5 * 60 * 1000);

      return res.json({
        success: true,
        message: 'OTP generated (Dummy - SMS not sent)',
        otp: otp // Always include OTP in response for now
      });
    }

    const dest = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const messageText = `Your OTP for Aone Target is ${otp}. Valid for 5 minutes. Do not share with anyone.`;

    const smsUrl = `https://japi.instaalerts.zone/httpapi/QueryStringReceiver`;
    const params = new URLSearchParams({
      ver: '1.0',
      key: apiKey,
      dest: dest,
      send: senderId,
      text: messageText,
      dlt_entity_id: entityId,
      dlt_template_id: templateId
    });

    const smsResponse = await fetch(`${smsUrl}?${params.toString()}`);
    const smsResult = await smsResponse.text();
    console.log('Karix SMS response:', smsResult);

    if (!smsResponse.ok || (smsResult && smsResult.toLowerCase().includes('error'))) {
      console.error('Karix SMS failed:', smsResult);
      return res.status(500).json({ error: 'Failed to send SMS. Please try again.' });
    }

    otpStore.set(cleanPhone, {
      otp,
      createdAt: Date.now(),
      attempts: 0
    });

    setTimeout(() => {
      const stored = otpStore.get(cleanPhone);
      if (stored && stored.otp === otp) {
        otpStore.delete(cleanPhone);
      }
    }, 5 * 60 * 1000);

    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('OTP send error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Verify OTP and create a login session (OTP-only login) — JWT + Single Device
app.post('/api/otp/verify', authLimiter, async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone and OTP are required' });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const stored = otpStore.get(cleanPhone);

    if (!stored) {
      return res.status(400).json({ error: 'OTP expired or not sent. Please request a new OTP.' });
    }

    if (stored.attempts >= 5) {
      otpStore.delete(cleanPhone);
      return res.status(400).json({ error: 'Too many attempts. Please request a new OTP.' });
    }

    stored.attempts++;

    if (stored.attempts >= 3) {
      // Send security alert for multiple failed OTP attempts
      try {
        const student = await db.collection('students').findOne({ $or: [{ phone: cleanPhone }, { phone }] });
        if (student && student.email) {
          const { subject, html } = templates.securityAlert(student.name || 'Student', new Date().toLocaleString(), 'OTP Verification');
          sendEmail({ to: student.email, subject, html }).catch(e => console.error('Security alert email error:', e));
        }
      } catch (e) {
        console.error('Error sending security alert:', e);
      }
    }

    if (Date.now() - stored.createdAt > 5 * 60 * 1000) {
      otpStore.delete(cleanPhone);
      return res.status(400).json({ error: 'OTP expired. Please request a new OTP.' });
    }

    if (String(stored.otp) !== String(otp)) {
      return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    }

    otpStore.delete(cleanPhone);

    const student = await Student.findOne({ $or: [{ phone: cleanPhone }, { phone }] });

    if (!student) {
      return res.status(404).json({ error: 'Account not found. Please register first.' });
    }

    const crypto = await import('crypto');
    const deviceId = req.body.deviceId || generateDeviceId();
    const sessionToken = crypto.randomBytes(32).toString('hex');

    // Check if user had a previous session for security alert
    const hadPreviousSession = student.activeDeviceId && student.activeDeviceId !== deviceId;

    // 2-Device Limit Logic
    if (!student.activeSessions) student.activeSessions = [];

    // Remove current device if already exists to update it
    student.activeSessions = student.activeSessions.filter(s => s.deviceId !== deviceId);

    // Add new session
    student.activeSessions.push({
      token: sessionToken,
      deviceId,
      lastLoginIP: req.ip || '',
      createdAt: new Date()
    });

    // Keep only last 2 sessions
    if (student.activeSessions.length > 2) {
      student.activeSessions = student.activeSessions.slice(-2);
    }

    student.sessionToken = sessionToken; // Legacy support
    student.activeDeviceId = deviceId;
    student.lastLoginIP = req.realIP || req.ip || req.connection?.remoteAddress || '';
    student.failedAttempts = 0; // Reset failed attempts on success
    student.lastLoginAt = new Date();
    await student.save();

    // Fallback to standard token approach
    const secureSessionToken = sessionToken;

    console.log(`[LOGIN_SUCCESS] phone: ${student.phone}, deviceId: ${deviceId}`);

    const tokens = generateTokens(student.toObject());

    const { sessionToken: __, password: _pw, ...studentData } = student.toObject();

    res.cookie('sessionToken', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // Send Login Success Email
    if (student.email) {
      const { subject, html } = templates.login(student.name, new Date().toLocaleString());
      sendEmail({ to: student.email, subject, html }).catch(e => console.error('Login email error:', e));
    }

    // Send Security Alert if a previous session was active (New Device/Browser login)
    if (hadPreviousSession && student.email) {
      const { subject, html } = templates.unauthorizedLogin(student.name, new Date().toLocaleString());
      sendEmail({ to: student.email, subject, html }).catch(e => console.error('Unauthorized login alert error:', e));
    }

    return res.json({
      success: true,
      verified: true,
      student: { ...studentData, sessionToken: secureSessionToken },
      accessToken: tokens.accessToken,
      deviceId,
      sessionToken: secureSessionToken,
      previousSessionRevoked: hadPreviousSession
    });
  } catch (error) {
    console.error('OTP verify error:', error);
    res.status(500).json({ error: 'OTP verification failed' });
  }
});

// JWT Token Refresh
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const decoded = verifyRefreshToken(refreshToken);

    const student = await Student.findOne({
      $or: [
        { id: decoded.studentId },
        ...(decoded.studentId && /^[a-f\d]{24}$/i.test(decoded.studentId) ? [{ _id: new ObjectId(decoded.studentId) }] : [])
      ]
    });

    if (!student) {
      return res.status(401).json({ error: 'User not found' });
    }

    const tokens = generateTokens(student.toObject());

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ accessToken: tokens.accessToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Heartbeat — validate session is still active + single device check
app.post('/api/heartbeat', async (req, res) => {
  try {
    const { deviceId: clientDeviceId, studentId } = req.body;

    let student = null;

    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    if (!token && req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (token) {
      try {
        const decoded = verifyAccessToken(token);
        student = await db.collection('students').findOne({
          $or: [
            { id: decoded.studentId },
            ...(decoded.studentId && /^[a-f\d]{24}$/i.test(decoded.studentId) ? [{ _id: new ObjectId(decoded.studentId) }] : [])
          ]
        });
      } catch (e) { }
    }

    if (!student && req.cookies.sessionToken) {
      student = await db.collection('students').findOne({ sessionToken: req.cookies.sessionToken });
    }

    if (!student && studentId) {
      student = await db.collection('students').findOne({
        $or: [
          { id: studentId },
          ...(studentId && /^[a-f\d]{24}$/i.test(studentId) ? [{ _id: new ObjectId(studentId) }] : [])
        ]
      });
    }

    if (!student) {
      return res.json({ valid: false, reason: 'not_authenticated' });
    }

    if (clientDeviceId && student.activeDeviceId && clientDeviceId !== student.activeDeviceId) {
      return res.json({
        valid: false,
        reason: 'another_device',
        message: 'Your account is now active on another device. You have been logged out.'
      });
    }

    await db.collection('students').updateOne(
      { _id: student._id },
      { $set: { lastHeartbeat: new Date() } }
    );

    // Fetch the latest notification timestamp relevant to the student
    const enrolledCourses = student.enrolledCourses || [];

    const latestNotif = await db.collection('notifications').findOne(
      {
        $and: [
          {
            $or: [
              { targetStudentId: student.id },
              { targetStudentId: student._id.toString() },
              { targetStudentId: 'all' },
              { targetStudentId: { $exists: false } }
            ]
          },
          {
            $or: [
              { targetCourseId: { $in: enrolledCourses } },
              { targetCourseId: 'all' },
              { targetCourseId: null },
              { targetCourseId: { $exists: false } }
            ]
          }
        ]
      },
      { sort: { createdAt: -1 } }
    );

    const latestNotificationTime = latestNotif ? new Date(latestNotif.createdAt || latestNotif.updatedAt).getTime() : null;

    return res.json({ valid: true, latestNotificationTime });
  } catch (error) {
    return res.json({ valid: true });
  }
});

// Generate signed video URL
app.post('/api/video/sign-url', authMiddleware, async (req, res) => {
  try {
    const { videoPath, courseId } = req.body;
    if (!videoPath) {
      return res.status(400).json({ error: 'Video path required' });
    }

    let student = null;
    if (req.user) {
      student = await db.collection('students').findOne({
        $or: [
          { id: req.user.studentId },
          ...(req.user.studentId && /^[a-f\d]{24}$/i.test(req.user.studentId) ? [{ _id: new ObjectId(req.user.studentId) }] : [])
        ]
      });
    } else if (req._legacySession && req.cookies.sessionToken) {
      student = await db.collection('students').findOne({ sessionToken: req.cookies.sessionToken });
    }

    if (!student) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (courseId) {
      const enrolled = (student.enrolledCourses || []).map(c => String(c));
      if (!enrolled.includes(String(courseId))) {
        const video = await db.collection('videos').findOne({
          $or: [
            { url: { $regex: videoPath } },
            { videoUrl: { $regex: videoPath } }
          ]
        });
        if (!video || !video.isFree) {
          return res.status(403).json({ error: 'Not enrolled in this course' });
        }
      }
    }

    const filename = videoPath.split('/').pop();
    const { signature, expiry } = generateSignedUrl(filename, 3600);
    const signedUrl = `/api/secure-video/${filename}?sig=${signature}&exp=${expiry}`;

    res.json({ signedUrl, expiresAt: expiry });
  } catch (error) {
    console.error('Sign URL error:', error);
    res.status(500).json({ error: 'Failed to generate signed URL' });
  }
});

app.get('/api/me', async (req, res) => {
  try {
    let student = null;

    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    if (!token && req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (token) {
      try {
        const decoded = verifyAccessToken(token);
        if (decoded && decoded.studentId) {
          student = await Student.findOne({
            $or: [
              { id: decoded.studentId },
              ...(typeof decoded.studentId === 'string' && /^[a-f\d]{24}$/i.test(decoded.studentId) ? [{ _id: new ObjectId(decoded.studentId) }] : [])
            ]
          });
        }
      } catch (e) {
        if (e.name === 'TokenExpiredError') {
          return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
        }
        console.error('Access token verify error:', e.message);
      }
    }

    if (!student) {
      const sessionToken = req.cookies.sessionToken;
      if (!sessionToken) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      student = await Student.findOne({ sessionToken });
      if (!student) {
        res.clearCookie('sessionToken');
        return res.status(401).json({ error: 'Invalid session' });
      }
    }

    if (!student) {
      return res.status(401).json({ error: 'Student not found' });
    }

    const { sessionToken: __, password: _pw, ...studentData } = student.toObject();
    return res.json({ student: studentData });
  } catch (err) {
    console.error('API /me error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/logout', async (req, res) => {
  try {
    const sessionToken = req.cookies.sessionToken;
    if (sessionToken) {
      await Student.updateOne(
        { sessionToken },
        { $unset: { sessionToken: 1, activeDeviceId: 1 } }
      );
    }
    res.clearCookie('sessionToken');
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
    res.json({ success: true });
  } catch (e) {
    res.clearCookie('sessionToken');
    res.json({ success: true });
  }
});

// Student registration without password / OTP requirement
app.post('/api/students/register', async (req, res) => {
  try {
    const { name, email, phone, class: studentClass, target, address, state, district, whatsAppNumber, alternateNumber, gender, dob } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const cleanWA = whatsAppNumber ? whatsAppNumber.replace(/\D/g, '') : '';
    const cleanAlt = alternateNumber ? alternateNumber.replace(/\D/g, '') : '';
    const normalizedEmail = email ? email.toLowerCase().trim() : '';

    const existingStudent = await Student.findOne({
      $or: [
        { phone: cleanPhone },
        ...(normalizedEmail ? [{ email: normalizedEmail }] : [])
      ]
    });

    if (existingStudent) {
      if (normalizedEmail && existingStudent.email === normalizedEmail) {
        return res.status(400).json({ error: 'This email address is already registered.' });
      }
      return res.status(400).json({ error: 'Phone number already registered' });
    }

    const studentId = 'STU-' + Date.now();
    const student = new Student({
      id: studentId,
      name,
      email: normalizedEmail,
      phone: cleanPhone,
      whatsAppNumber: cleanWA,
      alternateNumber: cleanAlt,
      class: studentClass || '11th',
      target: target || 'NEET',
      address: address || '',
      state: state || '',
      district: district || '',
      gender: gender || '',
      dob: dob || '',
      enrolledCourses: [],
      status: 'active'
    });

    await student.save();

    // Send Registration Success Email
    if (student.email) {
      const { subject, html } = templates.registration(student.name);
      sendEmail({ to: student.email, subject, html }).catch(e => console.error('Registration email error:', e));
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      student
    });
  } catch (error) {
    console.error('Error registering student:', error);
    res.status(500).json({ error: 'Registration failed: ' + error.message });
  }
});

// Legacy password-based login (kept for compatibility, but passwords are no longer required)
// Frontend student login should now use /api/otp/send and /api/otp/verify instead.
app.post('/api/students/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const student = await db.collection('students').findOne({ $or: [{ phone }, { phone: cleanPhone }] });

    if (!student) {
      return res.status(401).json({ error: 'Account not found. Please register first.' });
    }

    if (password && student.password && student.password !== password) {
      // Track failed attempts for legacy password login
      const newFailedAttempts = (student.failedAttempts || 0) + 1;
      await db.collection('students').updateOne(
        { _id: student._id },
        { $set: { failedAttempts: newFailedAttempts } }
      );

      if (newFailedAttempts >= 3 && student.email) {
        const { subject, html } = templates.securityAlert(student.name || 'Student', new Date().toLocaleString(), 'Password Login');
        sendEmail({ to: student.email, subject, html }).catch(e => console.error('Security alert email error:', e));
      }

      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset failed attempts on success
    if (student.failedAttempts > 0) {
      await db.collection('students').updateOne(
        { _id: student._id },
        { $set: { failedAttempts: 0 } }
      );
    }

    const { password: _, ...studentWithoutPassword } = student;
    res.json({
      success: true,
      message: 'Login successful',
      student: studentWithoutPassword
    });
  } catch (error) {
    console.error('Error logging in student:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// Single-device session validation for students
app.post('/api/students/session/validate', async (req, res) => {
  try {
    const { studentId, sessionToken } = req.body || {};

    if (!studentId || !sessionToken) {
      return res.status(400).json({ error: 'studentId and sessionToken are required' });
    }

    const student = await db.collection('students').findOne({ id: studentId });

    if (!student || !student.sessionToken || student.sessionToken !== sessionToken) {
      return res.status(401).json({ valid: false, error: 'Session invalid or expired' });
    }

    return res.json({ valid: true });
  } catch (error) {
    console.error('Session validate error:', error);
    res.status(500).json({ error: 'Failed to validate session' });
  }
});

// Check if a student phone is already registered
app.post('/api/students/check-phone', async (req, res) => {
  try {
    const { phone } = req.body || {};
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    const existingStudent = await db.collection('students').findOne({
      $or: [{ phone }, { phone: cleanPhone }]
    });

    return res.json({ exists: !!existingStudent });
  } catch (error) {
    console.error('Check phone error:', error);
    res.status(500).json({ error: 'Failed to check phone' });
  }
});

// Check if a student email is already registered
app.post('/api/students/check-email', async (req, res) => {
  try {
    const { email } = req.body || {};
    const normalizedEmail = email ? email.toLowerCase().trim() : '';
    if (!normalizedEmail) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const existingStudent = await db.collection('students').findOne({ email: normalizedEmail });

    return res.json({ exists: !!existingStudent });
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({ error: 'Failed to check email' });
  }
});

app.get('/api/students/:id', async (req, res) => {
  try {
    const student = await db.collection('students').findOne({ id: req.params.id });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch student' });
  }
});

app.put('/api/students/:id', async (req, res) => {
  try {
    const { _id, id: bodyId, ...updateData } = req.body;

    // Normalize email if provided
    if (updateData.email) {
      updateData.email = updateData.email.toLowerCase().trim();

      // Check for email conflicts (excluding self)
      const existing = await db.collection('students').findOne({
        email: updateData.email,
        id: { $ne: req.params.id }
      });
      if (existing) {
        return res.status(400).json({ error: 'This email address is already registered to another student.' });
      }
    }

    const result = await db.collection('students').updateOne(
      { id: req.params.id },
      { $set: { ...updateData, updatedAt: new Date() } }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Student not found' });
    res.json({ success: true, message: 'Profile updated' });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});


app.get('/api/students/:id/courses', async (req, res) => {
  try {
    const student = await db.collection('students').findOne({ id: req.params.id });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const enrolledCourseIds = student.enrolledCourses || [];
    if (enrolledCourseIds.length === 0) {
      return res.json([]);
    }

    // Query courses by both custom id and mongo _id
    const objectIds = enrolledCourseIds
      .filter(id => ObjectId.isValid(id))
      .map(id => new ObjectId(id));

    const courses = await db.collection('courses').find({
      $or: [
        { id: { $in: enrolledCourseIds } },
        { _id: { $in: objectIds } }
      ]
    }).toArray();

    // Fetch all watch progress for this student
    const watchProgress = await db.collection('watch_progress').find({ userId: req.params.id }).toArray();

    // Fetch and map courses with progress
    const mappedCourses = await Promise.all(courses.map(async (c) => {
      const courseIdStr = c.id || c._id.toString();
      const idVariants = await getCourseIdVariants(courseIdStr);

      // Total videos in this course
      const totalVideos = await db.collection('videos').countDocuments({
        courseId: { $in: idVariants }
      });

      // Watched videos in this course
      const watchedCount = watchProgress.filter(wp =>
        idVariants.includes(wp.courseId) && wp.watchedTime > 0
      ).length;

      const progress = totalVideos > 0 ? Math.round((watchedCount / totalVideos) * 100) : 0;

      return {
        ...c,
        id: courseIdStr,
        progress: progress,
        totalVideos: totalVideos,
        watchedCount: watchedCount
      };
    }));

    res.json(mappedCourses);
  } catch (error) {
    console.error('Error fetching student courses:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Enroll student in a course
app.post('/api/students/:id/enroll', async (req, res) => {
  try {
    const { courseId } = req.body;
    if (!courseId) {
      return res.status(400).json({ error: 'Course ID is required' });
    }

    const student = await db.collection('students').findOne({ id: req.params.id });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const course = await findCourse(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Use the canonical ID
    const canonicalId = course.id || course._id.toString();

    const enrolledCourses = student.enrolledCourses || [];
    if (enrolledCourses.includes(canonicalId) || enrolledCourses.includes(course._id.toString())) {
      return res.status(400).json({ error: 'Already enrolled in this course' });
    }

    await db.collection('students').updateOne(
      { id: req.params.id },
      { $addToSet: { enrolledCourses: canonicalId } }
    );

    // Update course enrollment count
    await db.collection('courses').updateOne(
      { _id: course._id },
      { $inc: { studentsEnrolled: 1 } }
    );

    // Send Manual Enrollment Email
    if (student.email) {
      const { subject, html } = templates.purchase(student.name || 'Student', course.name || course.title, course.price || 0);
      sendEmail({ to: student.email, subject, html }).catch(e => console.error('Enrollment email error:', e));
    }

    res.json({ success: true, message: 'Enrolled successfully' });
  } catch (error) {
    console.error('Enrollment error:', error);
    res.status(500).json({ error: 'Failed to enroll' });
  }
});
// Check if student is enrolled in a course
app.get('/api/students/:id/enrolled/:courseId', async (req, res) => {
  try {
    const student = await db.collection('students').findOne({ id: req.params.id });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const course = await findCourse(req.params.courseId);
    if (!course) {
      return res.json({ enrolled: false });
    }

    const idVariants = await getRelatedCourseIds(course, req.params.courseId);
    const enrolledCourses = student.enrolledCourses || [];

    // Check if any variant of the course ID is in the student's enrolled list
    const isEnrolled = idVariants.some(id => enrolledCourses.includes(id));

    res.json({ enrolled: isEnrolled });
  } catch (error) {
    console.error('Error checking enrollment:', error);
    res.status(500).json({ error: 'Failed to check enrollment' });
  }
});

// Get student's enrollment progress for a course
app.get('/api/students/:id/courses/:courseId/progress', async (req, res) => {
  try {
    const course = await findCourse(req.params.courseId);
    const courseId = course ? (course.id || course._id.toString()) : req.params.courseId;

    const enrollment = await db.collection('enrollments').findOne({
      studentId: req.params.id,
      courseId: { $in: [courseId, req.params.courseId] }
    });

    if (!enrollment) {
      return res.json({ completedVideos: [], completedTests: [], completedNotes: [] });
    }

    res.json(enrollment.progress || { completedVideos: [], completedTests: [], completedNotes: [] });
  } catch (error) {
    console.error('Error fetching enrollment progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// Update student's progress in a course
app.put('/api/students/:id/courses/:courseId/progress', async (req, res) => {
  try {
    const { videoId, testId, noteId, action } = req.body;

    const updateField = videoId ? 'progress.completedVideos' :
      testId ? 'progress.completedTests' :
        'progress.completedNotes';
    const itemId = videoId || testId || noteId;

    if (action === 'complete') {
      await db.collection('enrollments').updateOne(
        { studentId: req.params.id, courseId: req.params.courseId },
        { $addToSet: { [updateField]: itemId } }
      );
    } else {
      await db.collection('enrollments').updateOne(
        { studentId: req.params.id, courseId: req.params.courseId },
        { $pull: { [updateField]: itemId } }
      );
    }

    res.json({ success: true, message: 'Progress updated' });
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Messages Routes for Chat
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await db.collection('messages').find({}).sort({ createdAt: -1 }).toArray();
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const result = await db.collection('messages').insertOne({
      ...req.body,
      createdAt: new Date()
    });
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Student Progress Routes
app.get('/api/students/:id/progress', async (req, res) => {
  try {
    const progress = await db.collection('studentProgress').findOne({ studentId: req.params.id });
    if (!progress) {
      res.json({ physics: 45, chemistry: 60, biology: 35 });
    } else {
      res.json(progress);
    }
  } catch (error) {
    console.error('Error fetching student progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

app.put('/api/students/:id/progress', async (req, res) => {
  try {
    const result = await db.collection('studentProgress').updateOne(
      { studentId: req.params.id },
      { $set: { ...req.body, studentId: req.params.id } },
      { upsert: true }
    );
    res.json({ success: true, message: 'Progress updated' });
  } catch (error) {
    console.error('Error updating student progress:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Student Test Results Routes
app.get('/api/students/:id/test-results', async (req, res) => {
  try {
    const results = await db.collection('testResults')
      .find({ studentId: req.params.id })
      .sort({ submittedAt: -1 })
      .toArray();

    const enriched = await Promise.all(results.map(async (r) => {
      if (!r.testName && r.testId) {
        try {
          const t = await db.collection('tests').findOne({ id: r.testId });
          if (t) {
            r.testName = t.name || t.title || '';
            r.courseId = r.courseId || t.courseId || '';
            r.courseName = r.courseName || t.courseName || t.course || '';
          }
        } catch (e) { }
      }
      if (!r.courseName && r.courseId) {
        try {
          const c = await findCourse(r.courseId);
          if (c) r.courseName = c.name || c.title || '';
        } catch (e) { }
      }
      return r;
    }));

    res.json(enriched);
  } catch (error) {
    console.error('Error fetching test results:', error);
    res.status(500).json({ error: 'Failed to fetch test results' });
  }
});

app.get('/api/admin/test-results', async (req, res) => {
  try {
    const { studentId, courseId, testId } = req.query;
    const query = {};
    if (studentId) query.studentId = studentId;
    if (courseId) query.courseId = courseId;
    if (testId) query.testId = testId;
    const results = await db.collection('testResults')
      .find(query)
      .sort({ submittedAt: -1 })
      .toArray();

    const enriched = await Promise.all(results.map(async (r) => {
      if (!r.testName && r.testId) {
        try {
          const t = await db.collection('tests').findOne({ id: r.testId });
          if (t) {
            r.testName = t.name || t.title || '';
            r.courseId = r.courseId || t.courseId || '';
            r.courseName = r.courseName || t.courseName || t.course || '';
          }
        } catch (e) { }
      }
      if (!r.studentName && r.studentId) {
        try {
          const s = await db.collection('students').findOne({ id: r.studentId });
          if (s) r.studentName = s.name || '';
        } catch (e) { }
      }
      if (!r.courseName && r.courseId) {
        try {
          const c = await findCourse(r.courseId);
          if (c) r.courseName = c.name || c.title || '';
        } catch (e) { }
      }
      return r;
    }));

    res.json(enriched);
  } catch (error) {
    console.error('Error fetching all test results:', error);
    res.status(500).json({ error: 'Failed to fetch test results' });
  }
});

// Delete all test results
app.delete('/api/admin/test-results', async (req, res) => {
  try {
    const result = await db.collection('testResults').deleteMany({});
    res.json({ success: true, message: `Deleted ${result.deletedCount} records` });
  } catch (error) {
    console.error('Error deleting all test results:', error);
    res.status(500).json({ error: 'Failed to delete test results' });
  }
});

// Delete single test result
app.delete('/api/admin/test-results/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = {
      $or: [
        { id: id },
        { _id: ObjectId.isValid(id) ? new ObjectId(id) : null }
      ].filter(v => v.id || v._id)
    };
    const result = await db.collection('testResults').deleteOne(query);
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Test result not found' });
    }
    res.json({ success: true, message: 'Test result deleted' });
  } catch (error) {
    console.error('Error deleting test result:', error);
    res.status(500).json({ error: 'Failed to delete test result' });
  }
});

app.post('/api/students/:id/test-results', async (req, res) => {
  try {
    const result = await db.collection('testResults').insertOne({
      ...req.body,
      studentId: req.params.id,
      submittedAt: new Date()
    });
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    console.error('Error saving test result:', error);
    res.status(500).json({ error: 'Failed to save test result' });
  }
});

// Student Downloads Routes
app.get('/api/students/:id/downloads', async (req, res) => {
  try {
    const downloads = await db.collection('downloads').find({ studentId: req.params.id }).toArray();
    res.json(downloads);
  } catch (error) {
    console.error('Error fetching downloads:', error);
    res.status(500).json({ error: 'Failed to fetch downloads' });
  }
});

app.post('/api/students/:id/downloads', async (req, res) => {
  try {
    const result = await db.collection('downloads').insertOne({
      ...req.body,
      studentId: req.params.id,
      downloadedAt: new Date()
    });
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    console.error('Error saving download:', error);
    res.status(500).json({ error: 'Failed to save download' });
  }
});

app.delete('/api/students/:id/downloads/:downloadId', async (req, res) => {
  try {
    const { downloadId } = req.params;
    const result = await db.collection('downloads').deleteOne({
      $or: [
        { id: downloadId },
        { _id: global.ObjectId && global.ObjectId.isValid(downloadId) ? new global.ObjectId(downloadId) : null }
      ].filter(v => v.id || v._id),
      studentId: req.params.id
    });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Download not found' });
    }
    res.json({ success: true, message: 'Download deleted' });
  } catch (error) {
    console.error('Error deleting download:', error);
    res.status(500).json({ error: 'Failed to delete download' });
  }
});

// Student Watch History Routes
app.get('/api/students/:id/watch-history', async (req, res) => {
  try {
    const history = await db.collection('watchHistory').find({ studentId: req.params.id }).sort({ watchedAt: -1 }).toArray();
    res.json(history);
  } catch (error) {
    console.error('Error fetching watch history:', error);
    res.status(500).json({ error: 'Failed to fetch watch history' });
  }
});

app.post('/api/students/:id/watch-history', async (req, res) => {
  try {
    const result = await db.collection('watchHistory').insertOne({
      ...req.body,
      studentId: req.params.id,
      watchedAt: new Date()
    });
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    console.error('Error saving watch history:', error);
    res.status(500).json({ error: 'Failed to save watch history' });
  }
});

// Live Classes Routes
app.get('/api/live-classes', async (req, res) => {
  try {
    const classes = await db.collection('liveClasses').find({}).toArray();
    res.json(classes);
  } catch (error) {
    console.error('Error fetching live classes:', error);
    res.status(500).json({ error: 'Failed to fetch live classes' });
  }
});

app.post('/api/live-classes', async (req, res) => {
  try {
    const result = await db.collection('liveClasses').insertOne(req.body);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    console.error('Error creating live class:', error);
    res.status(500).json({ error: 'Failed to create live class' });
  }
});

app.put('/api/live-classes/:id', async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const result = await db.collection('liveClasses').updateOne(
      { id: req.params.id },
      { $set: updateData }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Live class not found' });
    res.json({ success: true, message: 'Live class updated' });
  } catch (error) {
    console.error('Error updating live class:', error);
    res.status(500).json({ error: 'Failed to update live class' });
  }
});

app.delete('/api/live-classes/:id', async (req, res) => {
  try {
    const result = await db.collection('liveClasses').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Live class not found' });
    res.json({ success: true, message: 'Live class deleted' });
  } catch (error) {
    console.error('Error deleting live class:', error);
    res.status(500).json({ error: 'Failed to delete live class' });
  }
});

// Routes for Live Classes
app.get('/api/courses/:courseId/live-classes', async (req, res) => {
  try {
    const course = await findCourse(req.params.courseId);
    if (!course) return res.json([]);

    const idVariants = await getRelatedCourseIds(course, req.params.courseId);
    const query = { courseId: { $in: idVariants } };

    const [c1, c2, c3] = await Promise.all([
      db.collection('liveVideos').find(query).toArray(),
      db.collection('liveClasses').find(query).toArray(),
      db.collection('videos').find({ ...query, contentType: { $in: ['youtube_zoom', 'live_stream'] } }).toArray()
    ]);

    const merged = [...c1, ...c2, ...c3].map(item => {
      const now = new Date();
      const startTime = new Date(item.publishOn || item.date || item.createdAt);
      const targetEnd = item.endTime || item.endDateTime;
      const endTime = targetEnd ? new Date(targetEnd) : new Date(startTime.getTime() + 60 * 60 * 1000); // Default 1 hour
      const joinBeforeMin = parseInt(item.joinBeforeMinutes) || 10;
      const joinTime = new Date(startTime.getTime() - joinBeforeMin * 60 * 1000);

      // Dynamic Status Calculation
      if (item.status === 'inactive' || item.status === 'ended' || item.status === 'completed') {
        item.status = 'ended';
      } else if (now < joinTime) {
        item.status = 'upcoming';
      } else if (now >= joinTime && now <= endTime) {
        item.status = 'live';
      } else {
        item.status = 'ended';
      }

      // Ensure date/startTime properties exist for the calendar view if they are missing
      if (!item.date && item.publishOn) {
        const d = new Date(item.publishOn);
        if (!isNaN(d.getTime())) {
          item.date = d.toISOString().split('T')[0]; // YYYY-MM-DD
          item.startTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; // HH:MM
        }
      }

      if (!item.id && item._id) {
        item.id = item._id.toString();
      }
      
      // Map 'url' or 'meetingLink' consistently
      if (!item.meetingLink) {
        item.meetingLink = item.url || item.videoUrl || item.link;
      }
      
      return item;
    }).sort((a,b) => new Date(a.date || a.publishOn || a.createdAt) - new Date(b.date || b.publishOn || b.createdAt));

    res.json(merged);
  } catch (error) {
    console.error('Error fetching course live classes:', error);
    res.status(500).json({ error: 'Failed to fetch live classes' });
  }
});

app.delete('/api/courses/:courseId/live-classes/:id', async (req, res) => {
  try {
    const result = await db.collection('liveClasses').deleteOne({ id: req.params.id, courseId: req.params.courseId });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Live class not found' });
    res.json({ success: true, message: 'Live class deleted' });
  } catch (error) {
    console.error('Error deleting live class:', error);
    res.status(500).json({ error: 'Failed to delete live class' });
  }
});

// Get all live classes for enrolled student courses
app.get('/api/students/:studentId/live-classes', async (req, res) => {
  try {
    const enrollments = await db.collection('enrollments').find({ studentId: req.params.studentId }).toArray();
    let courseIds = enrollments.map(e => e.courseId);

    // Expand to idVariants for each courseId to ensure robust matching across collections
    let expandedIds = [];
    for (const cId of courseIds) {
      if (cId) {
        const variants = await getCourseIdVariants(String(cId));
        expandedIds.push(...variants);
      }
    }
    const query = { courseId: { $in: [...new Set(expandedIds)] } };

    const [c1, c2, c3] = await Promise.all([
      db.collection('liveVideos').find(query).toArray(),
      db.collection('liveClasses').find(query).toArray(),
      db.collection('videos').find({ ...query, contentType: { $in: ['youtube_zoom', 'live_stream'] } }).toArray()
    ]);

    const merged = [...c1, ...c2, ...c3].map(item => {
      const now = new Date();
      const startTime = new Date(item.publishOn || item.date || item.createdAt);
      const targetEnd = item.endTime || item.endDateTime;
      const endTime = targetEnd ? new Date(targetEnd) : new Date(startTime.getTime() + 60 * 60 * 1000); // Default 1 hour
      const joinBeforeMin = parseInt(item.joinBeforeMinutes) || 10;
      const joinTime = new Date(startTime.getTime() - joinBeforeMin * 60 * 1000);

      // Dynamic Status Calculation
      if (item.status === 'inactive' || item.status === 'ended' || item.status === 'completed') {
        item.status = 'ended';
      } else if (now < joinTime) {
        item.status = 'upcoming';
      } else if (now >= joinTime && now <= endTime) {
        item.status = 'live';
      } else {
        item.status = 'ended';
      }

      // Ensure date/startTime properties exist for the calendar view if they are missing
      if (!item.date && item.publishOn) {
        const d = new Date(item.publishOn);
        if (!isNaN(d.getTime())) {
          item.date = d.toISOString().split('T')[0]; // YYYY-MM-DD
          item.startTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; // HH:MM
        }
      }

      // Map 'url' or 'meetingLink' consistently
      if (!item.meetingLink) {
        item.meetingLink = item.url || item.videoUrl || item.link;
      }

      return item;
    }).sort((a, b) => new Date(a.date || a.publishOn || a.createdAt) - new Date(b.date || b.publishOn || b.createdAt));

    res.json(merged);
  } catch (error) {
    console.error('Error fetching student live classes:', error);
    res.status(500).json({ error: 'Failed to fetch live classes' });
  }
});

// Routes for Categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await db.collection('categories').find({}).sort({ order: 1 }).toArray();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const { _id, ...categoryData } = req.body;
    const result = await db.collection('categories').insertOne(categoryData);
    res.status(201).json({ _id: result.insertedId, ...categoryData });
  } catch (error) {
    console.error('Category creation error:', error);
    res.status(500).json({ error: 'Failed to create category', details: error.message });
  }
});

app.put('/api/categories/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const query = {
      $or: [
        { id: id },
        { _id: ObjectId.isValid(id) ? new ObjectId(id) : null }
      ].filter(v => v.id || v._id)
    };

    const { _id, ...updateData } = req.body;
    console.log(`Updating category ${id} with:`, updateData);

    const result = await db.collection('categories').updateOne(query, { $set: updateData });

    if (result.matchedCount === 0) {
      console.warn(`Category not found for update: ${id}`);
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ success: true, message: 'Category updated' });
  } catch (error) {
    console.error('Category update error:', error);
    res.status(500).json({ error: 'Failed to update category', details: error.message });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    let filter;
    try { filter = { _id: new ObjectId(req.params.id) }; } catch { filter = { id: req.params.id }; }
    const result = await db.collection('categories').deleteOne(filter);
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Category not found' });
    await db.collection('subcategories').deleteMany({ categoryId: req.params.id });
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Routes for SubCategories
app.get('/api/subcategories', async (req, res) => {
  try {
    const { categoryId } = req.query;
    const query = categoryId ? { categoryId } : {};
    const subcategories = await db.collection('subcategories').find(query).sort({ order: 1 }).toArray();
    res.json(subcategories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subcategories' });
  }
});

app.post('/api/subcategories', async (req, res) => {
  try {
    const result = await db.collection('subcategories').insertOne(req.body);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create subcategory' });
  }
});

app.put('/api/subcategories/:id', async (req, res) => {
  try {
    let filter;
    try { filter = { _id: new ObjectId(req.params.id) }; } catch { filter = { id: req.params.id }; }
    const { _id, ...updateData } = req.body;
    const result = await db.collection('subcategories').updateOne(filter, { $set: updateData });
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Subcategory not found' });
    res.json({ success: true, message: 'Subcategory updated' });
  } catch (error) {
    console.error('Subcategory update error:', error);
    res.status(500).json({ error: 'Failed to update subcategory' });
  }
});

app.delete('/api/subcategories/:id', async (req, res) => {
  try {
    let filter;
    try { filter = { _id: new ObjectId(req.params.id) }; } catch { filter = { id: req.params.id }; }
    const result = await db.collection('subcategories').deleteOne(filter);
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Subcategory not found' });
    res.json({ success: true, message: 'Subcategory deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete subcategory' });
  }
});

// Seed default categories if collection is empty
app.post('/api/categories/seed', async (req, res) => {
  try {
    const count = await db.collection('categories').countDocuments();
    if (count > 0) return res.json({ message: 'Categories already seeded', count });

    const defaultCategories = [
      { id: 'neet', title: 'NEET', subtitle: 'Medical Entrance', icon: 'biotech', gradient: 'from-blue-600 to-indigo-700', description: 'Class 11th & 12th - Biology, Chemistry, Physics', tag: 'Most Popular', order: 1, isActive: true },
      { id: 'iit-jee', title: 'IIT-JEE', subtitle: 'Engineering Entrance', icon: 'engineering', gradient: 'from-orange-500 to-red-600', description: 'Physics, Chemistry, Mathematics', tag: 'Trending', order: 2, isActive: true },
      { id: 'nursing', title: 'Nursing CET', subtitle: 'Nursing & Paramedical', icon: 'local_hospital', gradient: 'from-teal-500 to-emerald-600', description: 'BSC, GNM, ANM-MPHW & More', tag: '', order: 3, isActive: true },
      { id: 'general', title: 'General Studies', subtitle: 'Class 9th & 10th', icon: 'menu_book', gradient: 'from-purple-500 to-violet-600', description: 'CBSE & HBSE Board', tag: '', order: 4, isActive: true }
    ];

    await db.collection('categories').insertMany(defaultCategories);

    const defaultSubcategories = [
      { categoryId: 'neet', id: 'neet_class-11_recorded-batch', title: 'Class 11th - Recorded Batch', parentPath: 'Class 11th', icon: 'video_library', color: 'bg-blue-500', order: 1, isActive: true },
      { categoryId: 'neet', id: 'neet_class-11_live-classroom', title: 'Class 11th - Live Classroom', parentPath: 'Class 11th', icon: 'cast_for_education', color: 'bg-red-500', order: 2, isActive: true },
      { categoryId: 'neet', id: 'neet_class-11_crash-course', title: 'Class 11th - Crash Course', parentPath: 'Class 11th', icon: 'speed', color: 'bg-orange-500', order: 3, isActive: true },
      { categoryId: 'neet', id: 'neet_class-11_mock-test', title: 'Class 11th - Mock Test', parentPath: 'Class 11th', icon: 'quiz', color: 'bg-green-500', order: 4, isActive: true },
      { categoryId: 'neet', id: 'neet_class-12_recorded-batch', title: 'Class 12th - Recorded Batch', parentPath: 'Class 12th', icon: 'video_library', color: 'bg-blue-500', order: 5, isActive: true },
      { categoryId: 'neet', id: 'neet_class-12_live-classroom', title: 'Class 12th - Live Classroom', parentPath: 'Class 12th', icon: 'cast_for_education', color: 'bg-red-500', order: 6, isActive: true },
      { categoryId: 'neet', id: 'neet_class-12_crash-course', title: 'Class 12th - Crash Course', parentPath: 'Class 12th', icon: 'speed', color: 'bg-orange-500', order: 7, isActive: true },
      { categoryId: 'neet', id: 'neet_class-12_mock-test', title: 'Class 12th - Mock Test', parentPath: 'Class 12th', icon: 'quiz', color: 'bg-green-500', order: 8, isActive: true },
      { categoryId: 'neet', id: 'neet_neet-exam_recorded-batch', title: 'NEET Exams - Recorded Batch', parentPath: 'NEET Exams', icon: 'video_library', color: 'bg-blue-500', order: 9, isActive: true },
      { categoryId: 'neet', id: 'neet_neet-exam_live-classroom', title: 'NEET Exams - Live Classroom', parentPath: 'NEET Exams', icon: 'cast_for_education', color: 'bg-red-500', order: 10, isActive: true },
      { categoryId: 'neet', id: 'neet_neet-exam_crash-course', title: 'NEET Exams - Crash Course', parentPath: 'NEET Exams', icon: 'speed', color: 'bg-orange-500', order: 11, isActive: true },
      { categoryId: 'neet', id: 'neet_neet-exam_mock-test', title: 'NEET Exams - Mock Test', parentPath: 'NEET Exams', icon: 'quiz', color: 'bg-green-500', order: 12, isActive: true },
      { categoryId: 'iit-jee', id: 'iit-jee_recorded-batch', title: 'Recorded Batch', parentPath: '', icon: 'video_library', color: 'bg-blue-500', order: 1, isActive: true },
      { categoryId: 'iit-jee', id: 'iit-jee_live-classroom', title: 'Live Classroom', parentPath: '', icon: 'cast_for_education', color: 'bg-red-500', order: 2, isActive: true },
      { categoryId: 'iit-jee', id: 'iit-jee_crash-course', title: 'Crash Course', parentPath: '', icon: 'speed', color: 'bg-orange-500', order: 3, isActive: true },
      { categoryId: 'iit-jee', id: 'iit-jee_mock-test', title: 'Mock Test', parentPath: '', icon: 'quiz', color: 'bg-green-500', order: 4, isActive: true },
      { categoryId: 'nursing', id: 'nursing_bsc-cet-entrance', title: 'BSC CET Entrance', parentPath: '', icon: 'school', color: 'bg-blue-500', description: 'Nursing & Paramedical entrance', order: 1, isActive: true },
      { categoryId: 'nursing', id: 'nursing_nursing-officer', title: 'Nursing Officer', parentPath: '', icon: 'medical_services', color: 'bg-red-500', description: 'Govt Job Coaching', order: 2, isActive: true },
      { categoryId: 'nursing', id: 'nursing_anm-mphw', title: 'ANM-MPHW', parentPath: '', icon: 'health_and_safety', color: 'bg-amber-500', description: 'Govt Job Coaching', order: 3, isActive: true },
      { categoryId: 'nursing', id: 'nursing_gnm', title: 'GNM', parentPath: '', icon: 'medication', color: 'bg-green-500', description: '1st, 2nd, 3rd Year Syllabus', order: 4, isActive: true },
      { categoryId: 'nursing', id: 'nursing_bsc-nursing', title: 'BSC Nursing Degree', parentPath: '', icon: 'local_pharmacy', color: 'bg-purple-500', description: 'Semester Wise Syllabus', order: 5, isActive: true },
      { categoryId: 'nursing', id: 'nursing_e-book', title: 'E-Book', parentPath: '', icon: 'auto_stories', color: 'bg-indigo-500', description: 'Study material & notes', order: 6, isActive: true },
      { categoryId: 'nursing', id: 'nursing_mock-test', title: 'Mock Test', parentPath: '', icon: 'quiz', color: 'bg-teal-500', description: 'Practice tests', order: 7, isActive: true },
      { categoryId: 'general', id: 'general_cbse_class-9_english', title: 'CBSE Class 9th - English', parentPath: 'CBSE Board > Class 9th', icon: 'translate', color: 'bg-blue-500', order: 1, isActive: true },
      { categoryId: 'general', id: 'general_cbse_class-9_hindi', title: 'CBSE Class 9th - Hindi', parentPath: 'CBSE Board > Class 9th', icon: 'language', color: 'bg-orange-500', order: 2, isActive: true },
      { categoryId: 'general', id: 'general_cbse_class-9_social-studies', title: 'CBSE Class 9th - Social Studies', parentPath: 'CBSE Board > Class 9th', icon: 'public', color: 'bg-green-500', order: 3, isActive: true },
      { categoryId: 'general', id: 'general_cbse_class-9_science', title: 'CBSE Class 9th - Science & Tech', parentPath: 'CBSE Board > Class 9th', icon: 'science', color: 'bg-purple-500', order: 4, isActive: true },
      { categoryId: 'general', id: 'general_cbse_class-9_maths', title: 'CBSE Class 9th - Mathematics', parentPath: 'CBSE Board > Class 9th', icon: 'calculate', color: 'bg-red-500', order: 5, isActive: true },
      { categoryId: 'general', id: 'general_cbse_class-10_english', title: 'CBSE Class 10th - English', parentPath: 'CBSE Board > Class 10th', icon: 'translate', color: 'bg-blue-500', order: 6, isActive: true },
      { categoryId: 'general', id: 'general_cbse_class-10_hindi', title: 'CBSE Class 10th - Hindi', parentPath: 'CBSE Board > Class 10th', icon: 'language', color: 'bg-orange-500', order: 7, isActive: true },
      { categoryId: 'general', id: 'general_cbse_class-10_social-studies', title: 'CBSE Class 10th - Social Studies', parentPath: 'CBSE Board > Class 10th', icon: 'public', color: 'bg-green-500', order: 8, isActive: true },
      { categoryId: 'general', id: 'general_cbse_class-10_science', title: 'CBSE Class 10th - Science & Tech', parentPath: 'CBSE Board > Class 10th', icon: 'science', color: 'bg-purple-500', order: 9, isActive: true },
      { categoryId: 'general', id: 'general_cbse_class-10_maths', title: 'CBSE Class 10th - Mathematics', parentPath: 'CBSE Board > Class 10th', icon: 'calculate', color: 'bg-red-500', order: 10, isActive: true },
      { categoryId: 'general', id: 'general_hbse_class-9_english', title: 'HBSE Class 9th - English', parentPath: 'HBSE Board > Class 9th', icon: 'translate', color: 'bg-blue-500', order: 11, isActive: true },
      { categoryId: 'general', id: 'general_hbse_class-9_hindi', title: 'HBSE Class 9th - Hindi', parentPath: 'HBSE Board > Class 9th', icon: 'language', color: 'bg-orange-500', order: 12, isActive: true },
      { categoryId: 'general', id: 'general_hbse_class-9_social-studies', title: 'HBSE Class 9th - Social Studies', parentPath: 'HBSE Board > Class 9th', icon: 'public', color: 'bg-green-500', order: 13, isActive: true },
      { categoryId: 'general', id: 'general_hbse_class-9_science', title: 'HBSE Class 9th - Science & Tech', parentPath: 'HBSE Board > Class 9th', icon: 'science', color: 'bg-purple-500', order: 14, isActive: true },
      { categoryId: 'general', id: 'general_hbse_class-9_maths', title: 'HBSE Class 9th - Mathematics', parentPath: 'HBSE Board > Class 9th', icon: 'calculate', color: 'bg-red-500', order: 15, isActive: true },
      { categoryId: 'general', id: 'general_hbse_class-10_english', title: 'HBSE Class 10th - English', parentPath: 'HBSE Board > Class 10th', icon: 'translate', color: 'bg-blue-500', order: 16, isActive: true },
      { categoryId: 'general', id: 'general_hbse_class-10_hindi', title: 'HBSE Class 10th - Hindi', parentPath: 'HBSE Board > Class 10th', icon: 'language', color: 'bg-orange-500', order: 17, isActive: true },
      { categoryId: 'general', id: 'general_hbse_class-10_social-studies', title: 'HBSE Class 10th - Social Studies', parentPath: 'HBSE Board > Class 10th', icon: 'public', color: 'bg-green-500', order: 18, isActive: true },
      { categoryId: 'general', id: 'general_hbse_class-10_science', title: 'HBSE Class 10th - Science & Tech', parentPath: 'HBSE Board > Class 10th', icon: 'science', color: 'bg-purple-500', order: 19, isActive: true },
      { categoryId: 'general', id: 'general_hbse_class-10_maths', title: 'HBSE Class 10th - Mathematics', parentPath: 'HBSE Board > Class 10th', icon: 'calculate', color: 'bg-red-500', order: 20, isActive: true }
    ];

    await db.collection('subcategories').insertMany(defaultSubcategories);
    res.json({ message: 'Categories seeded successfully', categories: defaultCategories.length, subcategories: defaultSubcategories.length });
  } catch (error) {
    console.error('Error seeding categories:', error);
    res.status(500).json({ error: 'Failed to seed categories' });
  }
});

// Routes for Referral System
app.post('/api/referrals/generate', async (req, res) => {
  try {
    const { studentId } = req.body;
    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' });
    }

    const student = await db.collection('students').findOne({ id: studentId });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const existing = await db.collection('referrals').findOne({ studentId });
    if (existing) {
      return res.json({ referralCode: existing.referralCode });
    }

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'AONE-';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    let codeExists = await db.collection('referrals').findOne({ referralCode: code });
    while (codeExists) {
      code = 'AONE-';
      for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      codeExists = await db.collection('referrals').findOne({ referralCode: code });
    }

    const referralDoc = {
      studentId,
      referralCode: code,
      referredStudents: [],
      totalEarnings: 0,
      pendingEarnings: 0,
      createdAt: new Date()
    };

    await db.collection('referrals').insertOne(referralDoc);
    await db.collection('students').updateOne({ id: studentId }, { $set: { referralCode: code } });

    res.status(201).json({ referralCode: code });
  } catch (error) {
    console.error('Error generating referral code:', error);
    res.status(500).json({ error: 'Failed to generate referral code' });
  }
});

app.get('/api/referrals/:studentId', async (req, res) => {
  try {
    const referral = await db.collection('referrals').findOne({ studentId: req.params.studentId });
    if (!referral) {
      return res.json({ referralCode: null, totalReferrals: 0, totalEarnings: 0, pendingEarnings: 0 });
    }
    res.json({
      referralCode: referral.referralCode,
      totalReferrals: referral.referredStudents ? referral.referredStudents.length : 0,
      totalEarnings: referral.totalEarnings || 0,
      pendingEarnings: referral.pendingEarnings || 0
    });
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    res.status(500).json({ error: 'Failed to fetch referral stats' });
  }
});

app.get('/api/referrals/:studentId/history', async (req, res) => {
  try {
    const referral = await db.collection('referrals').findOne({ studentId: req.params.studentId });
    if (!referral || !referral.referredStudents || referral.referredStudents.length === 0) {
      return res.json([]);
    }
    res.json(referral.referredStudents);
  } catch (error) {
    console.error('Error fetching referral history:', error);
    res.status(500).json({ error: 'Failed to fetch referral history' });
  }
});

app.post('/api/referrals/apply', async (req, res) => {
  try {
    const { referralCode, newStudentId } = req.body;
    if (!referralCode || !newStudentId) {
      return res.status(400).json({ error: 'Referral code and new student ID are required' });
    }

    const referral = await db.collection('referrals').findOne({ referralCode });
    if (!referral) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }

    if (referral.studentId === newStudentId) {
      return res.status(400).json({ error: 'You cannot use your own referral code' });
    }

    const alreadyReferred = referral.referredStudents && referral.referredStudents.some(r => r.studentId === newStudentId);
    if (alreadyReferred) {
      return res.status(400).json({ error: 'This student has already been referred' });
    }

    const settings = await db.collection('referralSettings').findOne({}) || { commissionType: 'fixed', commissionValue: 50 };
    const earning = settings.commissionType === 'fixed' ? (settings.commissionValue || 50) : 0; // Only apply fixed earning at this stage

    const newStudent = await db.collection('students').findOne({ id: newStudentId });
    const referredEntry = {
      studentId: newStudentId,
      studentName: newStudent ? newStudent.name : 'Unknown',
      date: new Date(),
      earning: earning,
      status: 'pending'
    };

    await db.collection('referrals').updateOne(
      { referralCode },
      {
        $push: { referredStudents: referredEntry },
        $inc: { pendingEarnings: earning }
      }
    );

    await db.collection('students').updateOne(
      { id: newStudentId },
      { $set: { referredBy: referralCode } }
    );

    res.json({ success: true, message: 'Referral applied successfully' });
  } catch (error) {
    console.error('Error applying referral:', error);
    res.status(500).json({ error: 'Failed to apply referral code' });
  }
});

app.get('/api/admin/referral-settings', async (req, res) => {
  try {
    const settings = await db.collection('referralSettings').findOne({});
    res.json(settings || { commissionType: 'fixed', commissionValue: 50, isActive: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch referral settings' });
  }
});

app.put('/api/admin/referral-settings', async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const result = await db.collection('referralSettings').updateOne(
      {},
      { $set: { ...updateData, updatedAt: new Date() } },
      { upsert: true }
    );
    res.json({ success: true, message: 'Referral settings updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update referral settings' });
  }
});

app.get('/api/admin/referrals', async (req, res) => {
  try {
    const referrals = await db.collection('referrals').find({}).toArray();
    res.json(referrals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch all referrals' });
  }
});

// Admin referral status update
app.put('/api/admin/referrals/update-status', async (req, res) => {
  try {
    const { referralCode, referredStudentId, status } = req.body;
    if (!referralCode || !referredStudentId || !status) {
      return res.status(400).json({ error: 'referralCode, referredStudentId, and status are required' });
    }

    const referral = await db.collection('referrals').findOne({ referralCode });
    if (!referral) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    const updatedStudents = (referral.referredStudents || []).map(rs => {
      if (rs.studentId === referredStudentId) {
        return { ...rs, status };
      }
      return rs;
    });

    const entry = referral.referredStudents?.find(rs => rs.studentId === referredStudentId);
    const earning = entry ? entry.earning || 0 : 0;

    let updateOps = { $set: { referredStudents: updatedStudents } };
    if (status === 'confirmed' && entry && entry.status !== 'confirmed') {
      updateOps.$inc = { totalEarnings: earning, pendingEarnings: -earning };
    } else if (status === 'rejected' && entry && entry.status === 'pending') {
      updateOps.$inc = { pendingEarnings: -earning };
    }

    await db.collection('referrals').updateOne({ referralCode }, updateOps);
    res.json({ success: true, message: `Referral ${status}` });
  } catch (error) {
    console.error('Error updating referral status:', error);
    res.status(500).json({ error: 'Failed to update referral status' });
  }
});

// Razorpay Order Creation
app.post('/api/razorpay/create-order', async (req, res) => {
  try {
    const { courseId, studentId } = req.body;
    if (!courseId || !studentId) {
      return res.status(400).json({ error: 'courseId and studentId are required' });
    }

    // Get credentials from env or DB settings
    const settings = await db.collection('settings').findOne({});

    let keyId = process.env.RAZORPAY_KEY_ID;
    let keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Fallback if env vars aren't set
    if (!keyId || keyId.trim() === '') keyId = settings?.razorpayKeyId;
    if (!keySecret || keySecret.trim() === '') keySecret = settings?.razorpayKeySecret;

    keyId = (keyId || '').toString().trim();
    keySecret = (keySecret || '').toString().trim();

    // Log for debugging (masked)
    const maskedId = keyId ? `${keyId.substring(0, 4)}...${keyId.slice(-4)}` : 'NULL';
    console.log(`[Razorpay Debug] ID: ${maskedId}, State: ${(!keyId || !keySecret) ? 'MISSING' : 'OK'}`);

    if (!keyId || !keySecret) {
      return res.status(500).json({ error: 'Razorpay keys missing from .env and settings collection.' });
    }

    console.log(`Razorpay Mode: ${keyId.startsWith('rzp_live') ? 'LIVE (Real Money)' : 'TEST (Sandbox)'}`);

    const student = await db.collection('students').findOne({ id: studentId });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const course = await findCourse(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const coursePrice = course.price || 0;
    if (coursePrice <= 0) {
      return res.status(400).json({ error: 'This course is free, no payment needed' });
    }

    const orderData = {
      amount: Math.round(coursePrice * 100),
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: { courseId: course.id || course._id.toString(), studentId }
    };

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify(orderData)
    });

    const order = await response.json();
    if (!response.ok) {
      console.error('Razorpay order creation failed:', order);
      return res.status(500).json({ error: order.error?.description || 'Failed to create Razorpay order' });
    }

    res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId });
  } catch (error) {
    console.error('Razorpay order error:', error);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});


// Razorpay Payment Verification
app.post('/api/razorpay/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courseId, studentId, referralCode } = req.body;

    // Get credentials (same logic as create-order)
    const settings = await db.collection('settings').findOne({});
    let keyId = (process.env.RAZORPAY_KEY_ID || settings?.razorpayKeyId || '').toString().trim();
    let keySecret = (process.env.RAZORPAY_KEY_SECRET || settings?.razorpayKeySecret || '').toString().trim();

    if (!keyId || !keySecret) {
      return res.status(500).json({ error: 'Razorpay credentials not configured' });
    }

    const crypto = await import('crypto');
    const generated_signature = crypto.createHmac('sha256', keySecret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      // Send Failure Email if studentId and courseId are present
      if (studentId && courseId) {
        try {
          const student = await db.collection('students').findOne({ id: studentId });
          const course = await findCourse(courseId);
          if (student && student.email && course) {
            const { subject, html } = templates.paymentFailed(student.name || 'Student', course.name || course.title, course.price, 'Invalid payment signature');
            sendEmail({ to: student.email, subject, html }).catch(e => console.error('Payment failure email error:', e));
          }
        } catch (e) { }
      }
      return res.status(400).json({ error: 'Payment verification failed - invalid signature' });
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const paymentRes = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
      headers: { 'Authorization': `Basic ${auth}` }
    });
    const paymentData = await paymentRes.json();

    if (!paymentRes.ok || paymentData.status !== 'captured') {
      console.error('Payment not captured:', paymentData);
      // Send Failure Email
      if (studentId && courseId) {
        try {
          const student = await db.collection('students').findOne({ id: studentId });
          const course = await findCourse(courseId);
          if (student && student.email && course) {
            const { subject, html } = templates.paymentFailed(student.name || 'Student', course.name || course.title, course.price, paymentData.error?.description || 'Payment was not captured');
            sendEmail({ to: student.email, subject, html }).catch(e => console.error('Payment failure email error:', e));
          }
        } catch (e) { }
      }
      return res.status(400).json({ error: 'Payment not captured or failed' });
    }

    let course = await findCourse(courseId);
    if (!course) {
      try {
        if (ObjectId.isValid(courseId)) {
          course = await db.collection('courses').findOne({ _id: new ObjectId(courseId) });
        }
      } catch (e) { }
    }
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const expectedAmount = Math.round((course.price || 0) * 100);
    if (paymentData.amount < expectedAmount) {
      console.error('Payment amount mismatch:', paymentData.amount, 'vs expected', expectedAmount);
      // Send Failure Email
      if (studentId && courseId) {
        try {
          const student = await db.collection('students').findOne({ id: studentId });
          if (student && student.email) {
            const { subject, html } = templates.paymentFailed(student.name || 'Student', course.name || course.title, course.price, 'Payment amount mismatch');
            sendEmail({ to: student.email, subject, html }).catch(e => console.error('Payment failure email error:', e));
          }
        } catch (e) { }
      }
      return res.status(400).json({ error: 'Payment amount does not match course price' });
    }

    const student = await db.collection('students').findOne({ id: studentId });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const actualCourseId = course.id || courseId;
    const actualAmount = paymentData.amount / 100;

    const purchase = {
      id: `purchase_${Date.now()}`,
      studentId,
      courseId: actualCourseId,
      courseName: course.name || course.title || courseId,
      amount: actualAmount,
      paymentMethod: 'razorpay',
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      referralCode: referralCode || null,
      status: 'completed',
      createdAt: new Date()
    };

    await db.collection('purchases').insertOne(purchase);

    const enrolledCourses = student.enrolledCourses || [];
    if (!enrolledCourses.includes(actualCourseId)) {
      await db.collection('students').updateOne(
        { id: studentId },
        { $addToSet: { enrolledCourses: actualCourseId } }
      );
    }

    if (referralCode) {
      const referral = await db.collection('referrals').findOne({ referralCode });
      if (referral) {
        const settings = await db.collection('referralSettings').findOne({}) || { commissionType: 'fixed', commissionValue: 50 };
        let earning = settings.commissionValue || 50;
        if (settings.commissionType === 'percentage') {
          earning = Math.round((purchase.amount * settings.commissionValue) / 100);
        }
        const alreadyReferred = referral.referredStudents && referral.referredStudents.some(r => r.studentId === studentId);
        if (!alreadyReferred) {
          await db.collection('referrals').updateOne(
            { referralCode },
            {
              $push: { referredStudents: { studentId, studentName: student.name || 'Unknown', date: new Date(), earning, status: 'pending' } },
              $inc: { pendingEarnings: earning }
            }
          );
        }
      }
    }

    // Send Payment Success Email
    if (student.email) {
      const { subject, html } = templates.purchase(student.name || 'Student', purchase.courseName, purchase.amount);
      sendEmail({ to: student.email, subject, html }).catch(e => console.error('Payment email error:', e));
    }

    res.status(201).json({ success: true, purchase });
  } catch (error) {
    console.error('Razorpay verification error:', error);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

// Routes for Purchases
app.post('/api/purchases', async (req, res) => {
  try {
    const { studentId, courseId, amount, paymentMethod, referralCode } = req.body;
    if (!studentId || !courseId) {
      return res.status(400).json({ error: 'studentId and courseId are required' });
    }

    const student = await db.collection('students').findOne({ id: studentId });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    let course = await findCourse(courseId);
    if (!course) {
      try {
        if (ObjectId.isValid(courseId)) {
          course = await db.collection('courses').findOne({ _id: new ObjectId(courseId) });
        }
      } catch (e) { }
    }
    const actualCourseId = course ? (course.id || courseId) : courseId;

    const purchase = {
      id: `purchase_${Date.now()}`,
      studentId,
      courseId: actualCourseId,
      courseName: course ? (course.name || course.title) : courseId,
      amount: amount || (course ? course.price : 0),
      paymentMethod: paymentMethod || 'online',
      referralCode: referralCode || null,
      status: 'completed',
      createdAt: new Date()
    };

    await db.collection('purchases').insertOne(purchase);

    const enrolledCourses = student.enrolledCourses || [];
    if (!enrolledCourses.includes(actualCourseId)) {
      await db.collection('students').updateOne(
        { id: studentId },
        { $addToSet: { enrolledCourses: actualCourseId } }
      );
    }

    if (referralCode) {
      const referral = await db.collection('referrals').findOne({ referralCode });
      if (referral) {
        const settings = await db.collection('referralSettings').findOne({}) || { commissionType: 'fixed', commissionValue: 50 };
        let earning = settings.commissionValue || 50;
        if (settings.commissionType === 'percentage') {
          earning = Math.round((purchase.amount * settings.commissionValue) / 100);
        }

        const alreadyReferred = referral.referredStudents && referral.referredStudents.some(r => r.studentId === studentId);
        if (!alreadyReferred) {
          const referredEntry = {
            studentId,
            studentName: student.name || 'Unknown',
            date: new Date(),
            earning,
            status: 'pending'
          };
          await db.collection('referrals').updateOne(
            { referralCode },
            {
              $push: { referredStudents: referredEntry },
              $inc: { pendingEarnings: earning }
            }
          );
        }
      }
    }

    res.status(201).json({ success: true, purchase });
  } catch (error) {
    console.error('Error recording purchase:', error);
    res.status(500).json({ error: 'Failed to record purchase' });
  }
});

app.get('/api/purchases/:studentId', async (req, res) => {
  try {
    const purchases = await db.collection('purchases').find({ studentId: req.params.studentId }).sort({ createdAt: -1 }).toArray();
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

app.get('/api/admin/purchases', async (req, res) => {
  try {
    const purchases = await db.collection('purchases').aggregate([
      {
        $lookup: {
          from: 'students',
          let: { sId: '$studentId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ["$id", "$$sId"] },
                    { $eq: [{ $toString: "$_id" }, { $toString: "$$sId" }] }
                  ]
                }
              }
            }
          ],
          as: 'studentInfo'
        }
      },
      {
        $unwind: {
          path: '$studentInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]).toArray();
    res.json(purchases);
  } catch (error) {
    console.error('Fetch purchases error:', error);
    res.status(500).json({ error: 'Failed to fetch all purchases' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// ============ CHAT SYSTEM ============

app.get('/api/chats/unread/admin', async (req, res) => {
  try {
    const result = await db.collection('chats').aggregate([
      { $group: { _id: null, total: { $sum: '$unreadAdmin' } } }
    ]).toArray();
    res.json({ unread: result[0]?.total || 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

app.get('/api/chats', async (req, res) => {
  try {
    const { studentId } = req.query;
    const query = studentId ? { studentId } : {};
    const chats = await db.collection('chats').find(query).sort({ updatedAt: -1 }).toArray();
    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

app.post('/api/chats/start', async (req, res) => {
  try {
    const { studentId, studentName } = req.body;
    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required' });
    }
    const existing = await db.collection('chats').findOne({ studentId });
    if (existing) {
      return res.json(existing);
    }
    const chatId = 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const chat = {
      id: chatId,
      studentId,
      studentName: studentName || 'Student',
      lastMessage: '',
      lastMessageBy: '',
      unreadAdmin: 0,
      unreadStudent: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await db.collection('chats').insertOne(chat);
    res.status(201).json(chat);
  } catch (error) {
    res.status(500).json({ error: 'Failed to start chat' });
  }
});

app.get('/api/chats/:chatId/messages', async (req, res) => {
  try {
    const messages = await db.collection('chatMessages')
      .find({ chatId: req.params.chatId })
      .sort({ createdAt: 1 })
      .toArray();
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chat messages' });
  }
});

app.post('/api/chats/:chatId/messages', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { senderId, senderName, senderType, message } = req.body;
    const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const chatMessage = {
      id: msgId,
      chatId,
      senderId,
      senderName: senderName || 'Unknown',
      senderType,
      message,
      createdAt: new Date()
    };
    await db.collection('chatMessages').insertOne(chatMessage);

    const unreadField = senderType === 'student' ? 'unreadAdmin' : 'unreadStudent';
    await db.collection('chats').updateOne(
      { id: chatId },
      {
        $set: {
          lastMessage: message,
          lastMessageBy: senderType,
          updatedAt: new Date()
        },
        $inc: { [unreadField]: 1 }
      }
    );

    res.status(201).json(chatMessage);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

app.put('/api/chats/:chatId/read', async (req, res) => {
  try {
    const { readerType } = req.body;
    const unreadField = readerType === 'admin' ? 'unreadAdmin' : 'unreadStudent';
    await db.collection('chats').updateOne(
      { id: req.params.chatId },
      { $set: { [unreadField]: 0 } }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// Live Chat API
app.get('/api/live-chat/:videoId/messages', async (req, res) => {
  try {
    const messages = await db.collection('liveChatMessages')
      .find({ videoId: req.params.videoId })
      .sort({ createdAt: 1 })
      .toArray();
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.post('/api/live-chat/:videoId/messages', async (req, res) => {
  try {
    const { videoId } = req.params;
    const { senderId, senderName, message } = req.body;
    const chatMessage = {
      videoId,
      senderId,
      senderName,
      message,
      createdAt: new Date()
    };
    await db.collection('liveChatMessages').insertOne(chatMessage);
    res.status(201).json(chatMessage);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

async function startServer() {
  const httpServer = http.createServer(app);

  if (isProduction) {
    const distPath = path.join(__dirname, "dist", "index.html");
    if (fs.existsSync(distPath)) {
      app.get('*', (req, res) => {
        res.sendFile(distPath);
      });
    }
  } else {
    // We already have a separate Vite dev server, so we only need the API here
    // But we keep this for backward compatibility if needed
    try {
      const vite = await createViteServer({
        server: {
          middlewareMode: {
            server: httpServer,
          },
          hmr: {
            server: httpServer,
          },
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn('Vite middleware initialization skipped (likely already running separately)');
    }
  }

  let currentPort = parseInt(PORT, 10);

  const startListen = () => {
    httpServer.listen(currentPort, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${currentPort}`);
    });
  };

  httpServer.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.log(`Port ${currentPort} is busy. Killing existing process on port ${currentPort}...`);
      // Use exec to kill whatever is on the port, then retry
      import('child_process').then(({ exec }) => {
        // Windows: use netstat + taskkill
        exec(`for /f "tokens=5" %a in ('netstat -ano ^| findstr :${currentPort} ^| findstr LISTENING') do taskkill /F /PID %a`, { shell: 'cmd' }, (err) => {
          if (err) {
            console.log(`Could not kill process on port ${currentPort}, err: ${err.message}`);
          } else {
            console.log(`Killed process on port ${currentPort}. Retrying...`);
          }
          setTimeout(() => {
            httpServer.listen(currentPort, '0.0.0.0', () => {
              console.log(`Server running on http://0.0.0.0:${currentPort}`);
            });
          }, 1000);
        });
      });
    } else {
      console.error(e);
    }
  });

  httpServer.listen(currentPort, '0.0.0.0', () => {
    console.log(`\n🚀 API Server running on http://localhost:${currentPort}`);
    console.log(`🔗 Proxy configured to handle /api requests from :5173 to :${currentPort}\n`);
    if (process.env.JWT_SECRET) {
      console.log('✅ JWT_SECRET loaded from environment.');
    } else {
      console.error('⚠️ WARNING: JWT_SECRET not found in .env. Using temporary secret (Will log out on restart).');
    }
  });
}

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer();
