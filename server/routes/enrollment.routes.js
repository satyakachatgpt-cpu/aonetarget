import express from 'express';
import {
  getStudentCourses,
  enrollStudent,
  checkEnrollment,
  getCourseProgress,
  updateCourseProgress,
  unenrollStudent
} from '../controllers/enrollment.controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

const studentOwnerOrAdmin = async (req, res, next) => {
  try {
    if (req.admin || req.user?.isAdmin || req.user?.role === 'admin') return next();
    
    const urlId = req.params.id;
    const tokenData = req.user;
    if (!urlId || !tokenData) return res.status(403).json({ error: 'Forbidden' });

    const db = mongoose.connection.db;
    const student = await db.collection('students').findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(urlId) ? new mongoose.Types.ObjectId(urlId) : null },
        { id: urlId },
        { userId: urlId }
      ].filter(v => v._id || v.id || v.userId)
    });

    if (!student) return res.status(404).json({ error: 'Student not found' });

    const tokenStudentId = tokenData.studentId || tokenData.id || tokenData._id;
    const studentVariants = [String(student._id), student.id, student.userId].filter(Boolean);

    if (studentVariants.includes(String(tokenStudentId))) return next();
    if (tokenData._id && studentVariants.includes(String(tokenData._id))) return next();

    return res.status(403).json({ error: 'Forbidden' });
  } catch (err) {
    return res.status(500).json({ error: 'Auth Error' });
  }
};

// Student-facing Admission & Enrollment checks
router.get('/students/:id/courses', authMiddleware, studentOwnerOrAdmin, getStudentCourses);
router.get('/students/:id/enrolled/:courseId', authMiddleware, studentOwnerOrAdmin, checkEnrollment);
router.get('/students/:id/courses/:courseId/progress', authMiddleware, studentOwnerOrAdmin, getCourseProgress);
router.put('/students/:id/courses/:courseId/progress', authMiddleware, studentOwnerOrAdmin, updateCourseProgress);

// Enrollment Actions
router.post('/students/:id/enroll', authMiddleware, studentOwnerOrAdmin, enrollStudent);
router.delete('/students/:id/unenroll/:courseId', authMiddleware, studentOwnerOrAdmin, unenrollStudent);

export default router;
