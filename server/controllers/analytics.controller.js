import { getDb } from '../config/db.js';
import mongoose from 'mongoose';

const { ObjectId } = mongoose.Types;

/**
 * Save video progress for a student
 * POST /api/progress/save
 */
export const saveProgress = async (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'DB not ready' });

    const { userId, courseId, courseTitle, videoId, progress, duration, title, thumbnail, videoUrl, youtubeUrl } = req.body;
    const isAdmin = req.user?.isAdmin || req.user?.role === 'admin';
    const tokenStudentId = req.user?.studentId || req.user?.id || req.user?._id;

    if (!userId || !videoId) {
      return res.status(400).json({ error: 'userId and videoId are required' });
    }

    let effectiveUserId = userId;
    if (!isAdmin && tokenStudentId) {
      const student = await db.collection('students').findOne({
        $or: [
          { id: tokenStudentId },
          { userId: tokenStudentId },
          ...(ObjectId.isValid(tokenStudentId) ? [{ _id: new ObjectId(tokenStudentId) }] : [])
        ]
      });
      const validIds = student ? [student.id, String(student._id), student.userId].filter(Boolean) : [String(tokenStudentId)];
      if (!validIds.includes(String(userId))) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      effectiveUserId = student?.id || tokenStudentId;
    }

    const query = { userId: effectiveUserId, videoId: videoId };
    const update = {
      $set: {
        courseId,
        courseTitle,
        timestamp: progress,
        duration,
        title,
        thumbnail,
        videoUrl,
        youtubeUrl,
        lastUpdated: new Date()
      }
    };

    const result = await db.collection('videoProgress').updateOne(query, update, { upsert: true });

    // Sync with watchHistory collection
    await db.collection('watchHistory').updateOne(
      { studentId: effectiveUserId, videoId: videoId },
      { 
        $set: {
          videoId,
          title,
          courseId,
          courseTitle,
          thumbnail,
          videoUrl,
          youtubeUrl,
          duration,
          watchProgress: duration > 0 ? Math.round((progress / duration) * 100) : 0,
          updatedAt: new Date()
        },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );

    // If duration is known and video in videos collection is missing duration, backfill it
    if (duration > 0 && videoId) {
      const hours = Math.floor(duration / 3600);
      const mins = Math.floor((duration % 3600) / 60);
      const secs = Math.floor(duration % 60);
      const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
      const formattedDur = hours > 0 ? `${pad(hours)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
      
      db.collection('videos').updateOne(
        {
          $or: [
            { id: videoId },
            ...(ObjectId.isValid(videoId) ? [{ _id: new ObjectId(videoId) }] : [])
          ],
          $or: [
            { duration: { $exists: false } },
            { duration: null },
            { duration: '' },
            { duration: '00:00' },
            { duration: '0:00' },
            { duration: '0' }
          ]
        },
        { $set: { duration: formattedDur } }
      ).catch(() => {});
    }

    res.json({ success: true, message: 'Progress saved', result });
  } catch (error) {
    console.error('Save progress error:', error);
    res.status(500).json({ error: 'Failed to save progress' });
  }
};

/**
 * Get video progress for a student
 * GET /api/progress/:userId
 */
export const getProgress = async (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'DB not ready' });

    const { userId } = req.params;
    const student = await db.collection('students').findOne({
      $or: [
        { id: userId },
        { userId: userId },
        ...(ObjectId.isValid(userId) ? [{ _id: new ObjectId(userId) }] : [])
      ]
    });
    const userIds = student ? [student.id, String(student._id), student.userId].filter(Boolean) : [userId];

    const rawProgress = await db.collection('videoProgress')
      .find({ userId: { $in: userIds } })
      .sort({ lastUpdated: -1 })
      .limit(50)
      .toArray();

    res.json(rawProgress);
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
};

/**
 * Track user activity
 * POST /api/activity/track
 */
export const trackActivity = async (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'DB not ready' });

    const { userId, courseId, action, metadata } = req.body;
    const isAdmin = req.user?.isAdmin || req.user?.role === 'admin';
    const tokenStudentId = req.user?.studentId;
    const effectiveUserId = isAdmin ? userId : tokenStudentId;

    if (!effectiveUserId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const activity = {
      userId: effectiveUserId,
      courseId,
      action, // e.g., 'course_open', 'purchase_click'
      metadata,
      timestamp: new Date()
    };

    await db.collection('userActivity').insertOne(activity);
    res.json({ success: true });
  } catch (error) {
    console.error('Track activity error:', error);
    res.status(500).json({ error: 'Failed to track activity' });
  }
};

/**
 * Get admin analytics (High-level)
 * GET /api/admin/analytics
 */
export const getAdminAnalytics = async (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'DB not ready' });

    const stats = await Promise.all([
      db.collection('userActivity').countDocuments(),
      db.collection('videoProgress').countDocuments(),
      db.collection('enrollments').countDocuments(),
      db.collection('userActivity').aggregate([
        { $group: { _id: '$action', count: { $sum: 1 } } }
      ]).toArray()
    ]);

    res.json({
      totalActivities: stats[0],
      totalProgressRecords: stats[1],
      totalEnrollments: stats[2],
      actionBreakdown: stats[3]
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};
