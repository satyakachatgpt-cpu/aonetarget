import 'dotenv/config';
import { Readable } from 'node:stream';
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { fileURLToPath } from "url";
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import mongoose from 'mongoose';
// Config & DB
import cloudinary from './config/cloudinary.config.js';
import { db } from './config/db.js';

// Middleware
import { optionalAuth } from './middleware/auth.js';
import { securityHeaders, sanitizeInput } from './middleware/security.js';

// Routes
import uploadV2Routes from './routes/upload.routes.js';
import authRouter from './routes/auth.routes.js';
import courseRouter from './routes/course.routes.js';
import reportsRouter from './routes/admin/reports.routes.js';
import academicRoutes from './routes/academic.routes.js';
import contentRoutes from './routes/content.routes.js';
import communicationRoutes from './routes/communication.routes.js';
import systemRoutes from './routes/system.routes.js';
import enrollmentRoutes from './routes/enrollment.routes.js';
import moderationRoutes from './routes/moderation.routes.js';
import liveClassRoutes from './routes/liveclass.routes.js';
import assetRoutes from './routes/asset.routes.js';
import referralRoutes from './routes/referral.routes.js';
import couponRoutes from './routes/coupon.routes.js';
import studentRoutes from './routes/student.routes.js';
import storeRoutes from './routes/store.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import questionRoutes from './routes/question.routes.js';
import subjectiveRoutes from './routes/subjective.routes.js';
import testRoutes from './routes/test.routes.js';
import testSeriesRoutes from './routes/testseries.routes.js';
import courseTestRoutes from './routes/courseTest.routes.js';
import resultRoutes from './routes/result.routes.js';
import adminRoutes from './routes/admin.routes.js';
import leaderboardRoutes from './routes/leaderboard.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';

import { errorMiddleware } from './middleware/error.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { ObjectId } = mongoose.Types;

const app = express();

// --- Configuration ---
app.use(compression());
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false);
app.use(securityHeaders);

app.use(cors({
  origin: (origin, callback) => {
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true); // Allow all in dev for LAN testing
    }
    const allowed = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:5173'];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-client-id', 'x-admin-id'],
  maxAge: 86400
}));

// --- Body Parser Configuration ---
// Increase limit specifically for bulk question uploads (Parsed test papers can be large)
app.post('/api/questions/bulk', express.json({ limit: '50mb' }));

// Global limits for all other routes
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));
app.use(sanitizeInput);
app.use(cookieParser());

// --- Static Files ---
app.use('/attach-assist', express.static(path.join(__dirname, '../client/public/attach-assist')));
app.use('/attached_assets', (req, res, next) => {
  const oldPath = path.join(__dirname, '../attached_assets', req.path);
  if (fs.existsSync(oldPath) && !fs.lstatSync(oldPath).isDirectory()) {
    return express.static(path.join(__dirname, '../attached_assets'))(req, res, next);
  }
  res.redirect(301, `/attach-assist${req.path}`);
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, "../client/dist")));
}

// --- Multer Configuration ---
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

// OTP Store moved to services/auth.service.js
// Live Stream helpers moved to server/services/liveStream.service.js

// --- Proxy & Gateway Routes ---
const isValidProxyUrl = (urlStr) => {
  try {
    const url = new URL(urlStr);
    if (!['http:', 'https:'].includes(url.protocol)) return false;

    const hostname = url.hostname.toLowerCase();
    
    // Exact match or subdomain match for allowlisted domains
    const allowedDomains = [
      'cloudinary.com',
      'res.cloudinary.com',
      'drive.google.com',
      'docs.google.com',
      'googleusercontent.com'
    ];
    
    const isAllowed = allowedDomains.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );

    if (!isAllowed) return false;

    // Block private IPs and localhost even if they spoof hostnames (basic check)
    const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '169.254.169.254'];
    if (blockedHosts.includes(hostname)) return false;
    
    // IP Range Checks (Very basic, better than nothing)
    if (hostname.startsWith('10.') || hostname.startsWith('192.168.') || hostname.startsWith('172.')) {
       // Potential private IP
       if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)) return false; // 172.16.0.0/12
       if (hostname.startsWith('192.168.')) return false;
       if (hostname.startsWith('10.')) return false;
    }

    return true;
  } catch (e) { return false; }
};

// --- PROXY ACCESS CACHE (STABILITY) ---
const PROXY_ACCESS_CACHE = new Map();
const PROXY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_PROXY_CACHE_SIZE = 2000;

const getCachedAccess = (identity, url) => {
  const key = `${identity}:${url}`;
  const cached = PROXY_ACCESS_CACHE.get(key);
  if (cached && (Date.now() - cached.ts < PROXY_CACHE_TTL)) return cached.val;
  if (cached) PROXY_ACCESS_CACHE.delete(key); // Cleanup expired
  return null;
};

const setCachedAccess = (identity, url, hasAccess) => {
  if (PROXY_ACCESS_CACHE.size >= MAX_PROXY_CACHE_SIZE) {
    const firstKey = PROXY_ACCESS_CACHE.keys().next().value;
    PROXY_ACCESS_CACHE.delete(firstKey);
  }
  PROXY_ACCESS_CACHE.set(`${identity}:${url}`, { val: hasAccess, ts: Date.now() });
};

app.get('/api/proxy-resource', optionalAuth, async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('URL is required');

  try {
    const targetUrl = decodeURIComponent(url);
    
    if (!isValidProxyUrl(targetUrl)) {
      console.warn(`[SECURITY] Blocked SSRF attempt to: ${targetUrl}`);
      return res.status(403).send('Forbidden: Invalid resource domain');
    }

    // --- ENROLLMENT & ACCESS CHECK ---
    const studentId = req.user?.studentId;
    const adminId = req.user?.adminId;
    const identity = adminId ? `admin:${adminId}` : (studentId ? `student:${studentId}` : 'guest');
    
    // 0. Cache Check
    const cached = getCachedAccess(identity, targetUrl);
    let hasAccess = cached !== null ? cached : !!adminId;

    if (cached === null && !hasAccess) {
      // 1. Check if it's a public asset (Images, Icons, Banners)
      // Standard image extensions are typically public in this app
      const isPublicAsset = /\.(jpg|jpeg|png|webp|gif|svg|ico)$/i.test(targetUrl.split('?')[0]);
      
      if (isPublicAsset) {
        hasAccess = true;
      } else {
        // 2. Sensitive Asset (PDF, Video, etc.) -> Check Catalog & Enrollment
        // Search across notes, pdfs, and videos collections for this URL
        const query = { $or: [{ url: targetUrl }, { fileUrl: targetUrl }, { videoUrl: targetUrl }, { streamUrl: targetUrl }] };
        const [note, pdf, video] = await Promise.all([
          db.collection('notes').findOne(query),
          db.collection('pdfs').findOne(query),
          db.collection('videos').findOne(query)
        ]);

        const item = note || pdf || video;
        
        if (!item) {
          // If not in catalog, allow if it doesn't match sensitive patterns
          hasAccess = !/\.(pdf|mp4|m3u8|mov|avi)$/i.test(targetUrl.split('?')[0]);
        } else {
          // Found in catalog! Check if item is free or user is enrolled
          if (item.isFree === true) {
            hasAccess = true;
          } else if (studentId) {
            const student = await db.collection('students').findOne({
              $or: [
                { id: studentId },
                { _id: ObjectId.isValid(studentId) ? new ObjectId(studentId) : null }
              ].filter(f => f.id || f._id)
            });
            
            if (student) {
              const enrolledCourses = (student.enrolledCourses || []).map(id => String(id));
              const itemCourseId = String(item.courseId);
              
              hasAccess = enrolledCourses.includes(itemCourseId);
              
              if (!hasAccess && itemCourseId) {
                const course = await db.collection('courses').findOne({
                  $or: [{ id: itemCourseId }, { _id: ObjectId.isValid(itemCourseId) ? new ObjectId(itemCourseId) : null }]
                });
                if (course && course.relatedBatches) {
                  const related = (course.relatedBatches || []).map(rb => String(rb.id || rb));
                  hasAccess = enrolledCourses.some(ec => related.includes(ec));
                }
              }
            }
          }
        }
      }
      // Save result to cache
      setCachedAccess(identity, targetUrl, hasAccess);
    }

    if (!hasAccess) {
      console.warn(`[SECURITY] Blocked unauthorized proxy access to: ${targetUrl} by user: ${studentId || 'Guest'}`);
      return res.status(403).send('Forbidden: Access to this paid content requires enrollment');
    }
    // --- END ACCESS CHECK ---

    let fetchUrl = targetUrl;

    // Cloudinary URL Handling: 
    // We fetch the original URL as-is to avoid signature calculation errors for public (upload) resources.
    // Re-signing is only attempted for truly restricted content (authenticated/private).
    if (targetUrl.includes('res.cloudinary.com')) {
      const isRestricted = targetUrl.includes('/authenticated/') || targetUrl.includes('/private/');
      
      if (isRestricted) {
        const parts = targetUrl.split('/');
        const deliveryTypes = ['private', 'authenticated'];
        let foundTypeIdx = -1;
        let deliveryType = 'upload';
        
        for (const t of deliveryTypes) {
          const idx = parts.indexOf(t);
          if (idx !== -1) { foundTypeIdx = idx; deliveryType = t; break; }
        }

        if (foundTypeIdx !== -1) {
          const resourceType = parts[foundTypeIdx - 1];
          let publicIdWithExt = parts.slice(foundTypeIdx + 1).join('/');
          let version = '';
          
          if (publicIdWithExt.startsWith('v')) {
            const potentialVersion = publicIdWithExt.split('/')[0];
            if (/^v\d+$/.test(potentialVersion)) {
              version = potentialVersion.substring(1);
              publicIdWithExt = parts.slice(foundTypeIdx + 2).join('/');
            }
          }
          
          const extMatch = publicIdWithExt.match(/\.([^.]+)$/);
          const extension = extMatch ? extMatch[1] : '';
          const publicId = (extension && resourceType !== 'raw')
            ? publicIdWithExt.substring(0, publicIdWithExt.length - extension.length - 1)
            : publicIdWithExt;
          
          fetchUrl = cloudinary.url(publicId, {
            resource_type: resourceType,
            type: deliveryType,
            sign_url: true,
            secure: true,
            version: version,
            format: (resourceType !== 'raw') ? extension : undefined,
            expires_at: Math.floor(Date.now() / 1000) + 3600
          });
        }
      }
    }

    const response = await fetch(fetchUrl);
    
    if (!response.ok) {
      console.error(`[PROXY] Source fetch failed: ${response.status} ${response.statusText} for URL: ${fetchUrl}`);
      return res.status(response.status).send('Storage source error');
    }

    // Target headers to forward or override
    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');

    if (contentType) res.setHeader('Content-Type', contentType);
    if (contentLength) res.setHeader('Content-Length', contentLength);
    
    // Standardize headers for PDF iframe usage
    // We remove upstream XFO/CSP which might block the iframe, 
    // and rely on our own app-level security.
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    
    // Ensure browsers treat it as inline-friendly
    res.setHeader('Content-Disposition', 'inline');

    // Stream the body directly to the response
    if (response.body) {
      const stream = Readable.fromWeb(response.body);
      stream.pipe(res);
      
      // Cleanup on client disconnect to prevent memory leaks/dangling sockets
      res.on('close', () => {
        try {
          if (stream.destroy) stream.destroy();
          if (response.body.cancel) response.body.cancel().catch(() => {});
        } catch (e) { /* ignore cleanup errors */ }
      });
    } else {
      res.status(500).send('Response body is empty');
    }
  } catch (error) { 
    console.error('[PROXY] Error translating resource:', error);
    res.status(500).send('Internal Proxy Error'); 
  }
});

// --- Middleware & Auth Logic (Re-registering for Local use) ---
app.use((req, res, next) => {
  const isConnected = mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2;
  if (req.path.startsWith('/api') && !isConnected && !req.path.includes('/heartbeat')) {
    return res.status(503).json({ error: 'Database connecting, please retry', connecting: true });
  }
  next();
});

// --- API Sub-Routers ---
app.use('/api', uploadV2Routes);
app.use('/api', authRouter);
app.use('/api', courseRouter);
app.use('/api/courses/:courseId/tests', courseTestRoutes);
app.use('/api', academicRoutes);
app.use('/api', contentRoutes);
app.use('/api', communicationRoutes);
app.use('/api', systemRoutes);
app.use('/api', enrollmentRoutes);
app.use('/api', moderationRoutes);
app.use('/api', liveClassRoutes);
app.use('/api', assetRoutes);
app.use('/api', paymentRoutes);
app.use('/api', referralRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/subjective-tests', subjectiveRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/test-series', testSeriesRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/admin/reports', reportsRouter);
app.use('/api', resultRoutes);
app.use('/api', adminRoutes);
app.use('/api', storeRoutes);
app.use('/api', leaderboardRoutes);
app.use('/api', analyticsRoutes);

// Health and System routes handled via systemRoutes mount at line 165/166
// app.get('/health', health);
// /api/ping and /api/heartbeat are handled via systemRoutes mount at line 165

// Import the rest of the inline routes here...
// (I will use a second tool call to append or update with the full route logic 
// to avoid exceeding token limits in one go, but for this first draft I'll include 
// the ones requested for verification.)


// --- Migrated Student & User Routes (Separate Mounting) ---


// --- React SPA Catch-all (Production) ---
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, "../client/dist", "index.html");
  app.get('*', (req, res) => {
    if (fs.existsSync(distPath)) {
      res.sendFile(distPath);
    } else {
      res.status(404).send('Frontend build not found');
    }
  });
}

// End of App Routes

// --- Global Error Handler (must be LAST) ---
app.use(errorMiddleware);

export default app;
