import { db } from '../config/db.js';
import mongoose from 'mongoose';
import { findCourse, getRelatedCourseIds, getCourseIdVariants } from '../services/course.service.js';
import { isPurchaseExpired } from '../utils/helpers.js';
import { sendEmail, templates } from '../utils/email.js';
import Student from '../models/Student.js';

const { ObjectId } = mongoose.Types;

// --- Student Course Access Controllers ---
export const getStudentCourses = async (req, res) => {
  try {
    const studentId = req.params.id;
    
    // 1. Robust Student Resolution
    const student = await db.collection('students').findOne({
      $or: [
        { id: studentId },
        { userId: studentId },
        { _id: ObjectId.isValid(studentId) ? new ObjectId(studentId) : null }
      ].filter(v => v.id || v.userId || v._id)
    });

    if (!student) {
      console.warn(`[getStudentCourses] Student not found: ${studentId}`);
      return res.status(404).json({ error: 'Student not found' });
    }

    const enrolledCourseIds = (student.enrolledCourses || []).map(id => String(id));
    if (enrolledCourseIds.length === 0) {
      return res.json([]);
    }

    const objectIds = enrolledCourseIds
      .filter(id => ObjectId.isValid(id))
      .map(id => new ObjectId(id));

    // 2. Multi-Collection Search
    const collectionsToSearch = ['courses', 'packages', 'testSeries', 'test-series', 'subcourses', 'tests', 'test_series'];
    let allContent = [];

    for (const col of collectionsToSearch) {
      try {
        const results = await db.collection(col).find({
          $or: [
            { id: { $in: enrolledCourseIds } },
            { _id: { $in: enrolledCourseIds } }, // Handle string _id
            { _id: { $in: objectIds } }
          ]
        }).toArray();

        results.forEach(item => {
          // Tag with collection for logic branching if needed
          allContent.push({ ...item, _collection: col });
        });
      } catch (err) {
        console.error(`Error searching in ${col}:`, err.message);
      }
    }

    // Deduplicate by canonical ID
    const uniqueContentMap = new Map();
    allContent.forEach(item => {
      const idKey = String(item.id || item._id);
      if (!uniqueContentMap.has(idKey)) {
        uniqueContentMap.set(idKey, item);
      }
    });
    const uniqueContent = Array.from(uniqueContentMap.values());

    // 3. Process & Map content with progress
    const watchProgress = await db.collection('videoProgress').find({ 
      userId: student.userId || student.id || studentId 
    }).toArray();

    const mappedContent = await Promise.all(uniqueContent.map(async (c) => {
      const contentIdStr = String(c.id || c._id);
      const idVariants = await getCourseIdVariants(contentIdStr);

      // Default values
      let totalLessons = c.lessons || c.videoCount || c.totalTests || 0;
      let watchedCount = 0;
      let progress = 0;

      // Special handling for courses (videos)
      if (c._collection === 'courses' || c._collection === 'subcourses' || !c._collection) {
        const totalVideos = await db.collection('videos').countDocuments({
          courseId: { $in: idVariants }
        });
        totalLessons = totalVideos;
        
        watchedCount = watchProgress.filter(wp =>
          idVariants.includes(wp.courseId) && Number(wp.timestamp || 0) > 0
        ).length;
        
        progress = totalVideos > 0 ? Math.round((watchedCount / totalVideos) * 100) : 0;
      }

      // Check Expiry (Respect manual assignments)
      const allStudentIdVariants = [
        String(student._id),
        student.id,
        student.userId
      ].filter(Boolean);

      const purchase = await db.collection('purchases').findOne({
        studentId: { $in: allStudentIdVariants },
        courseId: { $in: idVariants },
        status: 'completed'
      }, { sort: { createdAt: -1 } });

      const expired = isPurchaseExpired(purchase, c);

      // Standardize shape for MyCourses.tsx
      return {
        _id: c._id,
        id: contentIdStr,
        name: c.name || c.title || c.seriesName || 'Untitled Content',
        title: c.title || c.name || c.seriesName,
        thumbnail: c.thumbnail || c.imageUrl,
        subject: c.subject || c.category || (c._collection === 'testSeries' ? 'Test Series' : 'General'),
        lessons: totalLessons,
        duration: c.duration || '0',
        progress: progress,
        expired: expired,
        type: c.type || c.contentType || (c._collection === 'testSeries' ? 'test_series' : 'course')
      };
    }));

    // Filter out expired and return
    const activeContent = mappedContent.filter(c => !c.expired);
    console.log(`[getStudentCourses] Found ${activeContent.length} active courses for student ${studentId}`);
    res.json(activeContent);
  } catch (error) {
    console.error('Error in getStudentCourses:', error);
    res.status(500).json({ error: 'Internal server error while fetching courses' });
  }
};

// --- Enrollment Controllers ---

export const enrollStudent = async (req, res) => {
  try {
    const { courseId } = req.body;
    if (!courseId) {
      return res.status(400).json({ error: 'Course ID is required' });
    }

    const student = await Student.findOne({
      $or: [
        { id: req.params.id },
        { userId: req.params.id },
        { _id: mongoose.Types.ObjectId.isValid(req.params.id) ? req.params.id : null }
      ].filter(v => v.id || v.userId || v._id)
    });
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

    await Student.updateOne(
      { _id: student._id },
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
    const { id: studentId, courseId } = req.params;
    
    const student = await Student.findOne({
      $or: [
        { id: studentId },
        { userId: studentId },
        { _id: mongoose.Types.ObjectId.isValid(studentId) ? studentId : null }
      ].filter(v => v.id || v.userId || v._id)
    });
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const course = await findCourse(courseId);
    if (!course) {
      return res.json({ enrolled: false });
    }

    // Get all variants of the course ID (canonical, _id, slugs, etc.)
    const idVariants = await getRelatedCourseIds(course, courseId);
    const enrolledCourses = (student.enrolledCourses || []).map(id => String(id));

    // 1. Primary Check: Is any variant in the student's enrolled list?
    let isEnrolled = idVariants.some(id => enrolledCourses.includes(String(id)));

    // 2. Parental/Linked Check: Does student have a batch/package that includes this series?
    if (!isEnrolled) {
      // Find all Courses or Packages that contain this series ID in content.testSeries
      const [parentCourses, parentPackages] = await Promise.all([
        db.collection('courses').find({ "content.testSeries": { $in: idVariants } }).toArray(),
        db.collection('packages').find({ "content.testSeries": { $in: idVariants } }).toArray()
      ]);
      
      const parentCourseIds = [...parentCourses, ...parentPackages].map(c => c.id || c._id.toString());

      // Also check if the series itself links to a batch/package the student has
      const linkedBatchIds = (course.courseIds || []).concat(course.courseId ? [course.courseId] : []);
      
      // DEEP MATCH: Get all variants for every linked batch to ensure we catch the enrollment
      const allParentIds = new Set(parentCourseIds);
      for (const bid of linkedBatchIds) {
          allParentIds.add(String(bid));
          // Find the batch document to get its other IDs (slug, custom id, etc)
          const bDoc = await findCourse(bid);
          if (bDoc) {
              const bVariants = await getRelatedCourseIds(bDoc, String(bid));
              bVariants.forEach(v => allParentIds.add(String(v)));
          }
      }

      if (Array.from(allParentIds).some(pid => enrolledCourses.includes(String(pid)))) {
        isEnrolled = true;
      }
    }

    // 3. Expiry Check (Only if already enrolled via direct or parental links)
    if (isEnrolled) {
      const purchase = await db.collection('purchases').findOne({
        studentId: studentId,
        courseId: { $in: idVariants },
        status: 'completed'
      }, { sort: { createdAt: -1 } });

      if (purchase) {
        isEnrolled = !isPurchaseExpired(purchase, course);
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



export const unenrollStudent = async (req, res) => {
  try {
    const { courseId, id: studentId } = req.params;

    if (!courseId) {
      return res.status(400).json({ error: 'Course ID is required' });
    }

    // Robust matching for student (supports custom id, userId, and Mongo _id)
    const student = await Student.findOne({
      $or: [
        { id: studentId },
        { userId: studentId },
        { _id: mongoose.Types.ObjectId.isValid(studentId) ? studentId : null }
      ].filter(v => v.id || v.userId || v._id)
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Pull from enrolledCourses array
    await Student.updateOne(
      { _id: student._id },
      { $pull: { enrolledCourses: courseId } }
    );

    // Update course enrollment count
    const course = await findCourse(courseId);
    if (course) {
      const db = mongoose.connection.db;
      await db.collection(course._collection || 'courses').updateOne(
        { _id: course._id },
        { $inc: { studentsEnrolled: -1 } }
      );
    }

    res.json({ success: true, message: 'Unenrolled successfully' });
  } catch (error) {
    console.error('Unenrollment error:', error);
    res.status(500).json({ error: 'Failed to unenroll' });
  }
};
