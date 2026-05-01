import mongoose from 'mongoose';
const { ObjectId } = mongoose.Types;
import crypto from 'crypto';
import { getDb } from '../config/db.js';
import { findCourse, getRelatedCourseIds } from '../services/course.service.js';
import { calculatePriceBreakdown } from '../utils/helpers.js';
import { sendEmail, templates } from '../utils/email.js';
import sendSMS from '../utils/sendSMS.js';
import Student from '../models/Student.js';
import { unlockReferralCoins, useCoinsForPurchase } from './referral.controller.js';

function canActForStudent(req, studentId) {
  return req.admin || req.user?.isAdmin || req.user?.role === 'admin' || String(req.user?.studentId) === String(studentId);
}

const getStudentFilter = (studentId) => {
  return {
    $or: [
      { id: studentId },
      ...(ObjectId.isValid(studentId) ? [{ _id: new ObjectId(studentId) }] : []),
      { userId: studentId }
    ]
  };
};

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

    const student = await db.collection('students').findOne(getStudentFilter(studentId));
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const course = await findCourse(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    let coupon = null;
    if (couponCode) {
      coupon = await db.collection('coupons').findOne({ code: couponCode });
    }

    const breakdown = calculatePriceBreakdown(course, coupon);
    if (breakdown.isInvalid) {
      return res.status(400).json({ error: breakdown.invalidReason });
    }

    // Coin redemption logic
    const coinsUsed = req.body.coinsUsed || 0;
    let coinDiscount = 0;
    if (coinsUsed > 0) {
      const available = student?.availableCoins || 0;
      const actualCoinsToUse = Math.min(coinsUsed, available);
      coinDiscount = actualCoinsToUse / 10; // 10 coins = 1 INR
    }

    const finalAmount = Math.max(0, breakdown.totalAmount - coinDiscount);

    if (finalAmount <= 0 && breakdown.totalAmount > 0) {
       // Allow zero amount if coins cover it
    } else if (finalAmount <= 0) {
      return res.status(400).json({ error: 'This course is free or discounted to zero, use manual enrollment' });
    }

    const orderData = {
      amount: Math.round(finalAmount * 100),
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        courseId: course.id || course._id.toString(),
        studentId,
        couponCode: couponCode || '',
        coinsUsed: coinsUsed || 0,
        coinDiscount: coinDiscount,
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
          const student = await db.collection('students').findOne(getStudentFilter(studentId));
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
          const student = await db.collection('students').findOne(getStudentFilter(studentId));
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
    if (breakdown.isInvalid) {
      console.warn(`[PAYMENT] Coupon ${couponCode} became invalid at fulfillment: ${breakdown.invalidReason}`);
    }

    const student = await db.collection('students').findOne(getStudentFilter(studentId));
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const enrolledCourses = student.enrolledCourses || [];

    // Idempotency: Check if this payment was already processed
    const existingPurchase = await db.collection('purchases').findOne({ razorpayPaymentId: razorpay_payment_id });
    if (existingPurchase) {
      return res.status(201).json({ success: true, purchase: existingPurchase, alreadyProcessed: true });
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

    // Increment coupon usage if applicable
    if (coupon && breakdown.discountAmount > 0) {
      await db.collection('coupons').updateOne(
        { id: coupon.id },
        { $inc: { usedCount: 1 } }
      );
    }

    if (enrolledCourses.includes(actualCourseId)) {
      // Already enrolled, but this is a new purchase record (manual or retry)
      // Usually verifyRazorpayPayment shouldn't hit this if existingPurchase check above works
    } else {
      // Get linked test series IDs (Bidirectional & Multi-ID matching)
      const directLinkedSeriesIds = (course.content?.testSeries || []).filter(id => id && typeof id === 'string');
      
      const batchVariants = await getRelatedCourseIds(course, actualCourseId);

      const [reverseSeriesColl, reverseSeriesTests] = await Promise.all([
        db.collection('testSeries').find({
          $or: [
            { courseId: { $in: batchVariants } },
            { courseIds: { $in: batchVariants } }
          ]
        }).toArray(),
        db.collection('tests').find({
          isSeries: true,
          $or: [
            { courseId: { $in: batchVariants } },
            { courseIds: { $in: batchVariants } }
          ]
        }).toArray()
      ]);

      const reverseLinkedSeriesIds = [
        ...reverseSeriesColl.map(ts => ts.id || ts._id.toString()),
        ...reverseSeriesTests.map(ts => ts.id || ts._id.toString())
      ];
      const allLinkedSeriesIds = [...new Set([...directLinkedSeriesIds, ...reverseLinkedSeriesIds])];

      await db.collection('students').updateOne(
        getStudentFilter(studentId),
        { $addToSet: { enrolledCourses: { $each: [actualCourseId, ...batchVariants, ...allLinkedSeriesIds] } } }
      );

      // Coin Deduction (Internal Helper)
      const maxCoinsAllowed = Math.floor((breakdown.totalAmount || 0) * 10);
      const coinsToDeduct = Math.min(req.body.coinsUsed || 0, maxCoinsAllowed);
      if (coinsToDeduct > 0) {
        await useCoinsForPurchase(studentId, coinsToDeduct);
      }

      // Referral Unlock Logic (STRICT FIRST PURCHASE ONLY)
      const previousPurchases = await db.collection('purchases').countDocuments({ 
        studentId, 
        status: 'completed',
        id: { $ne: purchase.id } 
      });

      if (previousPurchases === 0) {
        // This is the first purchase
        await unlockReferralCoins(studentId, purchase.id);
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
    const { studentId, courseId, amount, paymentMethod, referralCode, couponCode } = req.body;
    if (!studentId || !courseId) {
      return res.status(400).json({ error: 'studentId and courseId are required' });
    }

    // ROLE-AWARE SECURITY GUARD:
    // 1. Admins can always create manual purchases (existing behavior).
    // 2. Students can only proceed if the server-side verified payable amount is ₹0.
    const isAdmin = req.admin || req.user?.isAdmin || req.user?.role === 'admin';
    
    if (!canActForStudent(req, studentId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const student = await db.collection('students').findOne(getStudentFilter(studentId));
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const enrolledCourses = Array.isArray(student.enrolledCourses) ? student.enrolledCourses : [];

    let course = await findCourse(courseId);
    if (!course) {
      try {
        if (ObjectId.isValid(courseId)) {
          course = await db.collection('courses').findOne({ _id: new ObjectId(courseId) });
        }
      } catch (e) { }
    }

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Resolve Coupon and Price Breakdown
    let coupon = null;
    if (couponCode) {
      coupon = await db.collection('coupons').findOne({ code: couponCode });
    }

    const breakdown = calculatePriceBreakdown(course, coupon);
    if (breakdown.isInvalid && couponCode) {
      return res.status(400).json({ error: breakdown.invalidReason });
    }

    // Resolve Coins Redemption
    const coinsUsed = req.body.coinsUsed || 0;
    let coinDiscount = 0;
    if (coinsUsed > 0) {
      const available = student?.availableCoins || 0;
      const actualCoinsToUse = Math.min(coinsUsed, available);
      coinDiscount = actualCoinsToUse / 10;
    }

    const finalPayableAmount = Math.max(0, breakdown.totalAmount - coinDiscount);

    // SERVER-SIDE INDEPENDENT PRICE VERIFICATION (STRICT BYPASS PROTECTION)
    if (!isAdmin) {
      // If server says price > 0, the student MUST use Razorpay flow.
      if (finalPayableAmount > 0) {
        console.warn(`[SECURITY] Student ${studentId} attempted payment bypass for course ${courseId}. Verified price: ₹${finalPayableAmount}`);
        return res.status(403).json({ 
          error: 'Paid checkout must be completed through the secure payment gateway.',
          code: 'PAYMENT_GATEWAY_REQUIRED'
        });
      }
    }

    const actualCourseId = course.id || course._id.toString();

    const purchase = {
      id: `purchase_${Date.now()}`,
      studentId,
      courseId: actualCourseId,
      courseName: course.name || course.title,
      amount: isAdmin ? (typeof amount === 'number' ? amount : finalPayableAmount) : finalPayableAmount,
      basePrice: breakdown.basePrice,
      gstAmount: breakdown.gstAmount,
      gstPercentage: breakdown.gstPercentage,
      discountAmount: breakdown.discountAmount,
      coinDiscount: coinDiscount,
      coinsUsed: coinsUsed,
      couponCode: coupon?.code || '',
      paymentMethod: paymentMethod || 'online',
      referralCode: referralCode || null,
      status: 'completed',
      createdAt: new Date()
    };

    await db.collection('purchases').insertOne(purchase);

    // Increment coupon usage if applicable
    if (coupon && breakdown.discountAmount > 0) {
      await db.collection('coupons').updateOne(
        { id: coupon.id },
        { $inc: { usedCount: 1 } }
      );
    }

    if (enrolledCourses.includes(actualCourseId)) {
       // Already enrolled
    } else {
       // Get linked test series IDs (Bidirectional & Multi-ID matching)
      const directLinkedSeriesIds = (course.content?.testSeries || []).filter(id => id && typeof id === 'string');
      
      const batchVariants = await getRelatedCourseIds(course, actualCourseId);

      const [reverseSeriesColl, reverseSeriesTests] = await Promise.all([
        db.collection('testSeries').find({
          $or: [
            { courseId: { $in: batchVariants } },
            { courseIds: { $in: batchVariants } }
          ]
        }).toArray(),
        db.collection('tests').find({
          isSeries: true,
          $or: [
            { courseId: { $in: batchVariants } },
            { courseIds: { $in: batchVariants } }
          ]
        }).toArray()
      ]);

      const reverseLinkedSeriesIds = [
        ...reverseSeriesColl.map(ts => ts.id || ts._id.toString()),
        ...reverseSeriesTests.map(ts => ts.id || ts._id.toString())
      ];
      const allLinkedSeriesIds = [...new Set([...directLinkedSeriesIds, ...reverseLinkedSeriesIds])];

      await db.collection('students').updateOne(
        getStudentFilter(studentId),
        { $addToSet: { enrolledCourses: { $each: [actualCourseId, ...batchVariants, ...allLinkedSeriesIds] } } }
      );

      // Coin Deduction
      const coursePrice = course ? course.price : 0;
      const maxCoinsAllowed = Math.floor(coursePrice * 10);
      const coinsToDeduct = Math.min(req.body.coinsUsed || 0, maxCoinsAllowed);
      if (coinsToDeduct > 0) {
        await useCoinsForPurchase(studentId, coinsToDeduct);
      }

      // Referral Unlock (FIRST PURCHASE ONLY)
      const previousPurchases = await db.collection('purchases').countDocuments({ 
        studentId, 
        status: 'completed',
        id: { $ne: purchase.id } 
      });

      if (previousPurchases === 0) {
        await unlockReferralCoins(studentId, purchase.id);
      }
    }

    res.status(201).json({ success: true, purchase });
  } catch (error) {
    console.error('Error recording purchase:', error);
    res.status(500).json({ error: 'Failed to record purchase' });
  }
};
