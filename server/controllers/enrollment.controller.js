import mongoose from 'mongoose';
import { findCourse, getRelatedCourseIds, getCourseIdVariants } from '../services/course.service.js';
import { isPurchaseExpired, calculatePriceBreakdown } from '../utils/helpers.js';
import { sendEmail, templates } from '../utils/email.js';
import Student from '../models/Student.js';

const { ObjectId } = mongoose.Types;

// --- Student Course Access Controllers ---
export const getStudentCourses = async (req, res) => {
  const studentId = req.params.id;
  if (import.meta.env?.DEV || true) console.log(`[getStudentCourses] Fetching courses for: ${studentId}`);
  
  try {
    const db = mongoose.connection.db;
    if (!db) {
      console.error('[getStudentCourses] Database connection not ready');
      return res.status(503).json({ error: 'Database not ready' });
    }

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

    // 2. Aggregate Enrollment Sources (Robust Resolution)
    const studentIdVariants = [
      String(student._id),
      student.id,
      student.userId
    ].filter(Boolean);

    console.log(`[DEBUG_MYCOURSES] Student ${studentId} resolved to variants:`, studentIdVariants);

    // Source A: Standard Enrolled Courses Array
    const enrolledArray = Array.isArray(student.enrolledCourses) ? student.enrolledCourses : [];
    console.log(`[DEBUG_MYCOURSES] enrolledArray:`, enrolledArray);
    
    // Source B: Legacy single enrolled batch
    const enrolledBatch = student.enrolledBatch ? [String(student.enrolledBatch)] : [];
    console.log(`[DEBUG_MYCOURSES] enrolledBatch:`, enrolledBatch);

    // Source C: Successful Purchases (Completed/Captured/Paid)
    const purchases = await db.collection('purchases').find({
      studentId: { $in: studentIdVariants },
      status: { $in: ['completed', 'success', 'captured', 'paid'] }
    }).toArray();
    const purchasedCourseIds = purchases.map(p => String(p.courseId));
    console.log(`[DEBUG_MYCOURSES] purchases count: ${purchases.length}, courseIds:`, purchasedCourseIds);

    // Merge and deduplicate all IDs
    const allEnrolledIds = [...new Set([
      ...enrolledArray.map(id => String(id)),
      ...enrolledBatch,
      ...purchasedCourseIds
    ])].filter(Boolean);

    console.log(`[DEBUG_MYCOURSES] Combined unique course IDs:`, allEnrolledIds);

    if (allEnrolledIds.length === 0) {
      console.log(`[getStudentCourses] No active enrollments found for student: ${studentId}`);
      return res.json([]);
    }

    const objectIds = allEnrolledIds
      .filter(id => ObjectId.isValid(id))
      .map(id => new ObjectId(id));

    // 3. Multi-Collection Search (Hydration)
    const collectionsToSearch = ['courses', 'packages', 'testSeries', 'test-series', 'subcourses', 'tests', 'test_series'];
    let allContent = [];

    for (const col of collectionsToSearch) {
      try {
        const results = await db.collection(col).find({
          $or: [
            { id: { $in: allEnrolledIds } },
            { _id: { $in: allEnrolledIds } },
            { _id: { $in: objectIds } }
          ]
        }).toArray();

        if (results.length > 0) {
          console.log(`[DEBUG_MYCOURSES] Found ${results.length} items in collection: ${col}`);
        }

        results.forEach(item => {
          allContent.push({ ...item, _collection: col });
        });
      } catch (err) {
        console.error(`[getStudentCourses] Error searching in ${col}:`, err.message);
      }
    }

    // Deduplicate by canonical ID to prevent double cards
    const uniqueContentMap = new Map();
    allContent.forEach(item => {
      const idKey = String(item.id || item._id);
      if (!uniqueContentMap.has(idKey)) {
        uniqueContentMap.set(idKey, item);
      }
    });
    const uniqueContent = Array.from(uniqueContentMap.values());
    console.log(`[DEBUG_MYCOURSES] Hydrated unique content count: ${uniqueContent.length}`);

    // 4. Batch fetch all course progress records for these variants
    const allProgress = await db.collection('courseProgress').find({
      studentId: { $in: studentIdVariants }
    }).toArray();

    // 4. Batch pre-calculate metrics (Optimization: Remove N+1 queries)
    const contentIdMap = new Map();
    const allEnrolledVariantsSet = new Set();
    
    // First pass: Resolve all variants for enrolled content
    for (const c of uniqueContent) {
      const contentIdStr = String(c.id || c._id);
      const variants = await getCourseIdVariants(contentIdStr);
      contentIdMap.set(contentIdStr, variants);
      variants.forEach(v => allEnrolledVariantsSet.add(v));
    }

    // Single bulk aggregation for all video counts
    const videoCounts = await db.collection('videos').aggregate([
      { $match: { courseId: { $in: Array.from(allEnrolledVariantsSet) } } },
      { $group: { _id: "$courseId", count: { $sum: 1 } } }
    ]).toArray();
    
    const videoCountMap = new Map();
    videoCounts.forEach(vc => videoCountMap.set(String(vc._id), vc.count));

    const mappedContent = await Promise.all(uniqueContent.map(async (c) => {
      const contentIdStr = String(c.id || c._id);
      const idVariants = contentIdMap.get(contentIdStr) || [contentIdStr];

      // Resolve specific progress for THIS course
      const progRecord = allProgress.find(p => 
        idVariants.includes(String(p.courseId))
      );

      // Calculate Metrics from Pre-fetched Map
      const totalVideos = idVariants.reduce((acc, vid) => acc + (videoCountMap.get(vid) || 0), 0);
      
      const completedVideos = (progRecord?.completedVideos || []).map(v => String(v));
      const completedCount = Math.min(completedVideos.length, totalVideos);
      const progressPercent = totalVideos > 0 ? Math.min(100, Math.round((completedCount / totalVideos) * 100)) : 0;

      // Expiry Check (Handles manual vs purchased)
      const purchaseForThisCourse = purchases.find(p => idVariants.includes(String(p.courseId)));
      const expired = isPurchaseExpired(purchaseForThisCourse, c);

      if (process.env.NODE_ENV !== 'production' && progressPercent > 0) {
        console.log(`[DEBUG_MYCOURSES] Progress for ${contentIdStr}: ${progressPercent}% (${completedCount}/${totalVideos})`);
      }

      // Standardize shape for MyCourses.tsx
      return {
        _id: c._id,
        id: contentIdStr,
        name: c.name || c.title || c.seriesName || 'Untitled Content',
        title: c.title || c.name || c.seriesName,
        thumbnail: c.thumbnail || c.imageUrl,
        subject: c.subject || c.category || (c._collection === 'testSeries' ? 'Test Series' : 'General'),
        lessons: totalVideos, // Display total videos as lessons
        duration: c.duration || '0',
        progress: progressPercent,
        progressPercent: progressPercent,
        completedCount: completedCount,
        totalVideos: totalVideos,
        expired: expired,
        type: c.type || c.contentType || (c._collection === 'testSeries' ? 'test_series' : 'course')
      };
    }));

    // Return active content only
    const activeContent = mappedContent.filter(c => !c.expired);
    console.log(`[getStudentCourses] Success: ${activeContent.length} active courses for ${studentId}`);
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

    const safeNumber = (val, fallback = 0) => {
      const n = Number(val);
      return Number.isFinite(n) ? n : fallback;
    };

    // Use the canonical ID and variants for idempotency
    const canonicalId = course.id || course._id.toString();
    const idVariants = [...new Set([
      canonicalId,
      String(courseId),
      course.id ? String(course.id) : null,
      course._id ? course._id.toString() : null,
      ...(await getRelatedCourseIds(course, canonicalId))
    ])].filter(Boolean).map(String);

    const enrolledCourses = (student.enrolledCourses || []).map(id => String(id));

    // 1. Comprehensive Idempotency Check
    if (idVariants.some(id => enrolledCourses.includes(String(id)))) {
      return res.status(200).json({ success: true, message: 'Already enrolled' });
    }

    // 2. Security Check: Only allow free courses (Price = 0) via this endpoint
    const isAdmin = !!(req.admin || req.user?.isAdmin || req.user?.role === 'admin');
    
    // Robust Price Verification (Server-side ground truth)
    const breakdown = calculatePriceBreakdown(course, null);
    const basePrice = safeNumber(course.price || course.amount, 0);
    // Safe fallback to a high price if totalAmount is missing or NaN
    const finalPayable = safeNumber(breakdown.totalAmount ?? basePrice, 999999);

    if (finalPayable > 0 && !isAdmin) {
       console.warn(`[SECURITY] Blocked direct enrollment attempt for student ${req.params.id} on course ${canonicalId}`);
       return res.status(402).json({ error: 'This is a paid course. Please purchase it via the checkout flow.' });
    }

    // SECURITY GATE: Only allow free courses to be enrolled via this direct endpoint for students.
    // Paid courses MUST be enrolled via the payment flow (razorpay/purchase controllers).
    const isPaid = (course.price > 0) && !course.isFree && course.free !== true;

    if (isPaid && !isAdmin) {
      console.warn(`[SECURITY] Blocked free enrollment attempt for paid course: ${courseId} by student ${req.params.id}`);
      return res.status(403).json({ 
        error: 'This is a paid course. Please complete payment to enroll.', 
        code: 'PAID_COURSE_REQUIRED' 
      });
    }

    await Student.updateOne(
      { _id: student._id },
      { $addToSet: { enrolledCourses: canonicalId } }
    );

    // Update course enrollment count
    const db = mongoose.connection.db;
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
      const db = mongoose.connection.db;
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
      const db = mongoose.connection.db;
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
    const db = mongoose.connection.db;
    const studentId = req.params.id;
    const courseId = req.params.courseId;

    // Resolve student variants for robust matching
    const student = await db.collection('students').findOne({
      $or: [
        { id: studentId },
        { userId: studentId },
        { _id: mongoose.Types.ObjectId.isValid(studentId) ? new mongoose.Types.ObjectId(studentId) : null }
      ].filter(v => v.id || v.userId || v._id)
    });

    const studentIdVariants = student 
      ? [String(student._id), student.id, student.userId].filter(Boolean)
      : [studentId];

    const dbProgress = await db.collection('courseProgress').findOne({
      studentId: { $in: studentIdVariants },
      courseId: courseId
    });

    const idVariants = await getCourseIdVariants(courseId);
    const totalVideos = await db.collection('videos').countDocuments({
      courseId: { $in: idVariants }
    });

    const completedVideos = (dbProgress?.completedVideos || []).map(v => String(v));
    const completedCount = Math.min(completedVideos.length, totalVideos);
    const progressPercent = totalVideos > 0 ? Math.min(100, Math.round((completedCount / totalVideos) * 100)) : 0;

    const response = {
      success: true,
      studentId: req.params.id,
      courseId: req.params.courseId,
      completedVideos,
      completedCount,
      totalVideos,
      progressPercent,
      completedTests: (dbProgress?.completedTests || []).map(t => String(t)),
      completedNotes: (dbProgress?.completedNotes || []).map(n => String(n))
    };

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[getCourseProgress] Found record for ${courseId}: ${progressPercent}% (${completedCount}/${totalVideos})`);
    }

    res.json(response);
  } catch (error) {
    console.error('Error fetching course progress:', error);
    res.status(500).json({ error: 'Failed to fetch course progress' });
  }
};

export const updateCourseProgress = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { videoId, testId, noteId, action = 'complete' } = req.body;
    const field = videoId ? 'completedVideos' : testId ? 'completedTests' : noteId ? 'completedNotes' : null;
    const rawItemId = videoId || testId || noteId;
    const itemId = String(rawItemId); // STREICT TYPE SYNC: Always store as string

    if (!field || !rawItemId) {
      return res.status(400).json({ error: 'videoId, testId, or noteId is required' });
    }

    const rawStudentId = req.params.id;
    const courseId = req.params.courseId;

    // 1. Resolve Student (Robust matching)
    const student = await db.collection('students').findOne({
      $or: [
        { id: rawStudentId },
        { userId: rawStudentId },
        { _id: mongoose.Types.ObjectId.isValid(rawStudentId) ? new mongoose.Types.ObjectId(rawStudentId) : null }
      ].filter(v => v.id || v.userId || v._id)
    });

    if (!student) return res.status(404).json({ error: 'Student not found' });

    // 2. Use canonical student ID for consistency
    const canonicalStudentId = student.id || String(student._id);
    const studentIdVariants = [String(student._id), student.id, student.userId].filter(Boolean);

    // 3. Find existing progress record by ANY variant
    const query = { studentId: { $in: studentIdVariants }, courseId: courseId };
    
    const update = {
      $setOnInsert: {
        studentId: canonicalStudentId,
        courseId: courseId,
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
    
    // 4. Return the updated record with normalized string arrays
    const progress = await db.collection('courseProgress').findOne({
      studentId: { $in: studentIdVariants },
      courseId: courseId
    });

    if (progress) {
        progress.completedVideos = (progress.completedVideos || []).map(v => String(v));
        progress.completedTests = (progress.completedTests || []).map(t => String(t));
        progress.completedNotes = (progress.completedNotes || []).map(n => String(n));
    }

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
