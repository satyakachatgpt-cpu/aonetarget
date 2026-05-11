import express from 'express';
import { 
    submitCounsellingLead, 
    getCounsellingLeads, 
    updateCounsellingLeadStatus,
    deleteCounsellingLead 
} from '../controllers/counselling.controller.js';
import { adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Public submission route
router.post('/counselling-leads', submitCounsellingLead);

// Admin protected routes
router.get('/admin/counselling-leads', adminMiddleware, getCounsellingLeads);
router.put('/admin/counselling-leads/:id', adminMiddleware, updateCounsellingLeadStatus);
router.delete('/admin/counselling-leads/:id', adminMiddleware, deleteCounsellingLead);

export default router;
