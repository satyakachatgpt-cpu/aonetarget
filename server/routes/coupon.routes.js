import express from 'express';
import {
  getCoupons,
  validateCoupon,
  bulkCreateCoupons,
  bulkUpdateCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  deleteAllCoupons,
  reorderCoupons
} from '../controllers/coupon.controller.js';
import { adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

// IMPORTANT: Specific routes (validate, bulk, reorder) MUST come before /:id routes
router.get('/', getCoupons);
router.post('/validate', validateCoupon);
router.post('/bulk', adminMiddleware, bulkCreateCoupons);
router.put('/update-all', adminMiddleware, bulkUpdateCoupons);
router.patch('/reorder', adminMiddleware, reorderCoupons);

router.post('/', adminMiddleware, createCoupon);
router.put('/:id', adminMiddleware, updateCoupon);
router.delete('/:id', adminMiddleware, deleteCoupon);
router.delete('/', adminMiddleware, deleteAllCoupons);

export default router;
