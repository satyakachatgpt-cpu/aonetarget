import mongoose from 'mongoose';
const { ObjectId } = mongoose.Types;
import crypto from 'crypto';
import { getDb } from '../config/db.js';
import { findCourse } from '../services/course.service.js';
import { calculatePriceBreakdown } from '../utils/helpers.js';
import { sendEmail, templates } from '../utils/email.js';
import sendSMS from '../utils/sendSMS.js';
import Student from '../models/Student.js';

function canActForStudent(req, studentId) {
  return req.admin || req.user?.isAdmin || req.user?.role === 'admin' || String(req.user?.studentId) === String(studentId);
}

/**
 * Razorpay Order Creation (Mirrored from server.js)
 */
export const createRazorpayOrder = async (req, res) => {
  try {
    const db = getDb();
    const { courseId, studentId, couponCode } = req.body;
    if (!courseId || !studentId) {
      return res.status(400).json({ error: 'courseId and studentId are required' });
    }
    if (!canActForStudent(req, studentId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Get credentials from env or DB settings
    const settings = await db.collection('settings').findOne({});

    let keyId = process.env.RAZORPAY_KEY_ID;
    let keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Fallback if env vars aren't set
    if (!keyId || keyId.trim() === '') keyId = settings?.razorpayKeyId;
    if (!keySecret || keySecret.trim() === '') keySecret = settings?.razorpayKeySecret;

    keyId = (keyId || '').toString().trim();
    keySecret = (keySecret || '').toString().trim();

    if (!keyId || !keySecret) {
      return res.status(500).json({ error: 'Razorpay keys missing from .env and settings collection.' });
    }

    const student = await db.collection('students').findOne({ id: studentId });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const course = await findCourse(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    let coupon = null;
    if (couponCode) {
      coupon = await db.collection('coupons').findOne({ code: couponCode, status: 'active' });
    }

    const breakdown = calculatePriceBreakdown(course, coupon);

    if (breakdown.totalAmount <= 0) {
      return res.status(400).json({ error: 'This course is free or discounted to zero, use manual enrollment' });
    }

    const orderData = {
      amount: Math.round(breakdown.totalAmount * 100),
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        courseId: course.id || course._id.toString(),
        studentId,
        couponCode: couponCode || '',
        basePrice: breakdown.basePrice,
        gstAmount: breakdown.gstAmount,
        discountAmount: breakdown.discountAmount
      }
    };

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify(orderData)
    });

    const order = await response.json();
    if (!response.ok) {
      console.error('Razorpay order creation failed:', order);
      return res.status(500).json({ error: order.error?.description || 'Failed to create Razorpay order' });
    }

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
      breakdown
    });
  } catch (error) {
    console.error('Razorpay order error:', error);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
};

/**
 * Razorpay Payment Verification & Fulfillment (Mirrored from server.js)
 */
export const verifyRazorpayPayment = async (req, res) => {
  try {
    const db = getDb();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courseId, studentId, referralCode, couponCode } = req.body;
    if (!canActForStudent(req, studentId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Get credentials (same logic as create-order)
    const settings = await db.collection('settings').findOne({});
    let keyId = (process.env.RAZORPAY_KEY_ID || settings?.razorpayKeyId || '').toString().trim();
    let keySecret = (process.env.RAZORPAY_KEY_SECRET || settings?.razorpayKeySecret || '').toString().trim();

    if (!keyId || !keySecret) {
      return res.status(500).json({ error: 'Razorpay credentials not configured' });
    }

    const generated_signature = crypto.createHmac('sha256', keySecret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      // Send Failure Email if studentId and courseId are present
      if (studentId && courseId) {
        try {
          const student = await db.collection('students').findOne({ id: studentId });
          const course = await findCourse(courseId);
          if (student && student.email && course) {
            const { subject, html } = templates.paymentFailed(student.name || 'Student', course.name || course.title, course.price, 'Invalid payment signature');
            sendEmail({ to: student.email, subject, html }).catch(e => console.error('Payment failure email error:', e));

            const failMessage = 'Your payment of Rs ' + course.price + ' for AoneTarget course has failed. Please try again or contact support.';
            sendSMS(student.phone, failMessage, process.env.DLT_PAYMENT_FAILED_TEMPLATE_ID)
              .catch(e => console.error('Payment failure SMS error:', e));
          }
        } catch (e) { }
      }
      return res.status(400).json({ error: 'Payment verification failed - invalid signature' });
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const paymentRes = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
      headers: { 'Authorization': `Basic ${auth}` }
    });
    const paymentData = await paymentRes.json();

    if (!paymentRes.ok || paymentData.status !== 'captured') {
      console.error('Payment not captured:', paymentData);
      // Send Failure Email
      if (studentId && courseId) {
        try {
          const student = await db.collection('students').findOne({ id: studentId });
          const course = await findCourse(courseId);
          if (student && student.email && course) {
            const { subject, html } = templates.paymentFailed(student.name || 'Student', course.name || course.title, course.price, paymentData.error?.description || 'Payment was not captured');
            sendEmail({ to: student.email, subject, html }).catch(e => console.error('Payment failure email error:', e));

            const failMessage = 'Your payment of Rs ' + course.price + ' for AoneTarget course has failed. Please try again or contact support.';
            sendSMS(student.phone, failMessage, process.env.DLT_PAYMENT_FAILED_TEMPLATE_ID)
              .catch(e => console.error('Payment failure SMS error:', e));
          }
        } catch (e) { }
      }
      return res.status(400).json({ error: 'Payment not captured or failed' });
    }

    let course = await findCourse(courseId);
    if (!course) {
      try {
        if (ObjectId.isValid(courseId)) {
          course = await db.collection('courses').findOne({ _id: new ObjectId(courseId) });
        }
      } catch (e) { }
    }

    if (!course) return res.status(404).json({ error: 'Course not found during fulfillment' });

    let coupon = null;
    if (couponCode) {
      coupon = await db.collection('coupons').findOne({ code: couponCode, status: 'active' });
    }

    const breakdown = calculatePriceBreakdown(course, coupon);

    const student = await db.collection('students').findOne({ id: studentId });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const actualCourseId = course.id || courseId;
    const actualAmount = paymentData.amount / 100;

    const purchase = {
      id: `purchase_${Date.now()}`,
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      studentId,
      courseId: actualCourseId,
      courseName: course.name || course.title || courseId,
      amount: breakdown.totalAmount || actualAmount,
      basePrice: breakdown.basePrice,
      gstAmount: breakdown.gstAmount,
      gstPercentage: breakdown.gstPercentage,
      discountAmount: breakdown.discountAmount,
      couponCode: coupon?.code || '',
      paymentMethod: paymentData.method || 'razorpay',
      referralCode: referralCode || null,
      status: 'completed',
      createdAt: new Date()
    };

    await db.collection('purchases').insertOne(purchase);

    const enrolledCourses = student.enrolledCourses || [];
    if (!enrolledCourses.includes(actualCourseId)) {
      await db.collection('students').updateOne(
        { id: studentId },
        { $addToSet: { enrolledCourses: actualCourseId } }
      );
    }

    if (referralCode) {
      const referral = await db.collection('referrals').findOne({ referralCode });
      if (referral) {
        const referralSettings = await db.collection('referralSettings').findOne({}) || { commissionType: 'fixed', commissionValue: 50 };
        let earning = referralSettings.commissionValue || 50;
        if (referralSettings.commissionType === 'percentage') {
          earning = Math.round((purchase.amount * referralSettings.commissionValue) / 100);
        }
        const alreadyReferred = referral.referredStudents && referral.referredStudents.some(r => r.studentId === studentId);
        if (!alreadyReferred) {
          await db.collection('referrals').updateOne(
            { referralCode },
            {
              $push: { referredStudents: { studentId, studentName: student.name || 'Unknown', date: new Date(), earning, status: 'pending' } },
              $inc: { pendingEarnings: earning }
            }
          );
        }
      }
    }

    // Send Payment Success Email
    if (student.email) {
      const { subject, html } = templates.purchase(student.name || 'Student', purchase.courseName, purchase.amount);
      sendEmail({ to: student.email, subject, html }).catch(e => console.error('Payment email error:', e));
    }

    if (student.phone) {
      const successMsg = 'Your payment of Rs ' + purchase.amount + ' for AoneTarget course is successful. Welcome aboard!';
      sendSMS(student.phone, successMsg, process.env.DLT_PAYMENT_SUCCESS_TEMPLATE_ID)
        .catch(e => console.error('Payment success SMS error:', e));
    }

    res.status(201).json({ success: true, purchase });
  } catch (error) {
    console.error('Razorpay verification error:', error);
    res.status(500).json({ error: 'Payment verification failed' });
  }
};

/**
 * Manual/Legacy Purchase Creation (Mirrored from server.js)
 */
export const createPurchase = async (req, res) => {
  try {
    const db = getDb();
    const { studentId, courseId, amount, paymentMethod, referralCode } = req.body;
    if (!studentId || !courseId) {
      return res.status(400).json({ error: 'studentId and courseId are required' });
    }
    if (!canActForStudent(req, studentId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const student = await db.collection('students').findOne({ id: studentId });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    let course = await findCourse(courseId);
    if (!course) {
      try {
        if (ObjectId.isValid(courseId)) {
          course = await db.collection('courses').findOne({ _id: new ObjectId(courseId) });
        }
      } catch (e) { }
    }
    const actualCourseId = course ? (course.id || courseId) : courseId;

    const purchase = {
      id: `purchase_${Date.now()}`,
      studentId,
      courseId: actualCourseId,
      courseName: course ? (course.name || course.title) : courseId,
      amount: amount || (course ? course.price : 0),
      paymentMethod: paymentMethod || 'online',
      referralCode: referralCode || null,
      status: 'completed',
      createdAt: new Date()
    };

    await db.collection('purchases').insertOne(purchase);

    const enrolledCourses = student.enrolledCourses || [];
    if (!enrolledCourses.includes(actualCourseId)) {
      await db.collection('students').updateOne(
        { id: studentId },
        { $addToSet: { enrolledCourses: actualCourseId } }
      );
    }

    if (referralCode) {
      const referral = await db.collection('referrals').findOne({ referralCode });
      if (referral) {
        const settings = await db.collection('referralSettings').findOne({}) || { commissionType: 'fixed', commissionValue: 50 };
        let earning = settings.commissionValue || 50;
        if (settings.commissionType === 'percentage') {
          earning = Math.round((purchase.amount * settings.commissionValue) / 100);
        }

        const alreadyReferred = referral.referredStudents && referral.referredStudents.some(r => r.studentId === studentId);
        if (!alreadyReferred) {
          const referredEntry = {
            studentId,
            studentName: student.name || 'Unknown',
            date: new Date(),
            earning,
            status: 'pending'
          };
          await db.collection('referrals').updateOne(
            { referralCode },
            {
              $push: { referredStudents: referredEntry },
              $inc: { pendingEarnings: earning }
            }
          );
        }
      }
    }

    res.status(201).json({ success: true, purchase });
  } catch (error) {
    console.error('Error recording purchase:', error);
    res.status(500).json({ error: 'Failed to record purchase' });
  }
};
