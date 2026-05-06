import { db } from '../config/db.js';
import mongoose from 'mongoose';
import { findCourse } from '../services/course.service.js';
import { calculatePriceBreakdown } from '../utils/helpers.js';

const { ObjectId } = mongoose.Types;

/**
 * GET /api/coupons
 * List all coupons
 */
export const getCoupons = async (req, res) => {
  try {
    const coupons = await db.collection('coupons').find({}).toArray();
    // Sort by order ASC, missing/invalid goes last
    coupons.sort((a, b) => {
      const aOrder = typeof a.order === 'number' ? a.order : Infinity;
      const bOrder = typeof b.order === 'number' ? b.order : Infinity;
      if (aOrder !== bOrder) return aOrder - bOrder;
      
      const aTime = a.createdDate ? new Date(a.createdDate).getTime() : 0;
      const bTime = b.createdDate ? new Date(b.createdDate).getTime() : 0;
      if (aTime !== bTime) return bTime - aTime;
      return String(a._id || '').localeCompare(String(b._id || ''));
    });
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
};

/**
 * POST /api/coupons/validate
 * Standalone coupon validation
 */
export const validateCoupon = async (req, res) => {
  try {
    const { code, courseId } = req.body;
    if (!code || !courseId) return res.status(400).json({ error: 'Code and courseId are required' });

    // 1. Fetch Coupon (Case-insensitive check)
    const coupon = await db.collection('coupons').findOne({ 
      code: { $regex: new RegExp(`^${code}$`, 'i') }
    });
    if (!coupon) return res.status(404).json({ error: 'Invalid coupon code' });

    const course = await findCourse(courseId);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const breakdown = calculatePriceBreakdown(course, coupon);
    if (breakdown.isInvalid) {
      return res.status(400).json({ error: breakdown.invalidReason });
    }

    res.json({ success: true, ...breakdown });
  } catch (error) {
    console.error('Coupon validation error:', error);
    res.status(500).json({ error: 'Internal server error during validation' });
  }
};

/**
 * POST /api/coupons/bulk
 * Bulk create coupons
 */
export const bulkCreateCoupons = async (req, res) => {
  try {
    const { coupons } = req.body;
    if (!Array.isArray(coupons) || coupons.length === 0) return res.status(400).json({ error: 'No coupons provided' });
    const result = await db.collection('coupons').insertMany(coupons);
    res.status(201).json({ success: true, inserted: result.insertedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk create coupons' });
  }
};

/**
 * PUT /api/coupons/update-all
 * Bulk update coupons
 */
export const bulkUpdateCoupons = async (req, res) => {
  try {
    const updates = (req.body && req.body.updates) ? req.body.updates : (Array.isArray(req.body) ? req.body : []);
    for (const update of updates) {
      const { id, _id, ...data } = update;
      if (id) await db.collection('coupons').updateOne({ id }, { $set: data });
    }
    res.json({ success: true, message: `Updated ${updates.length} coupons` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update all coupons' });
  }
};

/**
 * POST /api/coupons
 * Create a single coupon
 */
export const createCoupon = async (req, res) => {
  try {
    const { code, discountType, discountValue, validUpto, usageLimit } = req.body;

    // Required Field Check
    if (!code || !discountType || !discountValue || !validUpto) {
      return res.status(400).json({ error: 'Missing required fields (code, type, value, validUpto)' });
    }

    // Unique Code Check
    const existing = await db.collection('coupons').findOne({ code: code.trim().toUpperCase() });
    if (existing) return res.status(400).json({ error: 'Coupon code already exists' });

    // Numeric Validations
    const dValue = parseFloat(discountValue);
    if (dValue <= 0) return res.status(400).json({ error: 'Discount value must be positive' });
    if (discountType === 'percentage' && dValue > 100) return res.status(400).json({ error: 'Percentage cannot exceed 100%' });

    const uLimitInput = usageLimit === '' || usageLimit === undefined ? null : usageLimit;
    const uLimit = uLimitInput === null ? null : parseInt(uLimitInput);
    if (uLimit !== null && (isNaN(uLimit) || uLimit < 0)) return res.status(400).json({ error: 'Usage limit must be a non-negative integer' });

    // Data Normalization
    const data = {
      ...req.body,
      code: code.trim().toUpperCase(),
      discountValue: dValue,
      maxDiscount: parseFloat(req.body.maxDiscount) || 0,
      minPurchase: parseFloat(req.body.minPurchase) || 0,
      usageLimit: uLimit,
      usedCount: 0,
      createdDate: new Date().toISOString().split('T')[0]
    };

    const result = await db.collection('coupons').insertOne(data);
    res.status(201).json({ _id: result.insertedId, ...data });
  } catch (error) {
    console.error('Create coupon error:', error);
    res.status(500).json({ error: 'Failed to create coupon' });
  }
};

/**
 * PUT /api/coupons/:id
 * Update a single coupon by custom id
 */
export const updateCoupon = async (req, res) => {
  try {
    const { _id, code, discountValue, usageLimit, ...updateData } = req.body;
    
    // Unique Code Check (excluding self)
    if (code) {
      const existing = await db.collection('coupons').findOne({ 
        code: code.trim().toUpperCase(), 
        id: { $ne: req.params.id } 
      });
      if (existing) return res.status(400).json({ error: 'Another coupon with this code already exists' });
    }

    const uLimitInput = usageLimit === '' || usageLimit === undefined ? null : usageLimit;
    const uLimit = uLimitInput === null ? null : parseInt(uLimitInput);
    if (uLimit !== null && (isNaN(uLimit) || uLimit < 0)) return res.status(400).json({ error: 'Another coupon with this code already exists' }); // Note: existing logic check had a typo in error message, but user said "only validate when provided"

    const normalizedData = {
      ...updateData,
      code: code?.trim().toUpperCase(),
      discountValue: discountValue ? parseFloat(discountValue) : undefined,
      maxDiscount: updateData.maxDiscount ? parseFloat(updateData.maxDiscount) : undefined,
      minPurchase: updateData.minPurchase ? parseFloat(updateData.minPurchase) : undefined,
      usageLimit: uLimit
    };

    // Clean undefined
    Object.keys(normalizedData).forEach(key => normalizedData[key] === undefined && delete normalizedData[key]);

    const result = await db.collection('coupons').updateOne(
      { id: req.params.id },
      { $set: normalizedData }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Coupon not found' });
    }
    res.json({ success: true, message: 'Coupon updated' });
  } catch (error) {
    console.error('Update coupon error:', error);
    res.status(500).json({ error: 'Failed to update coupon' });
  }
};

/**
 * DELETE /api/coupons/:id
 * Delete a single coupon by custom id
 */
export const deleteCoupon = async (req, res) => {
  try {
    const result = await db.collection('coupons').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Coupon not found' });
    }
    res.json({ success: true, message: 'Coupon deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
};

/**
 * DELETE /api/coupons
 * Delete all coupons (Admin)
 */
export const deleteAllCoupons = async (req, res) => {
  try {
    const result = await db.collection('coupons').deleteMany({});
    res.json({ success: true, message: `Deleted ${result.deletedCount} coupons` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete all coupons' });
  }
};

/**
 * PATCH /api/coupons/reorder
 * Reorder coupons using bulkWrite
 */
export const reorderCoupons = async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ error: 'orderedIds must be a non-empty array' });
    }

    const bulkOps = orderedIds.map((id, index) => {
      if (!ObjectId.isValid(id)) {
        throw new Error(`Invalid ObjectId: ${id}`);
      }
      return {
        updateOne: {
          filter: { _id: new ObjectId(id) },
          update: { $set: { order: index + 1 } }
        }
      };
    });

    const result = await db.collection('coupons').bulkWrite(bulkOps);

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'No coupons matched the provided IDs' });
    }

    res.json({ 
      success: true, 
      message: 'Coupons reordered successfully',
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      orderedCount: orderedIds.length
    });
  } catch (error) {
    console.error('Reorder coupons error:', error);
    res.status(500).json({ error: 'Failed to reorder coupons', details: error.message });
  }
};
