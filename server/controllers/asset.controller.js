import { db } from '../config/db.js';
import mongoose from 'mongoose';
import { verifySignedUrl } from '../middleware/auth.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { ObjectId } = mongoose.Types;

// --- Video Assets Controllers ---

export const getVideos = async (req, res) => {
  try {
    const { courseId, isFree } = req.query;
    const query = {};
    if (courseId) query.courseId = courseId;
    
    if (isFree === 'true') {
      // Preserve exact multi-data-type filtering logic from monolith
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
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
};

export const createVideo = async (req, res) => {
  try {
    const videoData = { ...req.body };
    
    // Preserve exact fuzzy course-linking behavior
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
    console.error('Error creating video:', error);
    res.status(500).json({ error: 'Failed to create video' });
  }
};

export const updateVideo = async (req, res) => {
  try {
    const id = req.params.id;
    const query = {
      $or: [
        { id: id },
        { _id: ObjectId.isValid(id) ? new ObjectId(id) : null }
      ].filter(v => v.id || v._id)
    };
    
    const { _id, ...updateData } = req.body;
    const result = await db.collection('videos').updateOne(query, { $set: updateData });
    
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Video not found' });
    res.json({ success: true, message: 'Video updated' });
  } catch (error) {
    console.error('Error updating video:', error);
    res.status(500).json({ error: 'Failed to update video' });
  }
};

export const deleteVideo = async (req, res) => {
  try {
    const id = req.params.id;
    const query = {
      $or: [
        { id: id },
        { _id: ObjectId.isValid(id) ? new ObjectId(id) : null }
      ].filter(v => v.id || v._id)
    };
    
    const result = await db.collection('videos').deleteOne(query);
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Video not found' });
    res.json({ success: true, message: 'Video deleted' });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ error: 'Failed to delete video' });
  }
};

// --- Administrative Asset Controllers ---

export const deleteAllVideosAdmin = async (req, res) => {
  try {
    const result = await db.collection('videos').deleteMany({});
    res.json({ success: true, message: `Deleted ${result.deletedCount} videos` });
  } catch (error) {
    console.error('Error deleting all videos:', error);
    res.status(500).json({ error: 'Failed to delete all videos' });
  }
};

export const bulkCreateVideos = async (req, res) => {
  try {
    const { videos } = req.body;
    if (!Array.isArray(videos) || videos.length === 0) {
      return res.status(400).json({ error: 'No videos provided' });
    }
    const result = await db.collection('videos').insertMany(videos);
    res.status(201).json({ success: true, inserted: result.insertedCount });
  } catch (error) {
    console.error('Bulk create videos error:', error);
    res.status(500).json({ error: 'Failed to bulk create videos' });
  }
};

export const bulkUpdateVideos = async (req, res) => {
  try {
    const updates = Array.isArray(req.body) ? req.body : Object.values(req.body);
    let updatedCount = 0;
    
    for (const update of updates) {
      const { id, _id, ...data } = update;
      if (id) {
        await db.collection('videos').updateOne({ id }, { $set: data });
        updatedCount++;
      }
    }
    res.json({ success: true, message: `Updated ${updatedCount} videos` });
  } catch (error) {
    console.error('Bulk update videos error:', error);
    res.status(500).json({ error: 'Failed to update all videos' });
  }
};
// --- Secure Video Streaming (Migrated from server.js) ---

export const getVideoStream = async (req, res) => {
  try {
    const range = req.headers.range;
    const { filename } = req.params;
    const { sig, exp } = req.query;

    const filePath = path.join(__dirname, '..', 'uploads', filename);

    // Hardening: File existence check
    if (!fs.existsSync(filePath)) {
      console.warn(`[STREAM ERROR] File not found: ${filename}`);
      return res.status(404).json({ error: 'Video not found' });
    }

    if (sig && exp) {
      if (!verifySignedUrl(filename, sig, exp)) {
        return res.status(403).json({ error: 'Invalid or expired video URL' });
      }
    }

    let student = null;
    // getDb() logic:
    const db = mongoose.connection.db;

    if (req.user) {
      student = await db.collection('students').findOne({
        $or: [
          { id: req.user.studentId },
          ...(req.user.studentId && /^[a-f\d]{24}$/i.test(req.user.studentId) ? [{ _id: new ObjectId(req.user.studentId) }] : [])
        ]
      });
    } else if (req.cookies?.sessionToken) {
      student = await db.collection('students').findOne({ sessionToken: req.cookies.sessionToken });
    }

    if (!student && !(req.user?.isAdmin || req.user?.role === 'admin')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'inline');

    const stat = fs.statSync(filePath);

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;

      // Range check for safety
      if (isNaN(start) || start >= stat.size) {
        // Fallback to full file if range is invalid
        res.setHeader('Content-Length', stat.size);
        return fs.createReadStream(filePath).pipe(res);
      }

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
    console.error('[STREAM ERROR]', error.message);
    res.status(500).json({ error: 'Failed to stream video' });
  }
};
