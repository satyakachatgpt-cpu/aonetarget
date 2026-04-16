import express from 'express';
import { 
  createRazorpayOrder, 
  verifyRazorpayPayment, 
  createPurchase 
} from '../controllers/payment.controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Razorpay Payment Routes
router.post('/razorpay/create-order', authMiddleware, createRazorpayOrder);
router.post('/razorpay/verify', authMiddleware, verifyRazorpayPayment);

// Legacy/Manual Purchase Routes
router.post('/purchases', authMiddleware, createPurchase);

export default router;
