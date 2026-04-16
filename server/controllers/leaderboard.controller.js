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
export const getLeaderboard = async (req, res) => {
  const testId = req.params.testId;
  try {
    const db = getDb();
    const limit = Math.min(parseInt(req.query.limit) || DEFAULT_LIMIT, MAX_LIMIT);

    const pipeline = [
      { $match: { testId } },
      { $sort: { obtainedMarks: -1, timeTaken: 1 } },
      { $limit: limit },
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
                    { $eq: ['$id', '$$sid'] }
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
