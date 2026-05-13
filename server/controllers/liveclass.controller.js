import { getDb } from '../config/db.js';
import mongoose from 'mongoose';
import { syncLiveStream } from '../services/liveStream.service.js';
import { findCourse, getRelatedCourseIds, getCourseIdVariants } from '../services/course.service.js';
import { isPurchaseExpired } from '../utils/helpers.js';
import Student from '../models/Student.js';

const { ObjectId } = mongoose.Types;

/**
 * Controller-local helper to calculate live stream status.
 * Matches the 'Strict manual control' implementation from server.js.
 */
const calculateStreamStatus = (item) => {
  const lifecycleStatus = (item.streamStatus || item.status || item.liveStatus || item.eventStatus || 'upcoming').toLowerCase();
  
  // Robust Ended Detection
  const isExplicitlyEnded = ['ended', 'inactive', 'completed', 'disable', 'finished'].includes(lifecycleStatus);
  const isImplicitlyEnded = (item.isLive === false && (item.endedAt || item.endTime)) || 
                           (item.type === 'recorded' || item.contentType === 'recorded' || item.contentType === 'video');
  const hasEndedLabel = item.statusLabel === 'EVENT ENDED' || item.label === 'EVENT ENDED';

  if (isExplicitlyEnded || isImplicitlyEnded || hasEndedLabel) {
    return 'ended';
  }
  
  if (lifecycleStatus === 'live' || item.isLive === true) {
    return 'live';
  }

  // --- Schedule-Aware Upcoming Logic ---
  const scheduledAt = item.scheduledAt || item.scheduledTime || item.startTime || item.publishOn || '';
  if (scheduledAt) {
    const scheduledTime = new Date(scheduledAt).getTime();
    if (scheduledTime > Date.now()) {
      return 'upcoming';
    } else if (!isExplicitlyEnded) {
       // Past scheduled but not explicitly ended -> assume live if within reasonable window
       // or just return 'live' to allow joining
       return 'live';
    }
  }
  
  if (lifecycleStatus === 'recorded') {
    return 'recorded';
  }
  
  return 'upcoming';

};

// --- Live Video Admin Controllers ---

export const getLiveVideos = async (req, res) => {
  const db = getDb();
  try {
    const liveVideos = await db.collection('liveVideos').find({}).toArray();
    const courseLiveStreams = await db.collection('liveClasses').find({}).toArray();

    const allSessions = [...liveVideos, ...courseLiveStreams];

    const calculated = allSessions.map(item => {
      const status = calculateStreamStatus(item);
      return {
        ...item,
        _id: item._id,
        id: (item.id || item._id)?.toString(),
        status,
        isLive: status === 'live'
      };
    }).sort((a, b) => new Date(a.publishOn || a.date || a.createdAt) - new Date(b.publishOn || b.date || b.createdAt));

    res.json(calculated);
  } catch (error) {
    console.error('Error fetching live videos:', error);
    res.status(500).json({ error: 'Failed to fetch live videos' });
  }
};

export const createLiveVideo = async (req, res) => {
  try {
    const result = await syncLiveStream(null, req.body, 'create');
    res.status(201).json({ success: true, ...result });
  } catch (error) {
    console.error('Create live video error:', error);
    res.status(500).json({ error: 'Failed to create live video' });
  }
};

export const updateLiveVideo = async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    await syncLiveStream(req.params.id, updateData, 'update');
    res.json({ success: true, message: 'Live video updated and synced' });
  } catch (error) {
    console.error('Update live video error:', error);
    res.status(500).json({ error: 'Failed to update live video' });
  }
};

export const deleteLiveVideo = async (req, res) => {
  try {
    await syncLiveStream(req.params.id, null, 'delete');
    res.json({ success: true, message: 'Live video deleted across all collections' });
  } catch (error) {
    console.error('Delete live video error:', error);
    res.status(500).json({ error: 'Failed to delete live video' });
  }
};

// --- Live Class Admin Controllers ---

export const getLiveClasses = async (req, res) => {
  const db = getDb();
  try {
    const classes = await db.collection('liveClasses').find({}).toArray();
    res.json(classes);
  } catch (error) {
    console.error('Error fetching live classes:', error);
    res.status(500).json({ error: 'Failed to fetch live classes' });
  }
};

export const createLiveClass = async (req, res) => {
  const db = getDb();
  try {
    const result = await db.collection('liveClasses').insertOne(req.body);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    console.error('Error creating live class:', error);
    res.status(500).json({ error: 'Failed to create live class' });
  }
};

export const updateLiveClass = async (req, res) => {
  const db = getDb();
  try {
    const { _id, ...updateData } = req.body;
    const result = await db.collection('liveClasses').updateOne(
      { id: req.params.id },
      { $set: updateData }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Live class not found' });
    res.json({ success: true, message: 'Live class updated' });
  } catch (error) {
    console.error('Error updating live class:', error);
    res.status(500).json({ error: 'Failed to update live class' });
  }
};

export const deleteLiveClass = async (req, res) => {
  const db = getDb();
  try {
    const result = await db.collection('liveClasses').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Live class not found' });
    res.json({ success: true, message: 'Live class deleted' });
  } catch (error) {
    console.error('Error deleting live class:', error);
    res.status(500).json({ error: 'Failed to delete live class' });
  }
};

// --- Course Specific Live Class Controllers ---

export const getCourseLiveClasses = async (req, res) => {
  const db = getDb();
  try {
    const course = await findCourse(req.params.courseId);
    if (!course) return res.json([]);

    const idVariants = await getRelatedCourseIds(course, req.params.courseId);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const dateLimit = ninetyDaysAgo.toISOString().split('T')[0];

    const query = {
      $and: [
        { courseId: { $in: idVariants } },
        {
          $or: [
            { date: { $gte: dateLimit } },
            { publishOn: { $gte: ninetyDaysAgo.toISOString() } },
            { createdAt: { $gte: ninetyDaysAgo } },
            { scheduledDate: { $gte: dateLimit } },
            { status: 'live' }
          ]
        }
      ]
    };

    const projection = {
      title: 1, name: 1, teacherName: 1, instructor: 1,
      scheduledTime: 1, scheduledDate: 1, scheduledAt: 1,
      scheduleDate: 1, scheduleTime: 1,
      publishOn: 1,
      date: 1, createdAt: 1, endTime: 1, endDateTime: 1,
      joinBeforeMinutes: 1, status: 1, meetingLink: 1,
      url: 1, videoUrl: 1, link: 1, id: 1
    };


    const [c1, c2, c3] = await Promise.all([
      db.collection('liveVideos').find(query).project(projection).toArray(),
      db.collection('liveClasses').find(query).project(projection).toArray(),
      db.collection('videos').find({ ...query, contentType: { $in: ['youtube_zoom', 'live_stream'] } }).project(projection).toArray()
    ]);

    const merged = [...c1, ...c2, ...c3].map(item => {
      if (!item.date && item.publishOn) {
        const d = new Date(item.publishOn);
        if (!isNaN(d.getTime())) {
          item.date = d.toISOString().split('T')[0];
          item.startTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        }
      }

      if (!item.id && item._id) {
        item.id = item._id.toString();
      }

      if (!item.meetingLink) {
        item.meetingLink = item.url || item.videoUrl || item.link;
      }

      item.status = calculateStreamStatus(item);

      return item;
    }).sort((a, b) => new Date(a.date || a.publishOn || a.createdAt) - new Date(b.date || b.publishOn || b.createdAt));

    res.json(merged);
  } catch (error) {
    console.error('Error fetching course live classes:', error);
    res.status(500).json({ error: 'Failed to fetch live classes' });
  }
};

export const deleteCourseLiveClass = async (req, res) => {
  const db = getDb();
  try {
    const result = await db.collection('liveClasses').deleteOne({ id: req.params.id, courseId: req.params.courseId });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Live class not found' });
    res.json({ success: true, message: 'Live class deleted' });
  } catch (error) {
    console.error('Error deleting live class:', error);
    res.status(500).json({ error: 'Failed to delete live class' });
  }
};

// --- Streaming Controls (Phase 19H) ---

export const startLiveStream = async (req, res) => {
  try {
    const id = req.params.id;
    const update = {
      status: 'live',
      streamStatus: 'live',
      isLive: true,
      contentType: 'live_stream',
      startedAt: new Date().toISOString()
    };

    // Use central sync helper
    await syncLiveStream(id, update, 'update');
    res.json({ success: true, message: 'Live stream started successfully' });
  } catch (error) {
    console.error('Start live stream error:', error);
    res.status(500).json({ error: 'Failed to start live stream' });
  }
};

export const endLiveStream = async (req, res) => {
  try {
    const id = req.params.id;
    const update = {
      status: 'recorded',
      streamStatus: 'recorded',
      isLive: false,
      endedAt: new Date().toISOString(),
      endTime: new Date().toISOString()
    };

    // Use central sync helper
    await syncLiveStream(id, update, 'update');
    res.json({ success: true, message: 'Live stream ended successfully' });
  } catch (error) {
    console.error('End live stream error:', error);
    res.status(500).json({ error: 'Failed to end live stream' });
  }
};

export const syncLiveStreamsReconciliation = async (req, res) => {
  const db = getDb();
  try {
    console.log('[MIGRATION] Starting safe live stream reconciliation...');
    const liveVideos = await db.collection('liveVideos').find({}).toArray();
    let updatedCount = 0;

    for (const lv of liveVideos) {
      const id = (lv.id || lv._id)?.toString();
      if (!id) continue;
      
      const updateData = { ...lv };
      delete updateData._id;
      
      await syncLiveStream(id, updateData, 'update');
      updatedCount++;
    }

    res.json({ success: true, message: `Reconciliation complete. Processed ${updatedCount} streams.` });
  } catch (error) {
    console.error('Reconciliation error:', error);
    res.status(500).json({ error: 'Failed to reconcile live streams' });
  }
};
export const getStudentLiveClasses = async (req, res) => {
  const db = getDb();
  try {
    let studentId = req.params.id;
    let studentQuery = { id: studentId };
    if (mongoose.Types.ObjectId.isValid(studentId)) {
      studentQuery = { $or: [{ id: studentId }, { _id: studentId }] };
    }
    const student = await Student.findOne(studentQuery).lean();
    if (!student) return res.status(404).json({ error: 'Student not found' });

    // Step 4: Fetch strictly from enrollment records
    // This is the source of truth for what a student has "purchased"
    const enrollmentRecords = await db.collection('enrollments').find({
      $or: [
        { studentId: studentId },
        { studentId: student._id?.toString() }
      ]
    }).project({ courseId: 1, batchId: 1 }).toArray();

    if (enrollmentRecords.length === 0 && (!student.enrolledCourses || student.enrolledCourses.length === 0)) {
       return res.json([]); // No purchases -> No live classes
    }

    const enrolledCourseIds = new Set([
      ...(student.enrolledCourses || []),
      ...enrollmentRecords.map(e => e.courseId)
    ].filter(Boolean));

    const studentBatchIds = new Set(enrollmentRecords.map(e => e.batchId).filter(Boolean).map(String));

    // Get all variants (ID, _id, etc) for all enrolled courses to ensure matching
    const enrolledCourseIdsArray = Array.from(enrolledCourseIds);
    const enrolledBatchIdsArray = Array.from(studentBatchIds);

    // OPTIMIZED VARIANT LOOKUP: Fetch all enrolled course/package objects in bulk
    // to avoid the N+1 problem with getCourseIdVariants loop.
    const dbQueries = [
      db.collection('courses').find({ 
        $or: [
          { id: { $in: enrolledCourseIdsArray } },
          { _id: { $in: enrolledCourseIdsArray.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new ObjectId(id)) } }
        ] 
      }).project({ id: 1, _id: 1, name: 1, title: 1, courses: 1 }).toArray(),
      db.collection('packages').find({ 
        $or: [
          { id: { $in: enrolledCourseIdsArray } },
          { _id: { $in: enrolledCourseIdsArray.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new ObjectId(id)) } }
        ] 
      }).project({ id: 1, _id: 1, name: 1, title: 1, courses: 1 }).toArray()
    ];

    const [foundCourses, foundPackages] = await Promise.all(dbQueries);
    const allFound = [...foundCourses, ...foundPackages];

    // NEW: Fetch purchases in bulk for expiry check (Stabilization)
    const studentIdVariants = [studentId, student._id?.toString(), student.id, student.userId].filter(Boolean);
    const purchases = await db.collection('purchases').find({
      studentId: { $in: studentIdVariants },
      status: { $in: ['completed', 'success', 'captured', 'paid'] }
    }).toArray();

    // Create a map of courseId -> purchase for quick lookup
    const purchaseMap = new Map();
    purchases.forEach(p => {
      if (p.courseId) purchaseMap.set(String(p.courseId), p);
    });
    
    let allIdVariants = new Set(enrolledCourseIdsArray);
    const names = new Set();

    allFound.forEach(c => {
      if (c.id) allIdVariants.add(String(c.id));
      if (c._id) allIdVariants.add(c._id.toString());
      if (c.name) names.add(c.name);
      if (c.title) names.add(c.title);
      // Include children if it's a package
      if (Array.isArray(c.courses)) {
        c.courses.forEach(childId => allIdVariants.add(String(childId)));
      }
    });

    // Bulk lookup by name for cross-collection linking (Matches getRelatedCourseIds behavior but in bulk)
    if (names.size > 0) {
      const nameList = Array.from(names);
      const collections = ['courses', 'packages', 'subcourses'];
      const nameLookups = collections.map(col => 
        db.collection(col).find({
          $or: [
            { name: { $in: nameList } },
            { title: { $in: nameList } }
          ],
          status: { $nin: ['inactive', 'deleted'] }
        }).project({ id: 1, _id: 1 }).toArray()
      );
      const nameResults = await Promise.all(nameLookups);
      nameResults.flat().forEach(item => {
        if (item.id) allIdVariants.add(String(item.id));
        if (item._id) allIdVariants.add(item._id.toString());
      });
    }

    const finalIdVariants = Array.from(allIdVariants);
    const query = { 
      courseId: { $in: finalIdVariants }
    };

    // Step 4: Fetch from 3 collections (liveVideos is source of truth)
    const [c1, c2, c3] = await Promise.all([
      db.collection('liveVideos').find(query).toArray(),
      db.collection('liveClasses').find(query).toArray(),
      db.collection('videos').find({ ...query, contentType: { $in: ['youtube_zoom', 'live_stream'] } }).toArray()
    ]);

    // Step 8: Deduplication & Strict Batch Filtering
    const dedupeMap = new Map();

    const processItem = (item) => {
      const streamId = (item.id || item.streamId || item._id)?.toString();
      if (!streamId) return;

      // STRICT BATCH FILTERING:
      // If a stream has a batchId assigned, only students in that batch see it.
      // If it doesn't have a batchId, it's course-wide.
      if (item.batchId && !studentBatchIds.has(String(item.batchId))) {
        return;
      }

      // EXPIRY FILTERING: (Stabilization)
      // Check if the course associated with this stream has expired for the student.
      const associatedCourse = allFound.find(c => {
        const idStr = String(c.id || c._id);
        const itemIdStr = String(item.courseId);
        if (idStr === itemIdStr) return true;
        // Also check if this course is part of a package the student is enrolled in
        if (Array.isArray(c.courses) && c.courses.some(childId => String(childId) === itemIdStr)) return true;
        return false;
      });

      if (associatedCourse) {
        const purchase = purchaseMap.get(String(associatedCourse.id || associatedCourse._id));
        // Fallback to student creation/admission date for manual enrollments
        const effectivePurchase = purchase || {
          createdAt: student.admission?.admissionDate || student.createdAt || new Date()
        };
        if (isPurchaseExpired(effectivePurchase, associatedCourse)) {
          return;
        }
      }

      // Step 6: Dynamic Status
      item.status = calculateStreamStatus(item);
      item.isLive = item.status === 'live';

      // Ensure stable ID for client-side navigation
      if (!item.id && item._id) {
        item.id = item._id.toString();
      }
      
      // FIX: Ensure contentType is set to 'live_stream' if not present to enable chat in UI
      // This is critical for classes joined from Home Page
      if (!item.contentType || item.contentType === 'video' || item.contentType === 'recorded') {
        if (item.status === 'live' || item.status === 'upcoming') {
           item.contentType = 'live_stream';
        }
      }

      // Step 7: Consolidate Attachments visibility
      if (!item.pdf1 && item.pdf1Url) item.pdf1 = item.pdf1Url;
      if (!item.pdf2 && item.pdf2Url) item.pdf2 = item.pdf2Url;
      if (!item.studyMaterial && item.studyMaterialUrl) item.studyMaterial = item.studyMaterialUrl;

      // Deduplicate: liveVideos (c1) wins because it's processed last
      dedupeMap.set(streamId, item);
    };

    // c3 (videos) -> c2 (liveClasses) -> c1 (liveVideos) 
    [...c3, ...c2, ...c1].forEach(processItem); 

    const finalStreams = Array.from(dedupeMap.values())
      .filter(item => {
        const status = item.status;
        const streamStatus = item.streamStatus;
        const isLive = status === 'live';
        const isUpcoming = status === 'upcoming';
        const isRecorded = status === 'recorded' || streamStatus === 'recorded';
        
        if (!isLive && !isUpcoming && !isRecorded) return false;

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.scheduledTime || a.startTime || a.publishOn || a.date || 0).getTime();
        const timeB = new Date(b.scheduledTime || b.startTime || b.publishOn || b.date || 0).getTime();
        return timeA - timeB;
      });

    res.json(finalStreams);
  } catch (error) {
    console.error('Error fetching student live classes:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
