import mongoose from 'mongoose';
import { db } from '../config/db.js';
import { generateSignedUrl } from '../middleware/auth.js';

const { ObjectId } = mongoose.Types;

export const signVideoUrl = async (req, res) => {
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
};
