import { db } from '../config/db.js';
import mongoose from 'mongoose';
const { ObjectId } = mongoose.Types;
import { verifyAccessToken } from '../middleware/auth.js';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Settings Controllers ---
export const getSettings = async (req, res) => {
  try {
    const settings = await db.collection('settings').findOne({});
    res.json(settings || { paymentGateway: 'razorpay', systemStatus: 'online', maintenanceMode: false });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

export const updateSettings = async (req, res) => {
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
};

// --- Dashboard Controllers ---
export const getDashboardStats = async (req, res) => {
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
};

// --- Infrastructure Controllers (Moved from server.js) ---

export const ping = (req, res) => {
  console.log('Ping received');
  res.json({ message: 'pong', timestamp: new Date(), version: '1.0.3' });
};

export const health = (req, res) => {
  res.json({ status: 'Server is running' });
};

export const heartbeat = async (req, res) => {
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
};

// --- Splash Screen (Phase 19E) ---

export const getSplashScreen = async (req, res) => {
  try {
    const splash = await db.collection('settings').findOne({ type: 'splash_screen' });
    const defaultSplash = {
      type: 'splash_screen',
      imageUrl: process.env.DEFAULT_SPLASH_URL || '/attach-assist/ChatGPT_Image_Feb_8,_2026,_05_51_58_PM_1770553325908.png',
      isActive: true,
      duration: 3000
    };
    res.json(splash || defaultSplash);
  } catch (error) {
    res.json({
      type: 'splash_screen',
      imageUrl: process.env.DEFAULT_SPLASH_URL || '/attach-assist/ChatGPT_Image_Feb_8,_2026,_05_51_58_PM_1770553325908.png',
      isActive: true,
      duration: 3000
    });
  }
};
export const updateSplashScreen = async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    updateData.type = 'splash_screen';
    await db.collection('settings').updateOne(
      { type: 'splash_screen' },
      { $set: updateData },
      { upsert: true }
    );
    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update splash screen settings' });
  }
};

// --- DOCX Generation (Phase 19G) ---

export const generateDocx = async (req, res) => {
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
};
// --- APK Management (Migrated from server.js) ---

export const downloadApk = async (req, res) => {
  try {
    const searchDirs = [
      path.join(__dirname, '..', 'uploads'),
      path.join(__dirname, '..', 'uploads', 'apks'),
      path.join(__dirname, '..', 'attached_assets'),
      path.join(__dirname, '..', 'apk'),
      path.join(__dirname, '..')
    ];

    let apkPath = null;
    for (const dir of searchDirs) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        const apkFiles = files.filter(f => f.endsWith('.apk')).sort().reverse();
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
    console.error('[APK ERROR] Download failed:', error.message);
    res.status(500).json({ error: 'Failed to serve APK' });
  }
};

export const uploadApk = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No APK file uploaded' });
    const apkDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(apkDir)) fs.mkdirSync(apkDir, { recursive: true });
    
    const newName = `AoneTarget_Latest_${Date.now()}.apk`;
    const newPath = path.join(apkDir, newName);
    fs.renameSync(req.file.path, newPath);
    res.json({ success: true, message: 'APK uploaded successfully', filename: newName });
  } catch (error) {
    console.error('[APK ERROR] Upload failed:', error.message);
    res.status(500).json({ error: 'APK upload failed' });
  }
};
