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

async function canActForStudent(req, studentId, db) {
  if (req.admin || req.user?.isAdmin || req.user?.role === 'admin') return true;
  const tokenStudentId = req.user?.studentId || req.user?.id || req.user?._id;
  if (!tokenStudentId) return false;
  if (String(tokenStudentId) === String(studentId)) return true;

  if (db) {
    try {
      const student = await db.collection('students').findOne(getStudentFilter(studentId));
      if (student) {
        const variants = [
          String(student._id),
          student.id,
          student.userId
        ].filter(Boolean);
        if (variants.includes(String(tokenStudentId))) return true;
      }
    } catch (e) {
      console.error('[canActForStudent] Error checking student variants:', e);
    }
  }
  return false;
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
    const isAuthorized = await canActForStudent(req, studentId, db);
    if (!isAuthorized) {
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
      payment_capture: 1, // Auto-capture payment upon authorization
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
      console.error('Razorpay order creation failed. (Payload omitted for security)');
      return res.status(500).json({ error: order.error?.description || 'Failed to create Razorpay order' });
    }

    const actualCourseId = (course.id || course._id?.toString() || courseId).toString();
    await db.collection('pendingOrders').insertOne({
      orderId: order.id,
      studentId: student.id || String(student._id),
      studentMongoId: String(student._id),
      courseId: actualCourseId,
      amount: finalAmount,
      status: 'created',
      createdAt: new Date()
    }).catch(e => console.warn('[createRazorpayOrder] pendingOrders insert error:', e.message));

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
 * Idempotently fulfills a successful payment.
 * Creates purchase record, updates student.enrolledCourses, handles coupons/coins/referral, and sends notification.
 */
export async function fulfillSuccessfulPayment({
  db,
  orderId,
  paymentId,
  paymentData,
  studentId,
  courseId,
  couponCode,
  coinsUsed = 0,
  referralCode
}) {
  if (!db) db = getDb();

  // 1. Resolve credentials if needed to fetch missing payment or order info
  const settings = await db.collection('settings').findOne({});
  const keyId = (process.env.RAZORPAY_KEY_ID || settings?.razorpayKeyId || '').toString().trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || settings?.razorpayKeySecret || '').toString().trim();
  const auth = (keyId && keySecret) ? Buffer.from(`${keyId}:${keySecret}`).toString('base64') : null;

  // 2. Fetch payment details from Razorpay if not provided
  if (!paymentData && paymentId && auth) {
    try {
      const pRes = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Basic ${auth}` }
      });
      if (pRes.ok) {
        paymentData = await pRes.json();
      }
    } catch (err) {
      console.error('[fulfillSuccessfulPayment] Fetch payment error:', err);
    }
  }

  // 3. If studentId or courseId is missing, attempt to extract from order notes
  if ((!studentId || !courseId) && orderId && auth) {
    try {
      const oRes = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
        headers: { Authorization: `Basic ${auth}` }
      });
      if (oRes.ok) {
        const orderData = await oRes.json();
        studentId = studentId || orderData?.notes?.studentId;
        courseId = courseId || orderData?.notes?.courseId;
        couponCode = couponCode || orderData?.notes?.couponCode;
        if (!coinsUsed && orderData?.notes?.coinsUsed) {
          coinsUsed = Number(orderData.notes.coinsUsed) || 0;
        }
      }
    } catch (err) {
      console.error('[fulfillSuccessfulPayment] Fetch order error:', err);
    }
  }

  // Fallback from paymentData notes
  if (paymentData?.notes) {
    studentId = studentId || paymentData.notes.studentId;
    courseId = courseId || paymentData.notes.courseId;
    couponCode = couponCode || paymentData.notes.couponCode;
    if (!coinsUsed && paymentData.notes.coinsUsed) {
      coinsUsed = Number(paymentData.notes.coinsUsed) || 0;
    }
    referralCode = referralCode || paymentData.notes.referralCode;
  }

  if (!courseId) {
    throw new Error('Course ID could not be identified for payment fulfillment');
  }

  // 5. Look up Course
  let course = await findCourse(courseId);
  if (!course) {
    try {
      if (ObjectId.isValid(courseId)) {
        course = await db.collection('courses').findOne({ _id: new ObjectId(courseId) })
          || await db.collection('tests').findOne({ _id: new ObjectId(courseId) })
          || await db.collection('packages').findOne({ _id: new ObjectId(courseId) });
      }
    } catch (e) { }
  }
  if (!course) {
    throw new Error(`Course not found for ID: ${courseId}`);
  }

  // 6. Look up Student (robust with phone/email fallback)
  let student = studentId ? await db.collection('students').findOne(getStudentFilter(studentId)) : null;
  if (!student && studentId) {
    student = await db.collection('students').findOne({
      $or: [
        { id: String(studentId) },
        { userId: String(studentId) },
        ...(ObjectId.isValid(studentId) ? [{ _id: new ObjectId(studentId) }] : []),
        { phone: String(studentId).replace(/^\+91/, '').trim() }
      ]
    });
  }
  if (!student && paymentData?.contact) {
    const cleanPhone = String(paymentData.contact).replace(/^\+91/, '').trim();
    student = await db.collection('students').findOne({
      $or: [
        { phone: cleanPhone },
        { phone: `+91${cleanPhone}` }
      ]
    });
  }
  if (!student && paymentData?.email) {
    student = await db.collection('students').findOne({
      email: String(paymentData.email).trim().toLowerCase()
    });
  }
  if (!student) {
    throw new Error(`Student not found for ID: ${studentId}`);
  }

  // 7. Calculate Pricing & Discounts
  let coupon = null;
  if (couponCode) {
    coupon = await db.collection('coupons').findOne({ code: couponCode, status: 'active' });
  }
  const breakdown = calculatePriceBreakdown(course, coupon);

  const actualCourseId = (course.id || course._id?.toString() || courseId).toString();
  const actualAmount = paymentData?.amount ? (paymentData.amount / 100) : breakdown.totalAmount;

  let coinDiscount = 0;
  if (coinsUsed > 0) {
    const available = student?.availableCoins || 0;
    const actualCoinsToUse = Math.min(coinsUsed, available);
    coinDiscount = actualCoinsToUse / 10;
  }
  const expectedAmount = Math.max(0, breakdown.totalAmount - coinDiscount);

  // 8. Resolve all enrollment IDs (Course, Related Batches, Linked Series, Child Tests)
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

  const allEnrollmentIds = [
    actualCourseId,
    String(course._id),
    ...(course.id ? [String(course.id)] : []),
    ...(course.slug ? [String(course.slug)] : []),
    ...batchVariants,
    ...allLinkedSeriesIds
  ].filter(Boolean);

  // If this item is a test series, also enroll in all contained individual tests
  if (course.isSeries || course._collection === 'tests' || course._collection === 'testSeries') {
    try {
      const childTests = await db.collection('tests').find({
        testSeriesId: { $in: [actualCourseId, String(course._id), ...(course.id ? [String(course.id)] : [])].filter(Boolean) }
      }).project({ _id: 1, id: 1 }).toArray();
      childTests.forEach(t => {
        if (t._id) allEnrollmentIds.push(String(t._id));
        if (t.id) allEnrollmentIds.push(String(t.id));
      });
    } catch (e) {
      console.warn('[fulfillSuccessfulPayment] Child tests resolution error:', e.message);
    }
  }

  // If this item is a package containing child courses, enroll in all child courses
  if (Array.isArray(course.courses) && course.courses.length > 0) {
    course.courses.forEach(c => allEnrollmentIds.push(String(c)));
  }

  // Deduplicate all enrollment IDs
  const uniqueEnrollmentIds = [...new Set(allEnrollmentIds.map(String))];

  // 9. Check for existing purchase (idempotency)
  const orQueries = [];
  if (paymentId) orQueries.push({ razorpayPaymentId: paymentId });
  if (orderId) orQueries.push({ razorpayOrderId: orderId });
  let existingPurchase = orQueries.length > 0 ? await db.collection('purchases').findOne({ $or: orQueries }) : null;

  if (existingPurchase) {
    if (student) {
      await db.collection('students').updateOne(
        { _id: student._id },
        { 
          $addToSet: { enrolledCourses: { $each: uniqueEnrollmentIds } },
          $set: { updatedAt: new Date() }
        }
      );
    }
    if (orderId) {
      await db.collection('pendingOrders').deleteMany({ orderId }).catch(() => {});
    }
    return { success: true, purchase: existingPurchase, alreadyProcessed: true };
  }

  // 10. Create Purchase Record
  const purchase = {
    id: `purchase_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    razorpayPaymentId: paymentId || paymentData?.id || `pay_${Date.now()}`,
    razorpayOrderId: orderId || paymentData?.order_id || '',
    studentId: student.id || String(student._id),
    studentMongoId: String(student._id),
    studentName: student.name || 'Student',
    studentPhone: student.phone || '',
    studentEmail: student.email || '',
    courseId: actualCourseId,
    courseMongoId: course._id ? String(course._id) : undefined,
    courseName: course.name || course.title || courseId,
    amount: expectedAmount || actualAmount,
    basePrice: breakdown.basePrice,
    gstAmount: breakdown.gstAmount,
    gstPercentage: breakdown.gstPercentage,
    discountAmount: breakdown.discountAmount,
    couponCode: coupon?.code || '',
    paymentMethod: paymentData?.method || 'razorpay',
    referralCode: referralCode || null,
    status: 'completed',
    createdAt: new Date()
  };

  await db.collection('purchases').insertOne(purchase);

  // Clear pending orders
  if (orderId) {
    await db.collection('pendingOrders').deleteMany({ orderId }).catch(() => {});
  }

  // Increment coupon usage
  if (coupon && breakdown.discountAmount > 0) {
    await db.collection('coupons').updateOne(
      { id: coupon.id },
      { $inc: { usedCount: 1 } }
    ).catch(e => console.error('Coupon count increment error:', e));
  }

  // 11. Multi-variant Course & Test Series Enrollment
  await db.collection('students').updateOne(
    { _id: student._id },
    { 
      $addToSet: { enrolledCourses: { $each: uniqueEnrollmentIds } },
      $set: { updatedAt: new Date() }
    }
  );

  // 10. Coin Deduction
  const maxCoinsAllowed = Math.floor((breakdown.totalAmount || 0) * 10);
  const coinsToDeduct = Math.min(coinsUsed || 0, maxCoinsAllowed);
  if (coinsToDeduct > 0) {
    await useCoinsForPurchase(studentId, coinsToDeduct).catch(e => console.error('Coin deduction error:', e));
  }

  // 11. Referral Unlock Logic (First purchase only)
  try {
    const previousPurchases = await db.collection('purchases').countDocuments({
      studentId,
      status: 'completed',
      id: { $ne: purchase.id }
    });
    if (previousPurchases === 0) {
      await unlockReferralCoins(studentId, purchase.id);
    }
  } catch (refErr) {
    console.error('Referral unlock error:', refErr);
  }

  // 12. Email and SMS Confirmation
  if (student.email) {
    const { subject, html } = templates.purchase(student.name || 'Student', purchase.courseName, purchase.amount);
    sendEmail({ to: student.email, subject, html }).catch(e => console.error('Payment email error:', e));
  }
  if (student.phone) {
    const successMsg = 'Your payment of Rs ' + purchase.amount + ' for AoneTarget course is successful. Welcome aboard!';
    sendSMS(student.phone, successMsg, process.env.DLT_PAYMENT_SUCCESS_TEMPLATE_ID)
      .catch(e => console.error('Payment success SMS error:', e));
  }

  return { success: true, purchase };
}

/**
 * Razorpay Payment Verification & Fulfillment
 */
export const verifyRazorpayPayment = async (req, res) => {
  try {
    const db = getDb();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courseId, studentId, referralCode, couponCode, coinsUsed } = req.body;
    const isAuthorized = await canActForStudent(req, studentId, db);
    if (!isAuthorized) {
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
    let paymentData = null;
    try {
      const paymentRes = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
        headers: { 'Authorization': `Basic ${auth}` }
      });
      paymentData = await paymentRes.json();
    } catch (fetchErr) {
      console.error('Razorpay payment fetch error:', fetchErr);
      return res.status(500).json({ error: 'Unable to connect to payment gateway' });
    }

    // Auto-capture if payment is authorized but not yet captured
    if (paymentData && paymentData.status === 'authorized') {
      try {
        const captureRes = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}/capture`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${auth}`
          },
          body: JSON.stringify({
            amount: paymentData.amount,
            currency: 'INR'
          })
        });
        if (captureRes.ok) {
          paymentData = await captureRes.json();
        }
      } catch (capErr) {
        console.error('Razorpay auto-capture error:', capErr);
      }
    }

    if (!paymentData || paymentData.status !== 'captured') {
      console.error('Payment not captured.', paymentData?.status);
      if (studentId && courseId) {
        try {
          const student = await db.collection('students').findOne(getStudentFilter(studentId));
          const course = await findCourse(courseId);
          if (student && student.email && course) {
            const { subject, html } = templates.paymentFailed(student.name || 'Student', course.name || course.title, course.price, paymentData?.error?.description || 'Payment was not captured');
            sendEmail({ to: student.email, subject, html }).catch(e => console.error('Payment failure email error:', e));

            const failMessage = 'Your payment of Rs ' + course.price + ' for AoneTarget course has failed. Please try again or contact support.';
            sendSMS(student.phone, failMessage, process.env.DLT_PAYMENT_FAILED_TEMPLATE_ID)
              .catch(e => console.error('Payment failure SMS error:', e));
          }
        } catch (e) { }
      }
      return res.status(400).json({ error: 'Payment not captured or failed' });
    }

    const result = await fulfillSuccessfulPayment({
      db,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      paymentData,
      studentId,
      courseId,
      couponCode,
      coinsUsed,
      referralCode
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Razorpay verification error:', error);
    res.status(500).json({ error: error.message || 'Payment verification failed' });
  }
};

/**
 * Auto-recovery endpoint: Checks Razorpay directly for an order's payment status.
 * If captured, automatically fulfills the purchase and enrolls the student.
 */
export const checkAndFulfillOrder = async (req, res) => {
  try {
    const db = getDb();
    const { orderId, studentId, courseId } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }

    if (studentId) {
      const isAuthorized = await canActForStudent(req, studentId, db);
      if (!isAuthorized) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    // 1. Check if already fulfilled in database
    const existingPurchase = await db.collection('purchases').findOne({ razorpayOrderId: orderId });
    if (existingPurchase) {
      if (studentId && existingPurchase.courseId) {
        await db.collection('students').updateOne(
          getStudentFilter(studentId),
          { $addToSet: { enrolledCourses: existingPurchase.courseId } }
        );
      }
      return res.json({ success: true, enrolled: true, purchase: existingPurchase, alreadyProcessed: true });
    }

    // 2. Fetch Razorpay credentials
    const settings = await db.collection('settings').findOne({});
    const keyId = (process.env.RAZORPAY_KEY_ID || settings?.razorpayKeyId || '').toString().trim();
    const keySecret = (process.env.RAZORPAY_KEY_SECRET || settings?.razorpayKeySecret || '').toString().trim();

    if (!keyId || !keySecret) {
      return res.status(500).json({ error: 'Razorpay credentials not configured' });
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    // 3. Query Razorpay API for payments on this order
    const paymentsRes = await fetch(`https://api.razorpay.com/v1/orders/${orderId}/payments`, {
      headers: { Authorization: `Basic ${auth}` }
    });

    if (!paymentsRes.ok) {
      const errData = await paymentsRes.json();
      return res.status(paymentsRes.status).json({ error: errData.error?.description || 'Failed to query Razorpay order payments' });
    }

    const paymentsData = await paymentsRes.json();
    const paymentItems = Array.isArray(paymentsData.items) ? paymentsData.items : [];

    // Find any captured payment, or authorized payment to capture
    let successfulPayment = paymentItems.find(p => p.status === 'captured');

    if (!successfulPayment) {
      const authorizedPayment = paymentItems.find(p => p.status === 'authorized');
      if (authorizedPayment) {
        try {
          const capRes = await fetch(`https://api.razorpay.com/v1/payments/${authorizedPayment.id}/capture`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${auth}`
            },
            body: JSON.stringify({
              amount: authorizedPayment.amount,
              currency: authorizedPayment.currency || 'INR'
            })
          });
          if (capRes.ok) {
            successfulPayment = await capRes.json();
          }
        } catch (capErr) {
          console.error('[checkAndFulfillOrder] Auto-capture failed:', capErr);
        }
      }
    }

    if (!successfulPayment) {
      return res.json({
        success: false,
        enrolled: false,
        message: 'No captured payment found for this order yet'
      });
    }

    // 4. Fulfill purchase
    const result = await fulfillSuccessfulPayment({
      db,
      orderId,
      paymentId: successfulPayment.id,
      paymentData: successfulPayment,
      studentId: studentId || successfulPayment.notes?.studentId,
      courseId: courseId || successfulPayment.notes?.courseId,
      couponCode: successfulPayment.notes?.couponCode,
      coinsUsed: Number(successfulPayment.notes?.coinsUsed) || 0,
      referralCode: successfulPayment.notes?.referralCode
    });

    return res.json({ success: true, enrolled: true, purchase: result.purchase });
  } catch (error) {
    console.error('[checkAndFulfillOrder] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to check order' });
  }
};

/**
 * Razorpay Webhook Handler
 * Listens for order.paid and payment.captured events and fulfills purchase automatically.
 */
export const handleRazorpayWebhook = async (req, res) => {
  try {
    const db = getDb();
    const settings = await db.collection('settings').findOne({});
    const webhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || settings?.razorpayKeySecret || '').toString().trim();
    const signature = req.headers['x-razorpay-signature'];

    // Verify webhook signature if secret and signature are present
    if (webhookSecret && signature && req.rawBody) {
      const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(req.rawBody).digest('hex');
      if (signature !== expectedSignature) {
        console.warn('[Razorpay Webhook] Invalid signature received.');
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }
    }

    const event = req.body?.event;
    console.log(`[Razorpay Webhook] Received event: ${event}`);

    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = req.body?.payload?.payment?.entity;
      const orderEntity = req.body?.payload?.order?.entity;

      const orderId = orderEntity?.id || paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;
      const studentId = paymentEntity?.notes?.studentId || orderEntity?.notes?.studentId;
      const courseId = paymentEntity?.notes?.courseId || orderEntity?.notes?.courseId;
      const couponCode = paymentEntity?.notes?.couponCode || orderEntity?.notes?.couponCode;
      const coinsUsed = Number(paymentEntity?.notes?.coinsUsed || orderEntity?.notes?.coinsUsed) || 0;
      const referralCode = paymentEntity?.notes?.referralCode || orderEntity?.notes?.referralCode;

      if (orderId || paymentId) {
        await fulfillSuccessfulPayment({
          db,
          orderId,
          paymentId,
          paymentData: paymentEntity,
          studentId,
          courseId,
          couponCode,
          coinsUsed,
          referralCode
        });
        console.log(`[Razorpay Webhook] Successfully fulfilled purchase for order ${orderId}, payment ${paymentId}`);
      }
    }

    // Always respond 200 OK to Razorpay
    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('[Razorpay Webhook] Error:', error);
    return res.status(200).json({ status: 'error', message: error.message });
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
    
    if (!(await canActForStudent(req, studentId, db))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const student = await db.collection('students').findOne(getStudentFilter(studentId));
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const enrolledCourses = Array.isArray(student.enrolledCourses) ? student.enrolledCourses : [];

    // 1. Fetch Course from DB (Strict)
    let course = await findCourse(courseId);
    if (!course) {
      // Fallback for extremely rare legacy cases, but still use DB data if possible
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
      paymentMethod: paymentMethod || 'free',
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

    // Fulfillment logic (Full sync with verifyRazorpayPayment)
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

    const allEnrollmentIds = [
      actualCourseId,
      String(course._id),
      ...(course.id ? [String(course.id)] : []),
      ...(course.slug ? [String(course.slug)] : []),
      ...batchVariants,
      ...allLinkedSeriesIds
    ].filter(Boolean);

    if (course.isSeries || course._collection === 'tests' || course._collection === 'testSeries') {
      try {
        const childTests = await db.collection('tests').find({
          testSeriesId: { $in: [actualCourseId, String(course._id), ...(course.id ? [String(course.id)] : [])].filter(Boolean) }
        }).project({ _id: 1, id: 1 }).toArray();
        childTests.forEach(t => {
          if (t._id) allEnrollmentIds.push(String(t._id));
          if (t.id) allEnrollmentIds.push(String(t.id));
        });
      } catch (e) {}
    }

    if (Array.isArray(course.courses) && course.courses.length > 0) {
      course.courses.forEach(c => allEnrollmentIds.push(String(c)));
    }

    const uniqueEnrollmentIds = [...new Set(allEnrollmentIds.map(String))];

    await db.collection('students').updateOne(
      { _id: student._id },
      { 
        $addToSet: { enrolledCourses: { $each: uniqueEnrollmentIds } },
        $set: { updatedAt: new Date() }
      }
    );

    // Coin Deduction (Only if truly covering the cost and approved by server)
    const maxCoinsAllowed = Math.floor((breakdown.totalAmount || 0) * 10);
    const coinsToDeduct = Math.min(coinsUsed || 0, maxCoinsAllowed);
    if (coinsToDeduct > 0 && finalPayableAmount === 0) {
      await useCoinsForPurchase(studentId, coinsToDeduct).catch(() => {});
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

    res.status(201).json({ success: true, purchase });
  } catch (error) {
    console.error('Error recording purchase:', error);
    res.status(500).json({ error: 'Failed to record purchase' });
  }
};
