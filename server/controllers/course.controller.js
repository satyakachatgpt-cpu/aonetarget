import mongoose from 'mongoose';
const { ObjectId } = mongoose.Types;
import Course from '../models/Course.js';
import Video from '../models/Video.js';
import { findCourse, getRelatedCourseIds, syncDemoVideoWithFreeContent } from '../services/course.service.js';
import { db } from '../config/db.js';

/**
 * Get all courses with optional filters and pagination
 */
export const getCourses = async (req, res) => {
  try {
    const filter = {};
    const { 
      examType, contentType, subject, boardType, 
      categoryId, subcategoryId, category, search,
      limit, skip, page = 1 
    } = req.query;

    if (examType) filter.examType = examType;
    if (contentType) filter.contentType = contentType;
    if (subject) filter.subject = subject;
    if (boardType) filter.boardType = boardType;
    if (categoryId) filter.categoryId = categoryId;
    if (subcategoryId) filter.subcategoryId = subcategoryId;
    if (category) filter.category = { $regex: category, $options: 'i' };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } }
      ];
    }

    const nLimit = parseInt(limit);
    const nSkip = parseInt(skip);
    const nPage = parseInt(page);

    let computedSkip = 0;
    if (!isNaN(nSkip)) {
      computedSkip = nSkip;
    } else if (!isNaN(nLimit)) {
      computedSkip = (nPage - 1) * nLimit;
    }

    const aggregation = [
      { $match: filter },
      {
        $addFields: {
          id: { $ifNull: ['$id', { $toString: '$_id' }] }
        }
      },
      {
        $lookup: {
          from: 'videos',
          let: { cId: '$id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $ne: ['$$cId', ''] },
                    { $ne: ['$$cId', null] },
                    { $eq: ['$courseId', '$$cId'] }
                  ]
                }
              }
            },
            { $count: 'count' }
          ],
          as: 'videoCount'
        }
      },
      {
        $lookup: {
          from: 'testSeries',
          let: { cId: '$id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $ne: ['$$cId', ''] },
                    { $ne: ['$$cId', null] },
                    {
                      $or: [
                        { $eq: ['$courseId', '$$cId'] },
                        { $in: ['$$cId', { $ifNull: ['$courseIds', []] }] }
                      ]
                    }
                  ]
                }
              }
            },
            { $project: { _id: 1, id: 1 } }
          ],
          as: 'linkedSeriesColl'
        }
      },
      {
        $lookup: {
          from: 'tests',
          let: { cId: '$id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$isSeries', true] },
                    { $ne: ['$$cId', ''] },
                    { $ne: ['$$cId', null] },
                    {
                      $or: [
                        { $eq: ['$courseId', '$$cId'] },
                        { $in: ['$$cId', { $ifNull: ['$courseIds', []] }] }
                      ]
                    }
                  ]
                }
              }
            },
            { $project: { _id: 1, id: 1 } }
          ],
          as: 'linkedSeriesTests'
        }
      },
      {
        $addFields: {
          lessons: { $ifNull: [{ $arrayElemAt: ['$videoCount.count', 0] }, 0] },
          videoCount: { $ifNull: [{ $arrayElemAt: ['$videoCount.count', 0] }, 0] },
          directSeries: { $ifNull: ['$content.testSeries', []] },
          reverseSeries1: { $map: { 
            input: '$linkedSeriesColl', 
            as: 'ls', 
            in: { $ifNull: ['$$ls.id', { $toString: '$$ls._id' }] } 
          }},
          reverseSeries2: { $map: { 
            input: '$linkedSeriesTests', 
            as: 'ls', 
            in: { $ifNull: ['$$ls.id', { $toString: '$$ls._id' }] } 
          }}
        }
      },
      {
        $addFields: {
          allTsIds: {
            $filter: {
              input: { $setUnion: ['$directSeries', '$reverseSeries1', '$reverseSeries2'] },
              as: "tid",
              cond: { $and: [ { $ne: ["$$tid", ""] }, { $ne: ["$$tid", null] } ] }
            }
          }
        }
      },
      {
        $addFields: {
          tsCount: { $size: { $ifNull: ['$allTsIds', []] } },
          sortOrder: {
            $cond: {
              if: { $or: [{ $eq: ['$settings.sortingOrder', 0] }, { $not: ['$settings.sortingOrder'] }] },
              then: 1000,
              else: '$settings.sortingOrder'
            }
          }
        }
      },
      {
        $project: {
          videoCount: 0,
          longDescription: 0,
          syllabus: 0,
          curriculum: 0,
          allTsIds: 0,
          directSeries: 0,
          reverseSeries1: 0,
          reverseSeries2: 0,
          linkedSeriesColl: 0,
          linkedSeriesTests: 0
        }
      },
      { $sort: { sortOrder: 1, createdAt: -1 } }
    ];

    if (!isNaN(nLimit) && nLimit > 0) {
      const totalCourses = await db.collection('courses').countDocuments(filter);
      const coursesWithCounts = await db.collection('courses').aggregate([
        ...aggregation,
        { $skip: computedSkip },
        { $limit: nLimit }
      ]).toArray();

      res.setHeader('X-Total-Count', totalCourses);
      res.setHeader('X-Page', nPage);
      res.setHeader('X-Limit', nLimit);
      res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count, X-Page, X-Limit');

      res.json(coursesWithCounts);
    } else {
      const coursesWithCounts = await db.collection('courses').aggregate(aggregation).toArray();
      res.json(coursesWithCounts);
    }
  } catch (error) {
    console.error('[COURSE CONTROLLER] Get Courses Error:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
};

/**
 * Create a new course
 */
export const createCourse = async (req, res) => {
  try {
    const courseData = req.body;
    if (courseData.settings && typeof courseData.settings.sortingOrder === 'string') {
      courseData.settings.sortingOrder = parseFloat(courseData.settings.sortingOrder) || 9999;
    }
    const course = new Course(courseData);
    await course.save();

    // Sync Demo Video (Helper needed if used)
    // if (course.demoVideo) { await syncDemoVideoWithFreeContent(course, course._id.toString()); }

    res.status(201).json(course);
  } catch (error) {
    console.error('[COURSE CONTROLLER] Create Course Error:', error);
    res.status(500).json({ error: 'Failed to create course: ' + error.message });
  }
};

/**
 * Bulk update courses
 */
export const bulkUpdateCourses = async (req, res) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates)) return res.status(400).json({ error: 'Updates must be an array' });

    for (const update of updates) {
      const { id, ...data } = update;
      const { _id, ...updateData } = data;
      let filter = { id: id };
      if (ObjectId.isValid(id)) filter = { _id: new ObjectId(id) };
      await db.collection('courses').updateOne(
        filter,
        { $set: { ...updateData, updatedAt: new Date().toISOString() } }
      );
    }
    res.json({ success: true, message: `Updated ${updates.length} courses` });
  } catch (error) {
    console.error('[COURSE CONTROLLER] Bulk Update Error:', error);
    res.status(500).json({ error: 'Failed to bulk update courses' });
  }
};

/**
 * Delete all courses (Warning: High impact)
 */
export const deleteAllCourses = async (req, res) => {
  try {
    const result = await db.collection('courses').deleteMany({});
    res.json({ success: true, message: `Deleted ${result.deletedCount} courses` });
  } catch (error) {
    console.error('[COURSE CONTROLLER] Delete All Error:', error);
    res.status(500).json({ error: 'Failed to delete courses' });
  }
};

/**
 * Get single course/package by ID
 */
export const getCourseById = async (req, res) => {
  try {
    const course = await findCourse(req.params.id);
    if (course) {
      const relatedIds = await getRelatedCourseIds(course, req.params.id);
      res.json({
        ...course,
        id: course.id || course._id.toString(),
        relatedIds: relatedIds
      });
    } else {
      res.status(404).json({ error: 'Course not found' });
    }
  } catch (error) {
    console.error('[COURSE CONTROLLER] Get Course By ID Error:', error);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
};

/**
 * Update single course or package
 */
export const updateCourse = async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const id = req.params.id;

    if (updateData.settings && typeof updateData.settings.sortingOrder === 'string') {
      updateData.settings.sortingOrder = parseFloat(updateData.settings.sortingOrder) || 9999;
    }

    // Try finding in both collections with all variants
    let record = await db.collection('courses').findOne({ $or: [{ id: id }, { _id: id }] });
    let targetCollection = 'courses';

    if (!record && ObjectId.isValid(id)) {
      record = await db.collection('courses').findOne({ _id: new ObjectId(id) });
    }

    if (!record) {
      record = await db.collection('packages').findOne({ $or: [{ id: id }, { _id: id }] });
      if (!record && ObjectId.isValid(id)) {
        record = await db.collection('packages').findOne({ _id: new ObjectId(id) });
      }
      if (record) targetCollection = 'packages';
    }

    if (!record) {
      return res.status(404).json({ error: 'Package/Course not found' });
    }

    const finalUpdate = { ...updateData, updatedAt: new Date().toISOString() };
    if (updateData.settings && record.settings) {
      finalUpdate.settings = { ...record.settings, ...updateData.settings };
    }
    if (updateData.content && record.content) {
      finalUpdate.content = { ...record.content, ...updateData.content };
    }

    await db.collection(targetCollection).updateOne(
      { _id: record._id },
      { $set: finalUpdate }
    );

    // Sync Demo Video
    if (finalUpdate.demoVideo !== undefined) {
      const fullRecord = { ...record, ...finalUpdate };
      await syncDemoVideoWithFreeContent(fullRecord, record._id.toString());
    }

    res.json({ success: true, message: 'Updated successfully', collection: targetCollection });
  } catch (error) {
    console.error(`[COURSE CONTROLLER] Update Course Error:`, error);
    res.status(500).json({ error: 'Failed to update course', details: error.message });
  }
};

/**
 * Delete single course or package
 */
export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    let filter = { id: id };
    if (ObjectId.isValid(id)) filter = { _id: new ObjectId(id) };

    let result = await db.collection('courses').deleteOne(filter);
    if (result.deletedCount === 0) {
      result = await db.collection('packages').deleteOne(filter);
    }
    
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Course not found' });
    res.json({ success: true, message: 'Course/Package deleted' });
  } catch (error) {
    console.error('[COURSE CONTROLLER] Delete Error:', error);
    res.status(500).json({ error: 'Failed to delete course' });
  }
};

/**
 * GET /api/courses/:id/tests  (student-facing)
 *
 * Returns active, non-series tests for a student's course page.
 * Uses richer filtering than the admin version:
 *   - Resolves all related course ID variants via getRelatedCourseIds
 *   - Excludes test-series container documents (isSeries: true)
 *   - Filters for active status only
 *   - Includes tests from explicitly attached test-series by name/title
 *
 * IMPORTANT: This is NOT interchangeable with getCourseTests in test.controller.js.
 * That handler serves the admin panel with a simpler query + question counts.
 * This handler serves the student frontend with richer filtering.
 */
export const getStudentCourseTests = async (req, res) => {
  try {
    const course = await findCourse(req.params.id);
    if (!course) return res.json([]);

    const idVariants = await getRelatedCourseIds(course, req.params.id);

    // Initial query to find tests directly associated with this course
    let query = {
      $or: [
        { courseId: { $in: idVariants } },
        { testSeriesId: { $in: idVariants } }
      ],
      isSeries: { $ne: true }, // Filter out Test Series containers
      $and: [{ $or: [{ status: 'active' }, { status: { $exists: false } }] }]
    };

    // Include tests from explicitly attached test series
    if (course.content && Array.isArray(course.content.testSeries) && course.content.testSeries.length > 0) {
      const attachedSeries = await db.collection('tests').find({
        $or: [
          { name: { $in: course.content.testSeries } },
          { title: { $in: course.content.testSeries } },
          { seriesName: { $in: course.content.testSeries } }
        ],
        isSeries: true
      }).toArray();

      const attachedSeriesIds = attachedSeries.map(s => String(s.id || s._id || ''));
      if (attachedSeriesIds.length > 0) {
        query.$or.push({ testSeriesId: { $in: attachedSeriesIds } });
      }
    }

    const tests = await db.collection('tests').find(query).toArray();

    res.json(tests);
  } catch (error) {
    console.error('Error fetching course tests:', error);
    res.status(500).json({ error: 'Failed to fetch course tests' });
  }
};
