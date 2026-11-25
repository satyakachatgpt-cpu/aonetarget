import express from 'express';
import { 
  createRazorpayOrder, 
  verifyRazorpayPayment, 
  checkAndFulfillOrder,
  handleRazorpayWebhook,
  createPurchase 
} from '../controllers/payment.controller.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { paymentLimiter } from '../middleware/security.js';

const router = express.Router();

// Razorpay Payment Routes
router.post('/razorpay/create-order', authMiddleware, paymentLimiter, createRazorpayOrder);
router.post('/razorpay/verify', authMiddleware, paymentLimiter, verifyRazorpayPayment);
router.post('/razorpay/check-order', authMiddleware, paymentLimiter, checkAndFulfillOrder);
router.post('/razorpay/webhook', handleRazorpayWebhook);

// Legacy/Manual Purchase Routes
router.post('/purchases', authMiddleware, paymentLimiter, createPurchase);

export default router;
