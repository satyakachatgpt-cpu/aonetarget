import express from 'express';
import { getLeaderboard } from '../controllers/leaderboard.controller.js';

const router = express.Router();

// GET /api/tests/:testId/leaderboard
// Public — students can see the leaderboard for a test they took
router.get('/tests/:testId/leaderboard', getLeaderboard);

export default router;
