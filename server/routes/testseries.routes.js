import express from 'express';
import * as testSeriesController from '../controllers/testseries.controller.js';
import { adminMiddleware, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', optionalAuth, testSeriesController.getAllTestSeries);
router.post('/', adminMiddleware, testSeriesController.createTestSeries);
router.delete('/', adminMiddleware, testSeriesController.deleteAllTestSeries);
router.post('/bulk', adminMiddleware, testSeriesController.bulkCreateTestSeries);
router.put('/update-all', adminMiddleware, testSeriesController.updateAllTestSeries);

router.get('/:id/users', adminMiddleware, testSeriesController.getTestSeriesUsers);
router.put('/:id', adminMiddleware, testSeriesController.updateTestSeries);
router.delete('/:id', adminMiddleware, testSeriesController.deleteTestSeries);

export default router;
