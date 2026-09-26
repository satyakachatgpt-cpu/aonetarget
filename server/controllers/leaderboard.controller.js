import { getDb } from '../config/db.js';
import mongoose from 'mongoose';
const { ObjectId } = mongoose.Types;
import { logError } from '../utils/logger.js';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * GET /api/tests/:testId/leaderboard
 *
 * Returns the top-N results for a given test, ranked by:
 *   1. obtainedMarks DESC  (higher score = better)
 *   2. timeTaken ASC       (faster = better, tie-breaker)
 *
 * Query params:
 *   limit  — number of results (default 50, max 100)
 */
/**
 * Helper to resolve all variations of testId, _id, and testName
 * across platforms (website vs app, cloned tests, ObjectId vs string).
 */
export const getTestMatchFilter = async (db, testId, testName = null) => {
  const ids = new Set();
  if (testId) {
    ids.add(String(testId));
  }

  let resolvedTitle = testName;

  try {
    const orConds = [
      { id: testId },
      { _id: testId },
      ObjectId.isValid(testId) ? { _id: new ObjectId(testId) } : null,
      !isNaN(testId) ? { id: Number(testId) } : null
    ].filter(Boolean);

    const testDoc = await db.collection('tests').findOne({ $or: orConds });
    if (testDoc) {
      if (testDoc._id) ids.add(testDoc._id.toString());
      if (testDoc.id) ids.add(String(testDoc.id));
      if (!resolvedTitle) resolvedTitle = testDoc.title || testDoc.name;
    }

    if (resolvedTitle) {
      const relatedTests = await db.collection('tests').find({
        $or: [
          { title: resolvedTitle },
          { name: resolvedTitle }
        ]
      }).project({ _id: 1, id: 1 }).toArray();

      relatedTests.forEach(t => {
        if (t._id) ids.add(t._id.toString());
        if (t.id) ids.add(String(t.id));
      });
    }
  } catch (e) {
    console.error('Error resolving test match filter:', e);
  }

  const idList = Array.from(ids);
  const conditions = [
    { testId: { $in: idList } }
  ];
  if (resolvedTitle) {
    conditions.push({ testName: resolvedTitle });
  }

  return { filter: { $or: conditions }, resolvedTitle };
};

export const getLeaderboard = async (req, res) => {
  const testId = req.params.testId;
  try {
    const db = getDb();
    const limit = Math.min(parseInt(req.query.limit) || DEFAULT_LIMIT, MAX_LIMIT);

    const { filter: matchFilter } = await getTestMatchFilter(db, testId);

    const pipeline = [
      { $match: matchFilter },
      // 1. Sort to get best results at the top for each student
      { $sort: { studentId: 1, obtainedMarks: -1, timeTaken: 1 } },
      // 2. Group by studentId and take the first (best) result
      {
        $group: {
          _id: "$studentId",
          studentId: { $first: "$studentId" },
          studentName: { $first: "$studentName" },
          obtainedMarks: { $first: "$obtainedMarks" },
          totalMarks: { $first: "$totalMarks" },
          percentage: { $first: "$percentage" },
          timeTaken: { $first: "$timeTaken" },
          submittedAt: { $first: "$submittedAt" }
        }
      },
      // 3. Sort the unique best results to establish global ranks
      { $sort: { obtainedMarks: -1, timeTaken: 1 } },
      { $limit: limit },
      // 4. Hydrate student names if missing
      {
        $lookup: {
          from: 'students',
          let: { sid: '$studentId', hasName: { $gt: ['$studentName', ''] } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $not: ['$$hasName'] },
                    { $or: [
                        { id: '$$sid' },
                        { userId: '$$sid' }
                    ]}
                  ]
                }
              }
            },
            { $limit: 1 },
            { $project: { _id: 0, name: 1 } }
          ],
          as: '_studentLookup'
        }
      },
      {
        $addFields: {
          studentName: {
            $cond: {
              if: { $gt: ['$studentName', ''] },
              then: '$studentName',
              else: { $ifNull: [{ $arrayElemAt: ['$_studentLookup.name', 0] }, 'Unknown'] }
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          studentId: 1,
          studentName: 1,
          obtainedMarks: 1,
          totalMarks: 1,
          percentage: 1,
          timeTaken: 1,
          submittedAt: 1
        }
      }
    ];

    const rows = await db.collection('testResults')
      .aggregate(pipeline, { allowDiskUse: true })
      .toArray();

    const leaderboard = rows.map((row, idx) => ({
      rank: idx + 1,
      ...row
    }));

    res.json({ testId, total: leaderboard.length, leaderboard });
  } catch (error) {
    logError({ action: 'GET_LEADERBOARD', error, context: { testId } });
    if (error.code === 'DB_NOT_READY') {
      return res.status(503).json({ success: false, message: "Database not ready" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
