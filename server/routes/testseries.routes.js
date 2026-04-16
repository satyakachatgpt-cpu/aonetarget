import express from 'express';
import * as testSeriesController from '../controllers/testseries.controller.js';
import { adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/', testSeriesController.getAllTestSeries);
router.post('/', adminMiddleware, testSeriesController.createTestSeries);
router.delete('/', adminMiddleware, testSeriesController.deleteAllTestSeries);
router.post('/bulk', adminMiddleware, testSeriesController.bulkCreateTestSeries);
router.put('/update-all', adminMiddleware, testSeriesController.updateAllTestSeries);

router.put('/:id', adminMiddleware, testSeriesController.updateTestSeries);
router.delete('/:id', adminMiddleware, testSeriesController.deleteTestSeries);

export default router;
