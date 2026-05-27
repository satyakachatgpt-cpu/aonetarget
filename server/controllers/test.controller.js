import mongoose from 'mongoose';
const { ObjectId } = mongoose.Types;
import { db } from '../config/db.js';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';
import { findCourse, getRelatedCourseIds } from '../services/course.service.js';
import { isPurchaseExpired, isTestExpired } from '../utils/helpers.js';

/**
 * MCQ Framework - Test Management Controller
 */

// GET /api/tests
// GET /api/tests
export const reorderTests = async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ error: 'orderedIds must be a non-empty array' });
    }

    const total = orderedIds.length;
    const bulkOps = orderedIds.map((id, index) => {
      if (!ObjectId.isValid(id)) return null;
      return {
        updateOne: {
          // Match by _id primarily. We include isSeries: true only if we want strict enforcement,
          // but some legacy items might be missing it. The frontend ensures these are series.
          filter: { _id: new ObjectId(id) }, 
          update: { 
            $set: { 
              sortBy: total - index,
              sortingOrder: total - index,
              updatedAt: new Date().toISOString()
            } 
          }
        }
      };
    }).filter(Boolean);

    if (bulkOps.length === 0) {
      return res.status(400).json({ error: 'No valid ObjectIds provided' });
    }

    const result = await db.collection('tests').bulkWrite(bulkOps);

    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'No matching tests found for provided IDs',
        matchedCount: 0 
      });
    }

    res.json({
      success: true,
      message: 'Tests reordered successfully',
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      orderedCount: orderedIds.length
    });
  } catch (error) {
    console.error('Reorder tests error:', error);
    res.status(500).json({ error: 'Failed to reorder tests', details: error.message });
  }
};

/**
 * Scoped reorder for inner tests within a specific series
 * PATCH /api/tests/series/:seriesId/reorder-tests
 */
export const reorderSeriesTests = async (req, res) => {
  try {
    const { seriesId } = req.params;
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ error: 'orderedIds must be a non-empty array' });
    }

    // 1. Resolve parent series variants for strict scoping
    const series = await findCourse(seriesId);
    if (!series) {
      return res.status(404).json({ error: 'Parent series not found' });
    }
    
    // Only use IDs that directly identify THIS series (not its parent course)
    const variants = [
      series._id,
      String(series._id),
      series.id,
      series.slug
    ].filter(Boolean);

    // Add ObjectId variant for database compatibility if series.id is a valid ObjectId string
    if (series.id && ObjectId.isValid(series.id) && !variants.includes(new ObjectId(series.id))) {
      variants.push(new ObjectId(series.id));
    }

    // 2. Prepare bulk update operations
    const total = orderedIds.length;
    const bulkOps = orderedIds.map((id, index) => {
      const filter = {
        $or: [
          { testSeriesId: { $in: variants } },
          { seriesId: { $in: variants } },
          { courseId: { $in: variants } },
          { courseIds: { $in: variants } },
          { testSeries: { $in: variants } }
        ]
      };

      if (ObjectId.isValid(id)) {
        filter._id = new ObjectId(id);
      } else {
        filter.id = id;
      }

      return {
        updateOne: {
          filter,
          update: { 
            $set: { 
              sortBy: total - index,
              sortingOrder: total - index,
              updatedAt: new Date().toISOString()
            } 
          }
        }
      };
    });

    const result = await db.collection('tests').bulkWrite(bulkOps);

    if (result.matchedCount !== orderedIds.length) {
      console.warn(`Reorder mismatch for series ${seriesId}: Received ${orderedIds.length}, matched only ${result.matchedCount}`);
      return res.status(403).json({ 
        error: 'Access denied: Some tests were not found or do not belong to this series',
        matchedCount: result.matchedCount,
        expectedCount: orderedIds.length,
        seriesId: seriesId,
        checkedVariants: variants
      });
    }

    res.json({
      success: true,
      message: 'Inner tests reordered successfully',
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      orderedCount: orderedIds.length
    });
  } catch (error) {
    console.error('Reorder series tests error:', error);
    res.status(500).json({ error: 'Failed to reorder series tests', details: error.message });
  }
};

export const getAllTests = async (req, res, next) => {
  try {
    const startTimeMetric = Date.now();
    const courseId = req.query.courseId ? String(req.query.courseId) : undefined;
    const seriesId = req.query.seriesId ? String(req.query.seriesId) : undefined;
    const testType = req.query.testType ? String(req.query.testType) : undefined;

    let matchConditions = [];

    // Robust ID/Series matching
    const searchId = seriesId || courseId;
    if (searchId) {
      // Find all variants of this ID (custom id, ObjectId string, slug, name matches)
      const variants = await getRelatedCourseIds(await findCourse(searchId), searchId);
      
      const idConditions = [
        { testSeriesId: { $in: variants } },
        { seriesId: { $in: variants } },
        { courseId: { $in: variants } },
        { course: { $in: variants } },
        // Direct string match fallback (useful if searchId is a name/title)
        { testSeriesId: searchId },
        { seriesName: searchId },
        { series: searchId }
      ];

      // Add ObjectId variants for database compatibility
      const objectIdVariants = variants
        .filter(v => mongoose.Types.ObjectId.isValid(v))
        .map(v => new mongoose.Types.ObjectId(v));
      
      if (objectIdVariants.length > 0) {
        idConditions.push({ testSeriesId: { $in: objectIdVariants } });
        idConditions.push({ seriesId: { $in: objectIdVariants } });
        idConditions.push({ courseId: { $in: objectIdVariants } });
        idConditions.push({ course: { $in: objectIdVariants } });
      }

      // If we are specifically filtering by series, exclude the series container record itself
      if (seriesId) {
        matchConditions.push({ isSeries: { $ne: true } });
      }

      matchConditions.push({ $or: idConditions });
    }

    // Support testType filtering (standard vs omr vs pdf)
    if (testType) {
      if (testType.toLowerCase() === 'omr') {
        matchConditions.push({ $or: [{ testType: 'OMR' }, { type: 'OMR' }] });
      } else if (testType.toLowerCase() === 'standard') {
        matchConditions.push({
          $and: [
            { testType: { $ne: 'OMR' } },
            { type: { $ne: 'OMR' } }
          ]
        });
      } else {
        matchConditions.push({ type: testType });
      }
    }

    const matchStage = matchConditions.length > 0 ? { $and: matchConditions } : {};

    const pageNum = parseInt(req.query.page);
    const limitNum = parseInt(req.query.limit);

    let testsQuery = db.collection('tests').find(matchStage).sort({ sortBy: -1, createdAt: -1, _id: -1 });

    if (!isNaN(pageNum) && !isNaN(limitNum) && limitNum > 0) {
      const totalTests = await db.collection('tests').countDocuments(matchStage);
      const skip = (pageNum - 1) * limitNum;
      testsQuery = testsQuery.skip(skip).limit(limitNum);
      
      res.setHeader('X-Total-Count', totalTests);
      res.setHeader('X-Page', pageNum);
      res.setHeader('X-Limit', limitNum);
      res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count, X-Page, X-Limit');
    }

    const tests = await testsQuery.toArray();

    // Batch fetch questions count (N+1 Fix)
    const testIdsForCount = [];
    tests.forEach(test => {
      const testId = test.id ? String(test.id) : null;
      const testObjectId = test._id ? test._id.toString() : null;
      if (testId) {
        testIdsForCount.push(testId);
        if (!isNaN(testId)) testIdsForCount.push(Number(testId));
        testIdsForCount.push(`test_${testId}`);
      }
      if (testObjectId && testObjectId !== testId) {
        testIdsForCount.push(testObjectId);
        if (ObjectId.isValid(testObjectId)) testIdsForCount.push(new ObjectId(testObjectId));
        testIdsForCount.push(`test_${testObjectId}`);
      }
    });

    let testsWithCounts = tests;
    if (testIdsForCount.length > 0) {
      const countQuery = { $or: [{ testId: { $in: testIdsForCount } }] };
      const questionCounts = await db.collection('questions').aggregate([
        { $match: countQuery },
        { $group: { _id: "$testId", count: { $sum: 1 } } }
      ]).toArray();

      const countMap = {};
      questionCounts.forEach(c => {
        const key = c._id ? c._id.toString() : '';
        countMap[key] = (countMap[key] || 0) + c.count;
      });

      testsWithCounts = tests.map(test => {
        const testId = test.id ? String(test.id) : null;
        const testObjectId = test._id ? test._id.toString() : null;

        let qCount = 0;
        const keysToCheck = [
          testId,
          testId && !isNaN(testId) ? Number(testId).toString() : null,
          `test_${testId}`,
          testObjectId,
          `test_${testObjectId}`
        ].filter(Boolean);

        [...new Set(keysToCheck)].forEach(k => {
          if (countMap[k]) qCount += countMap[k];
        });

        return {
          ...test,
          id: testId || testObjectId,
          questions: qCount || (Array.isArray(test.questions) ? test.questions.length : (test.questions || 0)),
          isExpired: isTestExpired(test)
        };
      });
    }

    // Sort tests by sortingOrder / sortBy (Descending by default as requested: higher number = rank higher)
    testsWithCounts.sort((a, b) => {
      const sortA = parseFloat(a.sortingOrder || a.sortBy || 0) || 0;
      const sortB = parseFloat(b.sortingOrder || b.sortBy || 0) || 0;
      if (sortB !== sortA) return sortB - sortA;
      
      const dateA = new Date(a.createdAt || a.openDate || a.date || 0).getTime();
      const dateB = new Date(b.createdAt || b.openDate || b.date || 0).getTime();
      return dateB - dateA;
    });

    console.log(`[PERF] Admin /api/tests loaded with counts in ${Date.now() - startTimeMetric}ms`);
    res.json(testsWithCounts);
  } catch (error) {
    return next(error);
  }
};

// GET /api/tests/:id
export const getTestById = async (req, res) => {
  try {
    const id = req.params.id;
    const orConditions = [
      { id: id },
      { id: !isNaN(id) ? Number(id) : null },
      { _id: id }
    ].filter(v => v.id !== null && v.id !== undefined || v._id !== null && v._id !== undefined);

    if (ObjectId.isValid(id)) {
      orConditions.push({ _id: new ObjectId(id) });
    }

    let test = await db.collection('tests').findOne({ $or: orConditions });

    if (test) {
      // Security Check: Enrollment & Expiry Validation for Students
      const isAdmin = req.admin || req.user?.isAdmin || req.user?.role === 'admin';
      const seriesId = test.courseId || test.testSeriesId || test.seriesId || test.batchId || (Array.isArray(test.courseIds) ? test.courseIds[0] : null);
      
      // 1. RESOLVE FREE STATUS IMMEDIATELY
      const isFreeTest = test.free || test.isFree;
      let isSeriesFree = false;
      let parentSeries = null;
      if (seriesId) {
        parentSeries = await findCourse(seriesId);
        isSeriesFree = parentSeries && (!parentSeries.price || Number(parentSeries.price) === 0 || parentSeries.isFree || parentSeries.free);
      }

      // 2. GRANT ACCESS IF ADMIN OR FREE
      if (isAdmin || isFreeTest || isSeriesFree) {
        console.log(`[getTestById] Access granted to test ${id} (Admin: ${isAdmin}, Free: ${isFreeTest || isSeriesFree})`);
        // We will skip enrollment check for free/admin
      } else {
        // 3. PAID CONTENT: MUST BE AUTHENTICATED AND ENROLLED
        const studentId = req.user?.studentId;
        
        if (!studentId || !seriesId) {
          console.warn(`[getTestById] Access Denied - Missing studentId (${studentId}) or seriesId (${seriesId}) for paid content`);
          return res.status(403).json({ error: 'Enrollment required to access this test', code: 'ENROLLMENT_REQUIRED' });
        }

        // Fetch Student with all possible ID variants
        const student = await db.collection('students').findOne({
          $or: [
            { id: studentId.toString() },
            { userId: studentId.toString() },
            { _id: ObjectId.isValid(studentId) ? new ObjectId(studentId) : null }
          ].filter(v => v.id || v.userId || v._id)
        });

        // Check multiple sources of truth for enrollment
        let isEnrolled = false;
        
        // Source A: Student document's enrolledCourses array
        if (student?.enrolledCourses?.some(sid => String(sid) === String(seriesId))) {
          isEnrolled = true;
        }

        // Source B: Enrollments collection
        if (!isEnrolled) {
          const enrollmentRecord = await db.collection('enrollments').findOne({
            studentId: studentId.toString(),
            $or: [
              { courseId: seriesId.toString() },
              { testSeriesId: seriesId.toString() }
            ]
          });
          if (enrollmentRecord) isEnrolled = true;
        }

        // Source C: Purchases collection
        if (!isEnrolled) {
          const purchase = await db.collection('purchases').findOne({
            studentId: studentId.toString(),
            courseId: seriesId.toString(),
            status: 'completed'
          });
          if (purchase) isEnrolled = true;
        }

        if (!isEnrolled) {
          console.warn(`[getTestById] Access Denied - No enrollment found for student ${studentId} in paid series ${seriesId}`);
          return res.status(403).json({ error: 'Enrollment required to access this test', code: 'ENROLLMENT_REQUIRED' });
        }

        // 4. Check for expiry if enrolled in paid content
        const course = parentSeries || await findCourse(seriesId);
        let purchase = await db.collection('purchases').findOne({
          studentId: studentId.toString(),
          courseId: seriesId.toString(),
          status: 'completed'
        }, { sort: { createdAt: -1 } });

        // Support Manual Enrollment Expiry
        if (!purchase && student) {
          purchase = { createdAt: student.admission?.admissionDate || student.createdAt || new Date() };
        }

        if (course && purchase && isPurchaseExpired(purchase, course)) {
          console.warn(`[getTestById] Access Denied - Enrollment expired for student ${studentId}`);
          return res.status(403).json({ error: 'Your access to this test series has expired', code: 'EXPIRED' });
        }
      }

        // 5. Final check for test-specific timing (Shared by free and paid)
        if (isTestExpired(test)) {
          console.warn(`[getTestById] Access Denied - Individual test ${id} has expired`);
          return res.status(403).json({ error: 'This test has expired and is no longer available.', code: 'TEST_EXPIRED' });
        }
      }

      if (!test) {
      const questionCount = await db.collection('questions').countDocuments({
        $or: [{ testId: id }, { testId: !isNaN(id) ? Number(id) : id }]
      });
      if (questionCount > 0) {
        test = {
          id,
          name: `Unregistered Test ${id}`,
          questions: [],
          temp: true
        };
      } else {
        return res.status(404).json({ error: 'Test not found' });
      }
    }

    const testIdStr = test.id ? String(test.id) : test._id?.toString();
    const questionFilter = {
      $or: [
        { testId: id },
        { testId: testIdStr },
        { testId: String(id) },
        { testId: "test_" + id },
        { testId: "test_" + testIdStr }
      ]
    };

    if (!isNaN(id)) questionFilter.$or.push({ testId: Number(id) });
    if (testIdStr && !isNaN(testIdStr)) questionFilter.$or.push({ testId: Number(testIdStr) });
    if (ObjectId.isValid(id)) questionFilter.$or.push({ testId: new ObjectId(id) });
    if (test._id && ObjectId.isValid(test._id.toString())) {
      questionFilter.$or.push({ testId: new ObjectId(test._id.toString()) });
    }



    const separateQuestions = await db.collection('questions').find(questionFilter).sort({ orderIndex: 1, id: 1 }).toArray();
    const embeddedQuestions = Array.isArray(test.questions) ? test.questions : [];
    
    console.log(`[getTestById] Found ${separateQuestions.length} separate questions and ${embeddedQuestions.length} embedded questions`);
    
    const questions = separateQuestions.length > 0 ? separateQuestions : embeddedQuestions;
    
    // AUTO-ASSIGN sectionId based on test sections + maxQuestions
    const testSections = Array.isArray(test.sections) ? test.sections : [];
    const hasValidSections = testSections.some(s => 
      s.maxQuestions && parseInt(s.maxQuestions) > 0
    );

    if (hasValidSections && questions.some(q => !q.sectionId)) {
      console.log('[SECTION-DEBUG] test.sections:', JSON.stringify(test.sections));
      console.log('[SECTION-DEBUG] total questions:', questions.length);
      console.log('[SECTION-DEBUG] hasValidSections:', hasValidSections);
      console.log('[SECTION-DEBUG] first question sectionId before:', questions[0]?.sectionId);

      let pointer = 0;
      for (const sec of testSections) {
        const count = parseInt(sec.maxQuestions) || 0;
        if (count <= 0) continue;
        for (let i = pointer; i < pointer + count && i < questions.length; i++) {
          if (!questions[i].sectionId) {
            questions[i] = { 
              ...questions[i], 
              sectionId: sec.id?.toString() 
            };
          }
        }
        pointer += count;
      }

      console.log('[SECTION-DEBUG] first question sectionId after:', questions[0]?.sectionId);
      console.log('[SECTION-DEBUG] section counts:', 
        test.sections?.map(sec => ({
          name: sec.section || sec.partTitle,
          id: sec.id,
          maxQ: sec.maxQuestions,
          assigned: questions.filter(q => 
            String(q.sectionId) === String(sec.id)
          ).length
        }))
      );
    }
    
    // Strip sensitive fields for students to prevent cheating via DevTools
    const isAdmin = req.admin || req.user?.isAdmin || req.user?.role === 'admin';
    const safeQuestions = isAdmin ? questions : questions.map(q => {
      // Strip top-level sensitive fields
      const { 
        correctAnswer, correct_answer, explanation, answer, solution, 
        fullSolution, questionSolution, detailed_solution, ...safeQ 
      } = q;
      
      // Strip isCorrect/correct from displayOptions array
      if (Array.isArray(safeQ.displayOptions)) {
        safeQ.displayOptions = safeQ.displayOptions.map(opt => {
          const { isCorrect, correct, is_correct, ...safeOpt } = opt;
          return safeOpt;
        });
      }
      
      // Strip isCorrect/correct from options array
      if (Array.isArray(safeQ.options)) {
        safeQ.options = safeQ.options.map(opt => {
          const { isCorrect, correct, is_correct, ...safeOpt } = opt;
          return safeOpt;
        });
      }

      return safeQ;
    });


    res.json({ ...test, questions: safeQuestions, isExpired: isTestExpired(test) });
  } catch (error) {
    console.error('Error fetching test:', error);
    res.status(500).json({ error: 'Failed to fetch test' });
  }
};

// POST /api/tests
export const createTest = async (req, res, next) => {
  try {
    console.log('POST /api/tests - Received test data:', req.body);
    const result = await db.collection('tests').insertOne(req.body);
    console.log('Test created successfully with ID:', result.insertedId);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    return next(error);
  }
};

// PUT /api/tests/:id
export const updateTest = async (req, res) => {
  try {
    const id = req.params.id;
    const orConditions = [
      { id: id },
      { id: !isNaN(id) ? Number(id) : null },
      { _id: id },
      { _id: ObjectId.isValid(id) ? new ObjectId(id) : null }
    ].filter(v => v.id !== null && v.id !== undefined || v._id !== null && v._id !== undefined);
    
    const query = { $or: orConditions };
    const { _id, ...updateData } = req.body;
    
    const result = await db.collection('tests').updateOne(
      query, 
      { $set: { ...updateData, updatedAt: new Date().toISOString() } }, 
      { upsert: true }
    );
    
    res.json({ success: true, message: result.upsertedCount > 0 ? 'Test created' : 'Test updated' });
  } catch (error) {
    console.error('Error updating test:', error);
    res.status(500).json({ error: 'Failed to update test' });
  }
};

// DELETE /api/tests/:id
export const deleteTest = async (req, res) => {
  try {
    const id = req.params.id;
    const orConditions = [
      { id: id },
      { id: !isNaN(id) ? Number(id) : null },
      { _id: id },
      { _id: ObjectId.isValid(id) ? new ObjectId(id) : null }
    ].filter(v => v.id !== null && v.id !== undefined || v._id !== null && v._id !== undefined);
    
    const query = { $or: orConditions };
    const result = await db.collection('tests').deleteOne(query);
    
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Test not found' });
    res.json({ success: true, message: 'Test deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete test' });
  }
};

// POST /api/tests/:id/duplicate
export const duplicateTest = async (req, res) => {
  try {
    const id = req.params.id;
    const orConditions = [
      { id: id },
      { id: !isNaN(id) ? Number(id) : null },
      { _id: id }
    ].filter(v => v.id !== null && v.id !== undefined || v._id !== null && v._id !== undefined);
    if (ObjectId.isValid(id)) orConditions.push({ _id: new ObjectId(id) });

    const test = await db.collection('tests').findOne({ $or: orConditions });
    if (!test) return res.status(404).json({ error: 'Test not found' });

    const { _id, id: oldId, ...duplicateData } = test;
    duplicateData.name = `${test.name || test.title || 'Test'} Copy`;
    duplicateData.id = `test_${Date.now()}`;
    duplicateData.createdAt = new Date();
    duplicateData.updatedAt = new Date();
    duplicateData.status = 'draft';

    const result = await db.collection('tests').insertOne(duplicateData);

    const testIdForQuestions = test.id || test._id.toString();
    const questionFilter = { $or: [{ testId: id }, { testId: testIdForQuestions }] };
    if (!isNaN(id)) questionFilter.$or.push({ testId: Number(id) });
    const questions = await db.collection('questions').find(questionFilter).toArray();

    if (questions.length > 0) {
      const newQuestions = questions.map(({ _id, ...q }) => ({
        ...q,
        testId: duplicateData.id,
        createdAt: new Date()
      }));
      await db.collection('questions').insertMany(newQuestions);
    }

    res.status(201).json({ _id: result.insertedId, ...duplicateData });
  } catch (error) {
    console.error('Duplicate error:', error);
    res.status(500).json({ error: 'Failed to duplicate test' });
  }
};

// DELETE /api/tests
export const deleteAllTests = async (req, res) => {
  try {
    const result = await db.collection('tests').deleteMany({});
    res.json({ success: true, message: `Deleted ${result.deletedCount} tests` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete all tests' });
  }
};

// POST /api/tests/bulk
export const bulkCreateTests = async (req, res) => {
  try {
    const { tests } = req.body;
    if (!Array.isArray(tests) || tests.length === 0) return res.status(400).json({ error: 'No tests provided' });
    const result = await db.collection('tests').insertMany(tests);
    res.status(201).json({ success: true, inserted: result.insertedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk create tests' });
  }
};

// PUT /api/tests/update-all
export const updateAllTests = async (req, res) => {
  try {
    const updates = (req.body && req.body.updates) ? req.body.updates : (Array.isArray(req.body) ? req.body : []);
    for (const update of updates) {
      const { id, _id, ...data } = update;
      if (id) await db.collection('tests').updateOne({ id }, { $set: data });
    }
    res.json({ success: true, message: 'Tests updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update tests' });
  }
};

// GET /api/tests/:id/export
export const exportTestToFile = async (req, res) => {
  try {
    const id = req.params.id;
    const { solution } = req.query;
    const orConditions = [
      { id: id },
      { id: !isNaN(id) ? Number(id) : null },
      { _id: id }
    ].filter(v => v.id !== null && v.id !== undefined || v._id !== null && v._id !== undefined);
    if (ObjectId.isValid(id)) orConditions.push({ _id: new ObjectId(id) });

    const test = await db.collection('tests').findOne({ $or: orConditions });
    if (!test) return res.status(404).json({ error: 'Test not found' });

    const testIdForQuestions = test.id || test._id.toString();
    const questionFilter = { $or: [{ testId: id }, { testId: testIdForQuestions }] };
    if (!isNaN(id)) questionFilter.$or.push({ testId: Number(id) });
    const questions = await db.collection('questions').find(questionFilter).toArray();

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: test.name || test.title || 'Test',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          ...questions.flatMap((q, i) => [
            new Paragraph({
              children: [
                new TextRun({ text: `Q${i + 1}. ${q.question}`, bold: true }),
              ],
              spacing: { before: 200 },
            }),
            new Paragraph({ text: `A) ${q.optionA}` }),
            new Paragraph({ text: `B) ${q.optionB}` }),
            new Paragraph({ text: `C) ${q.optionC}` }),
            new Paragraph({ text: `D) ${q.optionD}` }),
            ...(solution === 'true' ? [
              new Paragraph({
                children: [
                  new TextRun({ text: `Correct Answer: ${q.correctAnswer}`, color: '008000', bold: true }),
                ],
              }),
              new Paragraph({ text: `Explanation: ${q.explanation || 'None'}` }),
            ] : []),
          ]),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=${(test.name || 'test').replace(/\s+/g, '_')}.docx`);
    res.send(buffer);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export test' });
  }
};

// POST /api/tests/:testId/bulk-excel
export const bulkExcelImport = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
    
    let test = await db.collection('tests').findOne({ id: req.params.testId });
    if (!test && ObjectId.isValid(req.params.testId)) {
      test = await db.collection('tests').findOne({ _id: new ObjectId(req.params.testId) });
    }
    
    const existingQuestions = test ? (test.questions || []) : [];
    const testMarks = test ? (Number(test.marks) || 0) : 0;
    const newQuestions = jsonData.map((row, i) => {
      let providedMarks = (row.marks !== undefined && row.marks !== '') ? parseFloat(row.marks) : ((row.Marks !== undefined && row.Marks !== '') ? parseFloat(row.Marks) : undefined);
      let providedNeg = (row.negativeMarks !== undefined && row.negativeMarks !== '') ? parseFloat(row.negativeMarks) : ((row['Negative Marks'] !== undefined && row['Negative Marks'] !== '') ? parseFloat(row['Negative Marks']) : undefined);

      if ((providedMarks === undefined || isNaN(providedMarks)) && testMarks <= 0) {
         throw new Error(`Excel Import Blocked: Question ${i + 1} is missing marks, and Test has no default marks.`);
      }

      return {
        id: row.id || `q_${Date.now()}_${i}`,
        question: row.question || row.Question || '',
        optionA: row.optionA || row['Option A'] || '',
        optionB: row.optionB || row['Option B'] || '',
        optionC: row.optionC || row['Option C'] || '',
        optionD: row.optionD || row['Option D'] || '',
        correctAnswer: (row.correctAnswer || row['Correct Answer'] || 'A').toString().toUpperCase(),
        explanation: row.explanation || row.Explanation || '',
        marks: providedMarks,
        negativeMarks: providedNeg
      };
    });
    
    const allQuestions = [...existingQuestions, ...newQuestions];
    if (test) {
      await db.collection('tests').updateOne({ _id: test._id }, { $set: { questions: allQuestions } });
    }
    res.json({ success: true, added: newQuestions.length, total: allQuestions.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process Excel file: ' + error.message });
  }
};

// POST /api/tests/:testId/bulk-questions
export const bulkQuestionsImport = async (req, res) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'No questions provided' });
    }
    
    let test = await db.collection('tests').findOne({ id: req.params.testId });
    if (!test) {
      try { test = await db.collection('tests').findOne({ _id: new ObjectId(req.params.testId) }); } catch (e) { }
    }
    
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }
    
    const existingQuestions = test.questions || [];
    const testMarks = Number(test.marks) || 0;
    
    const newQuestions = questions.map((q, i) => {
      let providedMarks = q.marks !== undefined && q.marks !== '' ? parseFloat(q.marks) : undefined;
      let providedNeg = (q.negativeMarks !== undefined && q.negativeMarks !== '') ? parseFloat(q.negativeMarks) : ((q.negative_marks !== undefined && q.negative_marks !== '') ? parseFloat(q.negative_marks) : undefined);

      if ((providedMarks === undefined || isNaN(providedMarks)) && testMarks <= 0) {
         throw new Error(`Bulk Import Blocked: Question ${i + 1} is missing marks, and Test has no default marks.`);
      }

      return {
        id: `q_${Date.now()}_${i}`,
        question: q.question || '',
        optionA: q.optionA || q.option_a || '',
        optionB: q.optionB || q.option_b || '',
        optionC: q.optionC || q.option_c || '',
        optionD: q.optionD || q.option_d || '',
        correctAnswer: (q.correctAnswer || q.correct_answer || q.answer || 'A').toUpperCase(),
        explanation: q.explanation || '',
        marks: providedMarks,
        negativeMarks: providedNeg,
        questionImage: q.questionImage || '',
      };
    });
    
    const allQuestions = [...existingQuestions, ...newQuestions];
    await db.collection('tests').updateOne(
      { _id: test._id },
      { $set: { questions: allQuestions } }
    );
    res.json({ success: true, added: newQuestions.length, total: allQuestions.length });
  } catch (error) {
    console.error('Error bulk uploading questions:', error);
    res.status(500).json({ error: 'Failed to bulk upload questions' });
  }
};

// PATCH /api/tests/:id/publish
export const publishTest = async (req, res) => {
  const id = req.params.id;
  console.log(`[Publish] Starting publish for ID: ${id}`);
  try {
    const now = new Date();
    const formatted = now.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const orConditions = [{ id: id }];
    if (!isNaN(id)) orConditions.push({ id: Number(id) });
    if (ObjectId.isValid(id)) orConditions.push({ _id: new ObjectId(id) });
    orConditions.push({ _id: id });

    // Validation: Block incomplete tests
    const test = await db.collection('tests').findOne({ $or: orConditions });
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    const qFilter = { $or: [{ testId: id }, { testId: String(id) }] };
    if (!isNaN(id)) qFilter.$or.push({ testId: Number(id) });
    if (ObjectId.isValid(id)) qFilter.$or.push({ testId: new ObjectId(id) });
    
    const questions = await db.collection('questions').find(qFilter).toArray();
    
    const testMarks = test.marks || test.marksPerQuestion;
    const testDuration = test.duration || test.time;
    const testNegativeMarking = test.negativeMarking;
    const declaredCount = Number(test.noOfQuestions) || 0;
    const actualCount = questions.length;

    // VALIDATION: Strict Consistency Checks
    if (declaredCount > 0 && actualCount !== declaredCount) {
      return res.status(400).json({ 
        error: `Inconsistent Question Count! Test settings say ${declaredCount} questions, but ${actualCount} questions have been added. Please fix before publishing.` 
      });
    }

    if (!testDuration) {
      return res.status(400).json({ error: 'Test Duration (Timer) is missing. Set duration before publishing.' });
    }

    // CHECK: Every question must have marks (directly or via test-level default)
    const questionsWithoutMarks = questions.filter(q => 
      (q.marks === undefined || q.marks === null || q.marks === "") && 
      (q.positiveMarks === undefined || q.positiveMarks === null || q.positiveMarks === "") && 
      (test.marksPerQuestion === undefined || test.marksPerQuestion === null || test.marksPerQuestion === "")
    );

    if (questionsWithoutMarks.length > 0) {
      return res.status(400).json({ 
        error: `${questionsWithoutMarks.length} questions are missing marks, and no Test-level default (Marks Per Question) is set. Please specify marks for all questions.` 
      });
    }

    let hasError = false;
    let errorMsg = '';

    for (let i = 0; i < questions.length; i++) {
      let q = questions[i];
      let qMarks = Number(q.marks) || Number(q.positiveMarks);
      if (isNaN(qMarks) || qMarks <= 0) {
         if (testMarks <= 0) {
           hasError = true;
           errorMsg = `Publish blocked: Missing marks configuration. Question ${i + 1} has no marks, and Test has no default marks.`;
           break;
         }
      }
    }

    if (questions.length === 0 && test.type !== 'PDF') {
       // Optionally block empty tests, but maybe subjective tests have 0 questions?
       // Leaving it optional to avoid breaking existing flows, mainly validate the ones with questions
    }

    if (hasError) {
      return res.status(400).json({ error: errorMsg });
    }

    const result = await db.collection('tests').updateOne(
      { $or: orConditions },
      { $set: { published: formatted, status: 'active', updatedAt: now.toISOString() } },
      { upsert: true }
    );

    console.log(`[Publish] matched=${result.matchedCount}, upserted=${result.upsertedCount}, modified=${result.modifiedCount}`);
    res.json({ success: true, published: formatted });
  } catch (error) {
    console.log(`[Publish] ERROR: ${error.message}`);
    res.status(500).json({ error: 'Failed to publish test: ' + error.message });
  }
};

// COURSE-LINKED TEST HANDLERS

// GET /api/courses/:courseId/tests (Canonical: Line 2502)
export const getCourseTests = async (req, res) => {
  try {
    const { courseId } = req.params;
    const query = { $or: [{ courseId }, { course: courseId }] };
    const tests = await db.collection('tests').find(query).toArray();

    // Fetch question counts (N+1 Fix)
    const testIdsForCount = [];
    tests.forEach(test => {
      const testId = test.id || test._id?.toString();
      if (testId) {
        testIdsForCount.push(testId);
        testIdsForCount.push(String(testId));
        if (!isNaN(testId)) testIdsForCount.push(Number(testId));
      }
      if (test._id && ObjectId.isValid(test._id.toString())) {
        testIdsForCount.push(new ObjectId(test._id.toString()));
      }
    });

    let testsWithCounts = tests;
    if (testIdsForCount.length > 0) {
      const countQuery = { $or: [{ testId: { $in: testIdsForCount } }] };
      const questionCounts = await db.collection('questions').aggregate([
        { $match: countQuery },
        { $group: { _id: "$testId", count: { $sum: 1 } } }
      ]).toArray();

      const countMap = {};
      questionCounts.forEach(c => {
        const key = c._id ? c._id.toString() : '';
        countMap[key] = (countMap[key] || 0) + c.count;
      });

      testsWithCounts = tests.map(test => {
        const testId = test.id || test._id?.toString();
        let qCount = 0;
        
        const keysToCheck = [
          testId ? testId.toString() : null,
          test._id ? test._id.toString() : null
        ].filter(Boolean);

        [...new Set(keysToCheck)].forEach(k => {
          if (countMap[k]) qCount += countMap[k];
        });

        return {
          ...test,
          id: test.id || test._id?.toString(),
          questions: qCount || (Array.isArray(test.questions) ? test.questions.length : (test.questions || 0))
        };
      });
    }

    res.json(testsWithCounts);
  } catch (error) {
    console.error('Failed to fetch course tests:', error);
    res.status(500).json({ error: 'Failed to fetch course tests' });
  }
};

// POST /api/courses/:courseId/tests
export const addTestToCourse = async (req, res) => {
  try {
    const { sourceTestId, ...body } = req.body;
    
    // FETCH SOURCE DATA FROM DATABASE (Never trust questions array from frontend list view, as it may be truncated to a count)
    let sourceTestData = null;
    if (sourceTestId) {
      const orConditions = [
        { id: sourceTestId },
        { id: !isNaN(sourceTestId) ? Number(sourceTestId) : null },
        { _id: sourceTestId }
      ].filter(v => v.id || v._id);
      if (ObjectId.isValid(sourceTestId)) orConditions.push({ _id: new ObjectId(sourceTestId) });
      
      sourceTestData = await db.collection('tests').findOne({ $or: orConditions });
    }

    const testData = { ...body, courseId: req.params.courseId };
    
    // 1. Handle embedded questions (Common in many Test Series modules)
    // If the source test has an array of questions, set the count in the new test document
    if (sourceTestData && Array.isArray(sourceTestData.questions)) {
      testData.questions = sourceTestData.questions.length;
      console.log(`[Import] Set question count to ${testData.questions} from embedded source test ${sourceTestId}`);
    }

    // Ensure we don't carry over the old MongoDB _id
    delete testData._id;

    const result = await db.collection('tests').insertOne(testData);
    
    // 2. Handle separate questions (MCQ Framework pattern)
    // If importing from an existing test, also check the 'questions' collection
    if (sourceTestId) {
      console.log(`[Import] Checking separate questions collection for source test: ${sourceTestId}`);
      
      const sourceIdStr = String(sourceTestId);
      const questionFilter = {
        $or: [
          { testId: sourceIdStr },
          { testId: sourceTestId },
          { testId: "test_" + sourceIdStr }
        ]
      };
      if (!isNaN(sourceIdStr)) questionFilter.$or.push({ testId: Number(sourceIdStr) });
      if (ObjectId.isValid(sourceIdStr)) {
        questionFilter.$or.push({ testId: new ObjectId(sourceIdStr) });
      }

      const questions = await db.collection('questions').find(questionFilter).toArray();

      if (questions.length > 0) {
        const newQuestions = questions.map(({ _id, ...q }) => ({
          ...q,
          testId: testData.id, // Link to the new unique test ID
          createdAt: new Date(),
          updatedAt: new Date()
        }));
        await db.collection('questions').insertMany(newQuestions);
        console.log(`[Import] Successfully copied ${newQuestions.length} separate questions`);
      }
    }

    res.status(201).json({ _id: result.insertedId, ...testData });
  } catch (error) {
    console.error('Error adding test to course:', error);
    res.status(500).json({ error: 'Failed to add test to course', details: error.message });
  }
};

// PUT /api/courses/:courseId/tests/:testId
export const updateCourseTest = async (req, res) => {
  try {
    const course = await findCourse(req.params.courseId);
    const testId = req.params.testId;

    const query = {
      $or: [
        { id: testId },
        { _id: ObjectId.isValid(testId) ? new ObjectId(testId) : null }
      ].filter(v => v.id || v._id)
    };

    if (course) {
      query.courseId = { $in: [course.id, course._id.toString(), req.params.courseId] };
    }

    const { _id, ...updateData } = req.body;
    const result = await db.collection('tests').updateOne(
      query,
      { $set: { ...updateData, updatedAt: new Date().toISOString() } }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Test not found' });
    res.json({ success: true, message: 'Test updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update test' });
  }
};

// DELETE /api/courses/:courseId/tests/:testId
export const deleteCourseTest = async (req, res) => {
  const { courseId, testId } = req.params;
  console.log(`[DELETE TEST] Attempting to delete test ${testId} from course ${courseId}`);
  try {
    const course = await findCourse(courseId);
    const idVariants = await getRelatedCourseIds(course, courseId);

    const idConditions = [
      { id: testId },
      { id: !isNaN(testId) ? Number(testId) : null },
      { _id: testId },
      { _id: ObjectId.isValid(testId) ? new ObjectId(testId) : null }
    ].filter(v => (v.id !== null && v.id !== undefined) || (v._id !== null && v._id !== undefined));

    const query = {
      $or: idConditions,
      $and: [{
        $or: [
          { courseId: { $in: idVariants } },
          { course: { $in: idVariants } }
        ]
      }]
    };

    const result = await db.collection('tests').deleteOne(query);
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Test not found' });
    res.json({ success: true, message: 'Test deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete test' });
  }
};
