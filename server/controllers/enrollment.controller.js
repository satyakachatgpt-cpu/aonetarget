import { db } from '../config/db.js';
import mongoose from 'mongoose';
import { findCourse, getRelatedCourseIds, getCourseIdVariants } from '../services/course.service.js';
import { isPurchaseExpired } from '../utils/helpers.js';
import { sendEmail, templates } from '../utils/email.js';

const { ObjectId } = mongoose.Types;

// --- Student Course Access Controllers ---
export const getStudentCourses = async (req, res) => {
  try {
    const studentId = req.params.id;
    const student = await db.collection('students').findOne({
      $or: [
        { id: studentId },
        { userId: studentId },
        { _id: ObjectId.isValid(studentId) ? new ObjectId(studentId) : null }
      ].filter(v => v.id || v.userId || v._id)
    });
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
    const watchProgress = await db.collection('videoProgress').find({ userId: req.params.id }).toArray();

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
        idVariants.includes(wp.courseId) && Number(wp.timestamp || 0) > 0
      ).length;

      const progress = totalVideos > 0 ? Math.round((watchedCount / totalVideos) * 100) : 0;

      // Check for expiry
      const purchase = await db.collection('purchases').findOne({
        studentId: req.params.id,
        courseId: { $in: idVariants },
        status: 'completed'
      }, { sort: { createdAt: -1 } });

      const expired = isPurchaseExpired(purchase, c);

      return {
        ...c,
        id: courseIdStr,
        progress: progress,
        totalVideos: totalVideos,
        watchedCount: watchedCount,
        expired: expired
      };
    }));

    // Filter out expired courses for the main list
    res.json(mappedCourses.filter(c => !c.expired));
  } catch (error) {
    console.error('Error fetching student courses:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
};

// --- Enrollment Controllers ---

export const enrollStudent = async (req, res) => {
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
};

export const checkEnrollment = async (req, res) => {
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
    let isEnrolled = idVariants.some(id => enrolledCourses.includes(id));

    if (isEnrolled) {
      // Check for expiry
      const purchase = await db.collection('purchases').findOne({
        studentId: req.params.id,
        courseId: { $in: idVariants },
        status: 'completed'
      }, { sort: { createdAt: -1 } });

      if (isPurchaseExpired(purchase, course)) {
        isEnrolled = false;
      }
    }

    res.json({ enrolled: isEnrolled });
  } catch (error) {
    console.error('Error checking enrollment:', error);
    res.status(500).json({ error: 'Failed to check enrollment' });
  }
};

export const getCourseProgress = async (req, res) => {
  try {
    const dbProgress = await db.collection('courseProgress').findOne({
      studentId: req.params.id,
      courseId: req.params.courseId
    });

    res.json(dbProgress || {
      studentId: req.params.id,
      courseId: req.params.courseId,
      completedVideos: [],
      completedTests: [],
      completedNotes: []
    });
  } catch (error) {
    console.error('Error fetching course progress:', error);
    res.status(500).json({ error: 'Failed to fetch course progress' });
  }
};

export const updateCourseProgress = async (req, res) => {
  try {
    const { videoId, testId, noteId, action = 'complete' } = req.body;
    const field = videoId ? 'completedVideos' : testId ? 'completedTests' : noteId ? 'completedNotes' : null;
    const itemId = videoId || testId || noteId;

    if (!field || !itemId) {
      return res.status(400).json({ error: 'videoId, testId, or noteId is required' });
    }

    const query = { studentId: req.params.id, courseId: req.params.courseId };
    const update = {
      $setOnInsert: {
        studentId: req.params.id,
        courseId: req.params.courseId,
        completedVideos: [],
        completedTests: [],
        completedNotes: [],
        createdAt: new Date()
      },
      $set: { updatedAt: new Date() }
    };

    if (action === 'uncomplete' || action === 'remove') {
      update.$pull = { [field]: itemId };
    } else {
      update.$addToSet = { [field]: itemId };
    }

    await db.collection('courseProgress').updateOne(query, update, { upsert: true });
    const progress = await db.collection('courseProgress').findOne(query);
    res.json(progress);
  } catch (error) {
    console.error('Error updating course progress:', error);
    res.status(500).json({ error: 'Failed to update course progress' });
  }
};
