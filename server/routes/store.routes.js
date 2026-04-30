import express from 'express';
import * as storeController from '../controllers/store.controller.js';
import { getPurchasesByStudent, getAdminPurchases } from '../controllers/store.controller.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { catalogLimiter } from '../middleware/security.js';

const router = express.Router();

const userOwnerOrAdmin = (req, res, next) => {
  if (req.user?.isAdmin || req.user?.role === 'admin') return next();
  const requestedUserId = req.params.userId || req.body?.userId || req.body?.studentId;
  if (req.user?.studentId && String(req.user.studentId) === String(requestedUserId)) return next();
  return res.status(403).json({ error: 'Forbidden' });
};

/**
 * Store & Ecommerce Routes
 * Mounted at /api via app.js
 */

// Orders
router.post('/orders', authMiddleware, userOwnerOrAdmin, storeController.createOrder);
router.get('/orders/:userId', authMiddleware, userOwnerOrAdmin, storeController.getOrdersByUser);


// Tokens
router.get('/tokens', adminMiddleware, storeController.getTokens);
router.post('/tokens', adminMiddleware, storeController.createToken);
router.post('/tokens/bulk', adminMiddleware, storeController.bulkCreateTokens);
router.put('/tokens/update-all', adminMiddleware, storeController.updateAllTokens);
router.put('/tokens/:id', adminMiddleware, storeController.updateToken);
router.delete('/tokens', adminMiddleware, storeController.deleteAllTokens);
router.delete('/tokens/:id', adminMiddleware, storeController.deleteToken);

// E-books
router.get('/ebooks', storeController.getEbooks);
router.post('/ebooks', adminMiddleware, storeController.createEbook);
router.put('/ebooks/:id', adminMiddleware, storeController.updateEbook);
router.delete('/ebooks/:id', adminMiddleware, storeController.deleteEbook);

// Store Products
router.get('/store', catalogLimiter, storeController.getStoreProducts);
router.post('/store', adminMiddleware, storeController.createStoreProduct);
router.post('/store/bulk', adminMiddleware, storeController.bulkCreateStoreProducts);
router.put('/store/update-all', adminMiddleware, storeController.updateAllStoreProducts);
router.put('/store/:id', adminMiddleware, storeController.updateStoreProduct);
router.delete('/store', adminMiddleware, storeController.deleteAllStoreProducts);
router.delete('/store/:id', adminMiddleware, storeController.deleteStoreProduct);

// Purchases (Phase 19F)
router.get('/purchases/:studentId', authMiddleware, getPurchasesByStudent);
router.get('/admin/purchases', adminMiddleware, getAdminPurchases);

export default router;
