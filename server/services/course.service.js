import mongoose from 'mongoose';
import { getCache, setCache } from '../utils/memoryCache.js';
const { ObjectId } = mongoose.Types;

/**
 * Get internal DB instance
 */
const getDb = () => mongoose.connection.db;

/**
 * Helper to find a course/package by any ID variant (custom id, slug, or ObjectId)
 */
export async function findCourse(id) {
  if (!id) return null;
  const cacheKey = `findCourse:${id}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const db = getDb();
  const collections = ['courses', 'packages', 'testSeries', 'test-series', 'subcourses', 'tests', 'test_series'];
  const orConditions = [
    { id: id },
    { slug: id },
    { _id: id },
    ...(ObjectId.isValid(id) ? [{ _id: new ObjectId(id) }] : [])
  ];

  const results = await Promise.all(
    collections.map(async (colName) => {
      try {
        const item = await db.collection(colName).findOne({ $or: orConditions });
        return item ? { ...item, _collection: colName } : null;
      } catch (e) {
        return null;
      }
    })
  );

  const found = results.find(Boolean) || null;
  if (found) setCache(cacheKey, found, 60);
  return found;
}

/**
 * Function to find all related IDs by name and/or slug/id for content linking
 */
export async function getRelatedCourseIds(course, originalId) {
  const db = getDb();
  if (!course) return [originalId].filter(Boolean);

  const cacheKey = `relatedIds:${course._id || course.id || originalId}:${originalId || ''}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const relatedIds = new Set([
    String(course.id || ''),
    String(course._id || ''),
    originalId
  ].filter(Boolean));

  // 1. If this is a package, include its child courses
  if (course.courses && Array.isArray(course.courses)) {
    course.courses.forEach(id => relatedIds.add(String(id)));
  }

  const currentId = String(course.id || course._id || originalId);
  const names = [course.name, course.title].filter(Boolean);
  const allPossibleCollections = ['courses', 'packages', 'subcourses', 'testSeries', 'test-series', 'test_series'];

  const parentPackagesPromise = db.collection('packages').find({
    $or: [
      { courses: currentId },
      { courses: { $elemMatch: { $eq: currentId } } },
      { courses: { $in: [currentId] } }
    ]
  }).project({ _id: 1, id: 1 }).toArray().catch(() => []);

  const nameMatchPromises = names.length > 0
    ? allPossibleCollections.map((col) => {
        const escapedNames = names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        return db.collection(col).find({
          $or: [
            { name: { $in: names } },
            { title: { $in: names } },
            { name: { $regex: new RegExp("^" + escapedNames[0] + "$", "i") } },
            { title: { $regex: new RegExp("^" + escapedNames[0] + "$", "i") } }
          ],
          status: { $nin: ['inactive', 'deleted'] },
          isPublished: { $ne: false }
        }).project({ _id: 1, id: 1 }).toArray().catch(() => []);
      })
    : [];

  const [parentPackages, ...matchedArrays] = await Promise.all([
    parentPackagesPromise,
    ...nameMatchPromises
  ]);

  parentPackages.forEach(pkg => {
    if (pkg._id) relatedIds.add(pkg._id.toString());
    if (pkg.id) relatedIds.add(pkg.id.toString());
  });

  matchedArrays.forEach(matchedItems => {
    matchedItems.forEach(item => {
      if (item._id) relatedIds.add(item._id.toString());
      if (item.id) relatedIds.add(item.id.toString());
    });
  });

  const result = Array.from(relatedIds);
  setCache(cacheKey, result, 60);
  return result;
}

/**
 * Wrapper for easy variant retrieval
 */
export async function getCourseIdVariants(courseId) {
  if (!courseId) return [];
  const course = await findCourse(courseId);
  return getRelatedCourseIds(course, String(courseId));
}

/**
 * Build a MongoDB query matching purchases for a specific student AND course.
 */
export function buildStudentPurchaseQuery(student, courseIdVariants, statuses = ['completed', 'success', 'captured', 'paid']) {
  if (!student) return { _id: null };

  const studentIdStrings = [...new Set([String(student._id || ''), student.id, student.userId].filter(Boolean).map(String))];
  const studentObjectIds = student._id ? [student._id] : [];
  const courseIds = [...new Set((Array.isArray(courseIdVariants) ? courseIdVariants : [courseIdVariants]).filter(Boolean).map(String))];
  const courseObjectIds = courseIds.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id));

  if (courseIds.length === 0) return { _id: null };

  const studentOr = [
    ...(studentIdStrings.length ? [{ studentId: { $in: [...studentIdStrings, ...studentObjectIds] } }] : []),
    ...(student._id ? [{ studentMongoId: { $in: [String(student._id), student._id] } }] : []),
    ...(student.phone ? [{ studentPhone: student.phone }, { studentPhone: `+91${student.phone}` }] : [])
  ];

  if (studentOr.length === 0) return { _id: null };

  const allCourseTargets = [...courseIds, ...courseObjectIds];
  const query = {
    $and: [
      { $or: studentOr },
      {
        $or: [
          { courseId: { $in: allCourseTargets } },
          { courseMongoId: { $in: allCourseTargets } }
        ]
      }
    ]
  };

  if (Array.isArray(statuses) && statuses.length > 0) {
    query.status = { $in: statuses };
  }

  return query;
}

/**
 * Helper to sync Demo Video with Free Content
 */
export async function syncDemoVideoWithFreeContent(record, id) {
  const db = getDb();
  let finalId = id || record.id || record._id?.toString();
  try {
    if (!finalId) return;

    if (record.demoVideo) {
      const videoData = {
        title: `Demo: ${record.name || record.title || 'Course'}`,
        url: record.demoVideo,
        courseId: finalId,
        isFree: true,
        category: record.category || 'General',
        instructor: record.instructor || 'Institute Faculty',
        updatedAt: new Date().toISOString()
      };

      // Upsert into videos collection based on courseId and "Demo:" prefix
      await db.collection('videos').updateOne(
        { courseId: finalId, title: { $regex: /^Demo:/i } },
        { $set: videoData },
        { upsert: true }
      );
      console.log(`[DEMO-SYNC] Synced demo video for ${finalId}`);
    } else if (record.demoVideo === "") {
      // Explicitly removed
      await db.collection('videos').deleteMany({ courseId: finalId, title: { $regex: /^Demo:/i } });
    }
  } catch (err) {
    console.error(`[DEMO-SYNC ERROR] ${finalId}:`, err);
  }
}
