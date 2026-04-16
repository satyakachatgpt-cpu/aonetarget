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

    const coupon = await db.collection('coupons').findOne({ code: code, status: 'active' });
    if (!coupon) return res.status(404).json({ error: 'Invalid or expired coupon code' });

    const course = await findCourse(courseId);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const breakdown = calculatePriceBreakdown(course, coupon);
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
    const result = await db.collection('coupons').insertOne(req.body);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create coupon' });
  }
};

/**
 * PUT /api/coupons/:id
 * Update a single coupon by custom id
 */
export const updateCoupon = async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const result = await db.collection('coupons').updateOne(
      { id: req.params.id },
      { $set: updateData }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Coupon not found' });
    }
    res.json({ success: true, message: 'Coupon updated' });
  } catch (error) {
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
