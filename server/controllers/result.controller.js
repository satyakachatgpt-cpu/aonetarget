import { getDb } from '../config/db.js';
import mongoose from 'mongoose';
const { ObjectId } = mongoose.Types;
import { findCourse } from '../services/course.service.js';
import { evaluateTest } from '../services/grading.service.js';
import { logReevaluation, logError, logSubmission } from '../utils/logger.js';

/**
 * Internal helper to fetch a sorted leaderboard (best attempt per student) for a test.
 * Returns an array of { score, time } objects.
 */
const getLeaderboard = async (db, testId) => {
  return await db.collection('testResults').aggregate([
    { $match: { testId: String(testId) } },
    {
      $group: {
        _id: "$studentId",
        score: { $max: "$obtainedMarks" },
        attempts: { $push: { m: "$obtainedMarks", t: "$timeTaken" } }
      }
    },
    {
      $addFields: {
        time: {
          $min: {
            $map: {
              input: { $filter: { input: "$attempts", as: "att", cond: { $eq: ["$$att.m", "$score"] } } },
              as: "top",
              in: "$$top.t"
            }
          }
        }
      }
    },
    { $project: { _id: 1, score: 1, time: 1 } },
    { $sort: { score: -1, time: 1 } }
  ]).toArray();
};

const REEVALUATE_BATCH_SIZE = 50;

/**
 * Enriches a test result document with human-readable names
 * sourced from tests, courses, and students collections.
 * No-throw: all sub-lookups fail silently to avoid breaking result lists.
 */
export const enrichResult = async (r, db) => {
  if (!r.testName && r.testId) {
    try {
      const t = await db.collection('tests').findOne({ id: r.testId });
      if (t) {
        r.testName = t.name || t.title || '';
        r.courseId = r.courseId || t.courseId || '';
        r.courseName = r.courseName || t.courseName || t.course || '';
      }
    } catch (e) { }
  }
  if (!r.studentName && r.studentId) {
    try {
      const s = await db.collection('students').findOne({ id: r.studentId });
      if (s) {
        r.studentName = s.name || '';
        r.studentPhone = s.phone || '';
        r.studentEmail = s.email || '';
      }
    } catch (e) { }
  }
  if (!r.courseName && r.courseId) {
    try {
      const c = await findCourse(r.courseId);
      if (c) r.courseName = c.name || c.title || '';
    } catch (e) { }
  }
  return r;
};

// GET /api/test-results/:id
export const getResultById = async (req, res) => {
  try {
    const db = getDb();
    const resultId = String(req.params.id || '').trim();
    console.log('DEBUG: getResultById looking for:', resultId);
    
    // Support custom id (string/number) and MongoDB _id (ObjectId or string)
    const orFilters = [
      { id: resultId },
      { id: !isNaN(Number(resultId)) ? Number(resultId) : null },
      { _id: resultId }
    ].filter(v => (v.id !== null && v.id !== undefined) || (v._id !== null && v._id !== undefined));
    
    if (ObjectId.isValid(resultId)) {
      orFilters.push({ _id: new ObjectId(resultId) });
    }

    const filter = { $or: orFilters };
    console.log('DEBUG: Final Filter:', JSON.stringify(filter));

    const result = await db.collection('testResults').findOne(filter);
    if (!result) {
        console.log('DEBUG: Result NOT found in DB for ID:', resultId);
        return res.status(404).json({ error: 'Result record not found' });
    }
    console.log('DEBUG: Result found! studentId:', result.studentId);
    
    // Check ownership
    const isAdmin = req.user?.isAdmin || req.user?.role === 'admin';
    const sessionStudentId = req.user?.studentId || req.user?.id;
    console.log('DEBUG: Ownership check - result.studentId:', result.studentId, 'sessionStudentId:', sessionStudentId, 'isAdmin:', isAdmin);
    
    if (!isAdmin && String(result.studentId) !== String(sessionStudentId)) {
      console.log('DEBUG: Ownership check FAILED');
      return res.status(403).json({ error: 'Forbidden' });
    }

    const enriched = await enrichResult(result, db);

    // --- Optimized Live Ranking Logic ---
    try {
      const tid = String(enriched.testId);
      // Fetch leaderboard results with flexible testId matching
      const lb = await db.collection('testResults').aggregate([
        { $match: { $or: [{ testId: tid }, { testId: !isNaN(tid) ? Number(tid) : tid }] } },
        {
          $group: {
            _id: "$studentId",
            score: { $max: "$obtainedMarks" },
            time: { $min: "$timeTaken" } // Simple min time for now
          }
        },
        { $sort: { score: -1, time: 1 } }
      ]).toArray();
      
      const currentScore = Number(enriched.obtainedMarks) || 0;
      const currentTime = Number(enriched.timeTaken) || 999999;
      
      // Calculate rank: count students better than current result
      enriched.rank = lb.filter(s => 
        (Number(s.score) > currentScore) || 
        (Number(s.score) === currentScore && Number(s.time) < currentTime)
      ).length + 1;
      
      enriched.totalStudents = lb.length;
    } catch (rankErr) {
      console.error('Live ranking failed in single fetch:', rankErr);
    }

    res.json(enriched);
  } catch (error) {
    logError({ action: 'GET_RESULT_BY_ID', error, context: { id: req.params.id } });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/students/:id/test-results
export const getStudentTestResults = async (req, res) => {
  try {
    const identifier = req.params.id;
    const db = getDb();
    
    // First, find the actual student to get all possible IDs (legacy custom ID, userId, and MongoDB _id)
    const student = await db.collection('students').findOne({
      $or: [
        { id: identifier },
        { userId: identifier },
        { _id: ObjectId.isValid(identifier) ? new ObjectId(identifier) : null }
      ].filter(v => v.id || v.userId || v._id)
    });

    const idList = [identifier];
    if (student) {
      if (student.id) idList.push(student.id);
      if (student.userId) idList.push(student.userId);
      if (student._id) idList.push(student._id.toString());
    }

    const matchStage = {
      $or: [
        { studentId: { $in: idList } },
        { studentId: !isNaN(identifier) ? Number(identifier) : null }
      ].filter(c => c.studentId !== null)
    };

    const pipeline = [
      { $match: matchStage },
      { $sort: { submittedAt: -1 } },
      // Lookup tests (Match by id or _id)
      {
        $lookup: {
          from: 'tests',
          let: { tid: '$testId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$id', '$$tid'] },
                    {
                      $and: [
                        { $regexMatch: { input: { $toString: '$$tid' }, regex: /^[0-9a-fA-F]{24}$/ } },
                        { $eq: ['$_id', { $convert: { input: '$$tid', to: 'objectId', onError: null, onNull: null } }] }
                      ]
                    }
                  ]
                }
              }
            },
            { $limit: 1 }
          ],
          as: '_test'
        }
      },
      { $unwind: { path: '$_test', preserveNullAndEmptyArrays: true } },
      // Lookup students (Match by id or _id)
      {
        $lookup: {
          from: 'students',
          let: { sid: '$studentId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$id', '$$sid'] },
                    {
                      $and: [
                        { $regexMatch: { input: { $toString: '$$sid' }, regex: /^[0-9a-fA-F]{24}$/ } },
                        { $eq: ['$_id', { $convert: { input: '$$sid', to: 'objectId', onError: null, onNull: null } }] }
                      ]
                    }
                  ]
                }
              }
            },
            { $limit: 1 }
          ],
          as: '_student'
        }
      },
      { $unwind: { path: '$_student', preserveNullAndEmptyArrays: true } },
      // Resolve courseId fallback for next lookups
      {
        $addFields: {
          resolvedCourseId: { $ifNull: ['$courseId', '$_test.courseId', ''] }
        }
      },
      // Lookup courses
      {
        $lookup: {
          from: 'courses',
          let: { cid: '$resolvedCourseId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$id', '$$cid'] },
                    {
                      $and: [
                        { $regexMatch: { input: { $toString: '$$cid' }, regex: /^[0-9a-fA-F]{24}$/ } },
                        { $eq: ['$_id', { $convert: { input: '$$cid', to: 'objectId', onError: null, onNull: null } }] }
                      ]
                    }
                  ]
                }
              }
            },
            { $limit: 1 }
          ],
          as: '_course'
        }
      },
      { $unwind: { path: '$_course', preserveNullAndEmptyArrays: true } },
      // Lookup packages
      {
        $lookup: {
          from: 'packages',
          let: { cid: '$resolvedCourseId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$id', '$$cid'] },
                    {
                      $and: [
                        { $regexMatch: { input: { $toString: '$$cid' }, regex: /^[0-9a-fA-F]{24}$/ } },
                        { $eq: ['$_id', { $convert: { input: '$$cid', to: 'objectId', onError: null, onNull: null } }] }
                      ]
                    }
                  ]
                }
              }
            },
            { $limit: 1 }
          ],
          as: '_package'
        }
      },
      { $unwind: { path: '$_package', preserveNullAndEmptyArrays: true } },
      // Final Field Consolidation
      {
        $addFields: {
          testName: { $ifNull: ['$_test.name', '$_test.title', 'Unknown Test'] },
          studentName: { $ifNull: ['$_student.name', 'Unknown Student'] },
          courseId: '$resolvedCourseId',
          courseName: {
            $ifNull: [
              '$_test.courseName',
              '$_test.course',
              '$_course.name',
              '$_package.name',
              ''
            ]
          }
        }
      },
      // Cleanup
      {
        $project: {
          _test: 0,
          _student: 0,
          _course: 0,
          _package: 0,
          resolvedCourseId: 0
        }
      }
    ];

    const results = await db.collection('testResults')
      .aggregate(pipeline, { allowDiskUse: true })
      .toArray();

    // --- Optimized Live Ranking Calculation for History ---
    try {
      const uniqueTestIds = [...new Set(results.map(r => r.testId))];
      const testLeaderboards = {};

      // Build leaderboards for each test mentioned in the results
      await Promise.all(uniqueTestIds.map(async (tid) => {
        testLeaderboards[tid] = await getLeaderboard(db, tid);
      }));

      // Map fresh ranks to results
      results.forEach(r => {
        const lb = testLeaderboards[r.testId];
        if (lb) {
          const currentScore = Number(r.obtainedMarks) || 0;
          const currentTime = Number(r.timeTaken) || 999999;
          
          r.rank = lb.filter(s => 
            (Number(s.score) > currentScore) || 
            (Number(s.score) === currentScore && Number(s.time) < currentTime)
          ).length + 1;
          
          r.totalStudents = lb.length;
        }
      });
    } catch (rankErr) {
      console.error('Live ranking calculation failed:', rankErr);
    }
    // --- End Live Ranking Calculation ---

    res.json(results);
  } catch (error) {
    logError({ action: 'GET_STUDENT_RESULTS', error, context: { studentId: req.params.id } });
    if (error.code === 'DB_NOT_READY') {
      return res.status(503).json({ success: false, message: "Database not ready" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/admin/test-results
 * Uses MongoDB aggregation with $lookup to resolve testName, studentName,
 * and courseName in a single pipeline — avoids N+1 in-process loops.
 * Falls back gracefully if lookup collections are empty.
 */
export const getAdminTestResults = async (req, res) => {
  try {
    const db = getDb();
    const { studentId, courseId, testId } = req.query;
    const matchStage = {};
    if (studentId) matchStage.studentId = studentId;
    if (courseId) matchStage.courseId = courseId;
    if (testId) matchStage.testId = testId;

    const pipeline = [
      { $match: matchStage },
      { $sort: { submittedAt: -1 } },
      {
        $lookup: {
          from: 'tests',
          let: { tid: '$testId', hasName: { $gt: ['$testName', ''] } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $not: ['$$hasName'] },
                    { $eq: ['$id', '$$tid'] }
                  ]
                }
              }
            },
            { $limit: 1 },
            { $project: { _id: 0, name: 1, title: 1, courseId: 1, courseName: 1, course: 1 } }
          ],
          as: '_testLookup'
        }
      },
      {
        $lookup: {
          from: 'students',
          localField: 'studentId',
          foreignField: 'id',
          pipeline: [
            { $limit: 1 },
            { $project: { _id: 0, name: 1, phone: 1, email: 1 } }
          ],
          as: "_studentLookup",
        }
      },
      {
        $addFields: {
          testName: {
            $cond: {
              if: { $gt: ['$testName', ''] },
              then: '$testName',
              else: { $ifNull: [{ $arrayElemAt: ['$_testLookup.name', 0] }, { $arrayElemAt: ['$_testLookup.title', 0] }] }
            }
          },
          studentName: {
            $cond: {
              if: { $gt: ["$studentName", ""] },
              then: "$studentName",
              else: {
                $ifNull: [{ $arrayElemAt: ["$_studentLookup.name", 0] }, ""],
              },
            },
          },
          studentPhone: {
            $ifNull: [
              "$studentPhone",
              { $arrayElemAt: ["$_studentLookup.phone", 0] },
              "",
            ],
          },
          studentEmail: {
            $ifNull: [
              "$studentEmail",
              { $arrayElemAt: ["$_studentLookup.email", 0] },
              "",
            ],
          },
          courseId: {
            $cond: {
              if: { $gt: ['$courseId', ''] },
              then: '$courseId',
              else: { $ifNull: [{ $arrayElemAt: ['$_testLookup.courseId', 0] }, ''] }
            }
          },
          courseName: {
            $cond: {
              if: { $gt: ['$courseName', ''] },
              then: '$courseName',
              else: {
                $ifNull: [
                  { $arrayElemAt: ['$_testLookup.courseName', 0] },
                  { $arrayElemAt: ['$_testLookup.course', 0] },
                  ''
                ]
              }
            }
          }
        }
      },
      { $project: { _testLookup: 0, _studentLookup: 0 } }
    ];

    const results = await db.collection('testResults')
      .aggregate(pipeline, { allowDiskUse: true })
      .toArray();

    // --- Optimized Live Ranking Calculation for Admin ---
    try {
      const uniqueTestIds = [...new Set(results.map(r => r.testId))];
      const testLeaderboards = {};

      for (const tid of uniqueTestIds) {
        testLeaderboards[tid] = await getLeaderboard(db, tid);
      }

      results.forEach(r => {
        const lb = testLeaderboards[r.testId];
        if (lb) {
          const currentScore = Number(r.obtainedMarks) || 0;
          const currentTime = Number(r.timeTaken) || 999999;
          
          r.rank = lb.filter(s => 
            (Number(s.score) > currentScore) || 
            (Number(s.score) === currentScore && Number(s.time) < currentTime)
          ).length + 1;
          
          r.totalStudents = lb.length;
        }
      });
    } catch (rankErr) {
      console.error('Admin live ranking calculation failed:', rankErr);
    }
    // --- End Live Ranking Calculation ---

    res.json(results);
  } catch (error) {
    logError({ action: 'GET_ADMIN_RESULTS', error });
    if (error.code === 'DB_NOT_READY') {
      return res.status(503).json({ success: false, message: "Database not ready" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// DELETE /api/admin/test-results (delete all)
export const deleteAllTestResults = async (req, res) => {
  try {
    const db = getDb();
    const result = await db.collection('testResults').deleteMany({});
    res.json({ success: true, message: `Deleted ${result.deletedCount} records` });
  } catch (error) {
    logError({ action: 'DELETE_ALL_RESULTS', error });
    if (error.code === 'DB_NOT_READY') {
      return res.status(503).json({ success: false, message: "Database not ready" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// DELETE /api/admin/test-results/:id
export const deleteTestResult = async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const query = {
      $or: [
        { id: id },
        { _id: ObjectId.isValid(id) ? new ObjectId(id) : null }
      ].filter(v => v.id || v._id)
    };
    const result = await db.collection('testResults').deleteOne(query);
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Test result not found' });
    }
    res.json({ success: true, message: 'Test result deleted' });
  } catch (error) {
    logError({ action: 'DELETE_RESULT', error, context: { id: req.params.id } });
    if (error.code === 'DB_NOT_READY') {
      return res.status(503).json({ success: false, message: "Database not ready" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * POST /api/tests/:id/reevaluate
 * Re-grades all past submissions for a given test using the current
 * correct answers from the questions collection.
 * Non-destructive: only scoring fields are overwritten, original answers preserved.
 * Processes in batches of REEVALUATE_BATCH_SIZE to avoid memory spikes.
 */
export const reevaluateTest = async (req, res) => {
  const testId = req.params.id;
  try {
    const db = getDb();
    const orConditions = [
      { id: testId },
      { id: !isNaN(testId) ? Number(testId) : null },
    ].filter(v => v.id !== null && v.id !== undefined);
    if (ObjectId.isValid(testId)) orConditions.push({ _id: new ObjectId(testId) });

    const test = await db.collection('tests').findOne({ $or: orConditions });
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    const questionFilter = {
      $or: [
        { testId: testId },
        { testId: test.id || test._id.toString() }
      ]
    };
    if (!isNaN(testId)) questionFilter.$or.push({ testId: Number(testId) });

    const questions = await db.collection('questions').find(questionFilter).toArray();
    if (questions.length === 0) {
      return res.status(400).json({ success: false, message: 'No questions found for this test. Cannot re-evaluate.' });
    }

    const totalSubmissions = await db.collection('testResults').countDocuments({ testId });
    if (totalSubmissions === 0) {
      return res.json({ success: true, message: 'No submissions found to re-evaluate.', updated: 0 });
    }

    let updatedCount = 0;
    let skip = 0;

    while (skip < totalSubmissions) {
      const batch = await db.collection('testResults')
        .find({ testId })
        .skip(skip)
        .limit(REEVALUATE_BATCH_SIZE)
        .toArray();

      if (batch.length === 0) break;

      for (const submission of batch) {
        const { answers } = submission;
        if (!answers || typeof answers !== 'object') continue;

        const evaluation = evaluateTest({ questions, answers, test });

        await db.collection('testResults').updateOne(
          { _id: submission._id },
          {
            $set: {
              questionResults: evaluation.questionResults,
              totalQuestions: evaluation.totalQuestions,
              correctAnswers: evaluation.correctAnswers,
              wrongAnswers: evaluation.wrongAnswers,
              unanswered: evaluation.unanswered,
              totalMarks: evaluation.totalMarks,
              obtainedMarks: evaluation.obtainedMarks,
              negativeMarksTotal: evaluation.negativeMarksTotal,
              percentage: evaluation.percentage,
              reevaluatedAt: new Date()
            }
          }
        );
        updatedCount++;
      }

      skip += REEVALUATE_BATCH_SIZE;
    }

    logReevaluation({ testId, testName: test.name || test.title, updatedCount });

    res.json({
      success: true,
      message: `Re-evaluated ${updatedCount} submission(s) for test "${test.name || test.title || testId}".`,
      updated: updatedCount
    });
  } catch (error) {
    logError({ action: 'REEVALUATE', error, context: { testId } });
    if (error.code === 'DB_NOT_READY') {
      return res.status(503).json({ success: false, message: "Database not ready" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * POST /api/students/:id/test-results
 * [UNSAFE] Raw insert — bypasses grading engine entirely.
 * Restricted to admin. Kept for legacy mobile app compatibility only.
 * Do not use for new features.
 */
export const rawInsertTestResult = async (req, res) => {
  try {
    const db = getDb();
    const result = await db.collection('testResults').insertOne({
      ...req.body,
      studentId: req.params.id,
      submittedAt: new Date()
    });
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    logError({ action: 'RAW_INSERT_RESULT', error, context: { studentId: req.params.id } });
    if (error.code === 'DB_NOT_READY') {
      return res.status(503).json({ success: false, message: "Database not ready" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * Test Submission Orchestration (Surgically moved from server.js)
 */
export const submitTest = async (req, res) => {
  try {
    const db = getDb();
    const { studentId, answers, timeTaken } = req.body;
    const isAdmin = req.user?.isAdmin || req.user?.role === 'admin';
    const tokenStudentId = req.user?.studentId;

    if (!isAdmin && String(studentId) !== String(tokenStudentId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const effectiveStudentId = isAdmin ? studentId : tokenStudentId;
    const tid = req.params.testId;
    const orConditions = [
      { id: tid },
      { id: !isNaN(tid) ? Number(tid) : null },
      { _id: tid }
    ].filter(v => v.id !== null && v.id !== undefined || v._id !== null && v._id !== undefined);
    
    if (ObjectId.isValid(tid)) orConditions.push({ _id: new ObjectId(tid) });

    let test = await db.collection('tests').findOne({ $or: orConditions });
    if (!test) {
      const questionCount = await db.collection('questions').countDocuments({
        $or: [{ testId: tid }, { testId: !isNaN(tid) ? Number(tid) : tid }]
      });
      if (questionCount > 0) {
        test = { id: tid, temp: true };
      } else {
        return res.status(404).json({ error: 'Test not found' });
      }
    }

    const questionFilter = { $or: [{ testId: tid }, { testId: test.id || test._id.toString() }] };
    if (!isNaN(tid)) questionFilter.$or.push({ testId: Number(tid) });
    const separateQuestions = await db.collection('questions').find(questionFilter).toArray();
    const questions = separateQuestions.length > 0 ? separateQuestions : (test.questions || []);
    
    const evaluation = evaluateTest({ questions, answers, test });

    let studentName = '';
    try {
      const studentDoc = await db.collection('students').findOne({ id: effectiveStudentId });
      studentName = studentDoc?.name || '';
    } catch (e) { }

    let courseName = test.courseName || test.course || '';
    if (!courseName && test.courseId) {
      try {
        const courseDoc = await findCourse(test.courseId);
        courseName = courseDoc?.name || courseDoc?.title || '';
      } catch (e) { }
    }

    const resultData = {
      id: `result_${Date.now()}`,
      testId: req.params.testId,
      testName: test.name || test.title || '',
      courseId: test.courseId || '',
      courseName,
      studentId: effectiveStudentId,
      studentName,
      answers,
      ...evaluation,
      timeTaken,
      submittedAt: new Date()
    };

    // --- Optimized Ranking Calculation ---
    let rank = 0;
    let totalStudents = 0;
    try {
      const tid = req.params.testId;
      const lb = await getLeaderboard(db, tid);
      
      const studentScore = Number(evaluation.obtainedMarks) || 0;
      const studentTime = Number(timeTaken) || 999999;
      
      // Calculate rank among others' best attempts
      // lb already contains best attempts per student (including current student's past attempts if any)
      // To strictly rank among OTHERS, we could filter lb by studentId, but the leaderboard concept 
      // usually includes the current best too. The existing code filtered out current student.
      const otherStudentsBest = lb.filter(s => String(s._id) !== String(effectiveStudentId));
      
      totalStudents = otherStudentsBest.length + 1;
      rank = otherStudentsBest.filter(s => 
        (Number(s.score) > studentScore) || 
        (Number(s.score) === studentScore && Number(s.time) < studentTime)
      ).length + 1;
      
    } catch (rankErr) {
      console.error('Ranking calculation failed:', rankErr);
    }
    // --- End Ranking Calculation ---

    resultData.rank = rank;
    resultData.totalStudents = totalStudents;

    await db.collection('testResults').insertOne(resultData);

    // Fire-and-forget: log after DB write, never block
    logSubmission({
      studentId: effectiveStudentId,
      testId: req.params.testId,
      obtainedMarks: resultData.obtainedMarks,
      totalMarks: resultData.totalMarks,
      percentage: resultData.percentage,
      timeTaken
    });

    // Strip correctAnswer and isCorrect from response for students (keep in DB for later review)
    const responseData = isAdmin ? resultData : {
      ...resultData,
      questionResults: resultData.questionResults?.map(qr => {
        const { correctAnswer, isCorrect, ...safeQr } = qr;
        return safeQr;
      })
    };

    res.status(201).json(responseData);
  } catch (error) {
    logError({ action: 'SUBMIT', error, context: { testId: req.params.testId } });
    res.status(500).json({ error: 'Failed to submit test' });
  }
};
