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

    const { userId, courseId, videoId, progress, duration, title, thumbnail } = req.body;
    const isAdmin = req.user?.isAdmin || req.user?.role === 'admin';
    const tokenStudentId = req.user?.studentId;

    if (!userId || !videoId) {
      return res.status(400).json({ error: 'userId and videoId are required' });
    }

    if (!isAdmin && String(userId) !== String(tokenStudentId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const effectiveUserId = isAdmin ? userId : tokenStudentId;
    const query = { userId: effectiveUserId, videoId: videoId };
    const update = {
      $set: {
        courseId,
        timestamp: progress,
        duration,
        title,
        thumbnail,
        lastUpdated: new Date()
      }
    };

    const result = await db.collection('videoProgress').updateOne(query, update, { upsert: true });

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

    const progress = await db.collection('videoProgress')
      .find({ userId: userId })
      .sort({ lastUpdated: -1 })
      .limit(20)
      .toArray();

    res.json(progress);
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
