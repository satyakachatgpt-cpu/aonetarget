import mongoose from 'mongoose';
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
  const db = getDb();
  const collections = ['courses', 'packages', 'testSeries', 'test-series', 'subcourses', 'tests', 'test_series'];

  for (const colName of collections) {
    try {
      // Try custom id or slug first
      let item = await db.collection(colName).findOne({
        $or: [
          { id: id },
          { slug: id }
        ]
      });

      // Try _id as string or ObjectId
      if (!item) {
        item = await db.collection(colName).findOne({ _id: id });
      }
      if (!item && ObjectId.isValid(id)) {
        item = await db.collection(colName).findOne({ _id: new ObjectId(id) });
      }

      if (item) return { ...item, _collection: colName };
    } catch (e) {
      console.warn(`Search in ${colName} failed:`, e.message);
    }
  }

  return null;
}

/**
 * Function to find all related IDs by name and/or slug/id for content linking
 */
export async function getRelatedCourseIds(course, originalId) {
  const db = getDb();
  if (!course) return [originalId].filter(Boolean);

  const relatedIds = new Set([
    String(course.id || ''),
    String(course._id || ''),
    originalId
  ].filter(Boolean));

  // 1. If this is a package, include its child courses
  if (course.courses && Array.isArray(course.courses)) {
    course.courses.forEach(id => relatedIds.add(String(id)));
  }

  // 2. Identify if this course belongs to any packages
  try {
    const currentId = String(course.id || course._id || originalId);
    const parentPackages = await db.collection('packages').find({
      $or: [
        { courses: currentId },
        { courses: { $elemMatch: { $eq: currentId } } },
        { courses: { $in: [currentId] } }
      ]
    }).project({ _id: 1, id: 1 }).toArray();

    parentPackages.forEach(pkg => {
      if (pkg._id) relatedIds.add(pkg._id.toString());
      if (pkg.id) relatedIds.add(pkg.id.toString());
    });
  } catch (e) {
    console.warn('Failed to find parent packages:', e.message);
  }

  // 3. Also check names or titles for cross-collection linking
  const names = [course.name, course.title].filter(Boolean);
  if (names.length > 0) {
    const allPossibleCollections = ['courses', 'packages', 'subcourses', 'testSeries', 'test-series', 'test_series'];
    for (const col of allPossibleCollections) {
      try {
        const escapedNames = names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const matchedItems = await db.collection(col).find({
          $or: [
            { name: { $in: names } },
            { title: { $in: names } },
            { name: { $regex: new RegExp("^" + escapedNames[0] + "$", "i") } },
            { title: { $regex: new RegExp("^" + escapedNames[0] + "$", "i") } }
          ],
          status: { $nin: ['inactive', 'deleted'] },
          isPublished: { $ne: false }
        }).project({ _id: 1, id: 1 }).toArray();

        matchedItems.forEach(item => {
          if (item._id) relatedIds.add(item._id.toString());
          if (item.id) relatedIds.add(item.id.toString());
        });
      } catch (e) { }
    }
  }

  return Array.from(relatedIds);
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
