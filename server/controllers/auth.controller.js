import bcrypt from 'bcrypt';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { performance } from 'perf_hooks';
const { ObjectId } = mongoose.Types;

import { generateTokens, generateAdminToken, generateDeviceId, verifyRefreshToken } from '../middleware/auth.js';
import { recordAttempt, GENERIC_AUTH_ERROR } from '../middleware/security.js';
import { sendEmail, templates } from '../utils/email.js';
import sendSMS from '../utils/sendSMS.js';
import { findStudent, findAdmin } from '../services/user.service.js';
import { getDb } from '../config/db.js';
import Student from '../models/Student.js';
import * as authService from '../services/auth.service.js';

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const REFRESH_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

function shouldExposeOtp() {
  // CRITICAL: Never expose OTP in API responses
  return false;
}

const isProduction = process.env.NODE_ENV === 'production';

function sanitizeStudent(student) {
  const raw = typeof student.toObject === 'function' ? student.toObject() : { ...student };
  delete raw.password;
  delete raw.sessionToken;
  return raw;
}

function getRealIP(req) {
  let ip = req.headers['cf-connecting-ip'] || 
           req.headers['x-real-ip'] || 
           (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) || 
           req.ip || 
           req.socket?.remoteAddress || 
           req.connection?.remoteAddress ||
           '127.0.0.1';

  // Normalize localhost/IPv6-mapped IPv4
  if (ip === '::1' || ip === '::ffff:127.0.0.1') return '127.0.0.1';
  if (ip.startsWith('::ffff:')) return ip.replace('::ffff:', '');
  
  return ip;
}

/**
 * Hardened Password Verification with Auto-Migration
 * Handles both bcrypt and legacy plaintext passwords
 */
async function verifyAndMigratePassword(db, user, plainPassword, collectionName, label) {
  if (!user || !user.password || !plainPassword) return false;

  // 1. Standard Hashed Verification
  if (user.password.startsWith('$2')) {
    return await bcrypt.compare(plainPassword, user.password);
  }

  // 2. Legacy Plaintext Fallback (Exact Match Only)
  if (user.password === plainPassword) {
    try {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(plainPassword, salt);
      await db.collection(collectionName).updateOne({ _id: user._id }, { $set: { password: hashedPassword } });
      console.log(`[SECURITY] ${label} password migrated to bcrypt.`);
      return true;
    } catch (migError) {
      console.error(`[SECURITY ERROR] Failed to migrate password for ${label}:`, migError);
      return true; // Still return true because verification was successful
    }
  }

  return false;
}

function setRefreshCookie(res, refreshToken) {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/refresh',
    maxAge: REFRESH_EXPIRY_MS
  });
}

function setAccessCookie(res, accessToken) {
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api',
    maxAge: 15 * 60 * 1000
  });
}

async function persistRefreshToken(db, refreshToken, student, ip) {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await db.collection('refresh_tokens').insertOne({
    tokenHash,
    studentId: student.id || student._id?.toString(),
    ip,
    expiresAt: new Date(Date.now() + REFRESH_EXPIRY_MS),
    createdAt: new Date()
  });
}

async function issueStudentSession(req, res, db, student, deviceId) {
  const { accessToken, refreshToken } = generateTokens(student);
  const ip = getRealIP(req);
  const deviceName = req.body.deviceName || 'Unknown Device';

  await persistRefreshToken(db, refreshToken, student, ip);
  
  // Sync device info on successful login
  if (student._id && deviceId) {
    const incomingDeviceName = req.body.deviceName || req.headers['user-agent'] || 'Unknown Device';
    const incomingDeviceType = req.body.deviceType || 'Browser Device';

    const updated = await db.collection('students').findOneAndUpdate(
      { _id: student._id },
      { 
        $set: { 
          activeDeviceId: deviceId,
          activeDeviceName: incomingDeviceName,
          activeDeviceType: incomingDeviceType,
          activeDeviceIP: ip,
          activeDeviceLastLoginAt: new Date(),
          updatedAt: new Date()
        } 
      },
      { returnDocument: 'after' }
    );

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEVICE-IP-DEBUG] issueStudentSession', {
        studentId: student.id || student._id,
        ipBefore: student.activeDeviceIP,
        ipAfter: updated?.activeDeviceIP,
        incomingIP: ip
      });
    }
  }

  setAccessCookie(res, accessToken);
  setRefreshCookie(res, refreshToken);
  return {
    student: sanitizeStudent(student),
    accessToken,
    refreshToken,
    deviceId
  };
}

function otpPurposeFromRequest(req) {
  if (req.body?.purpose === 'signup' || req.path.includes('/signup')) return 'signup';
  if (req.body?.purpose === 'reset' || req.path.includes('/forgot-password')) return 'reset';
  return 'login';
}

/**
 * Admin Login Controller
 */
export const adminLogin = async (req, res) => {
  const { adminId, password } = req.body;
  const ip = req.ip || req.connection.remoteAddress;

  // Check DB readiness
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ 
      success: false, 
      error: 'Database connection is not ready. Please try again in few seconds.' 
    });
  }

  const db = mongoose.connection.db;

  try {
    const admin = await db.collection('admins').findOne({ adminId: adminId?.trim() });
    const isMatch = await verifyAndMigratePassword(db, admin, password, 'admins', `Admin ${adminId}`);

    if (!isMatch) {
      await recordAttempt(adminId, ip, false);
      return res.status(401).json({ error: GENERIC_AUTH_ERROR });
    }

    await recordAttempt(adminId, ip, true);
    console.log(`[LOGIN SUCCESS] Admin: ${adminId}, Name: ${admin.name}`);
    
    const adminToken = generateAdminToken(admin);

    // Set Access Token cookie for unified auth handling (Stabilization)
    res.cookie('accessToken', adminToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 18 * 60 * 60 * 1000, // 18 hours matching token expiry
      path: '/api'
    });

    res.json({
      success: true,
      message: 'Login successful',
      adminId: admin.adminId,
      name: admin.name,
      token: adminToken
    });
  } catch (error) {
    console.error('[ADMIN LOGIN ERROR]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Student Login Controller (Standard JWT login)
 */
export const studentLogin = async (req, res) => {
  const { phone, password } = req.body;
  const ip = req.ip || req.connection.remoteAddress;
  const db = getDb();

  try {
    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone and password are required' });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const student = await db.collection('students').findOne({ 
      $or: [{ phone }, { phone: cleanPhone }] 
    });

    const isMatch = await verifyAndMigratePassword(db, student, password, 'students', `Student ${phone}`);

    if (!isMatch) {
      await recordAttempt(phone, ip, false);
      return res.status(401).json({ error: GENERIC_AUTH_ERROR });
    }

    await recordAttempt(phone, ip, true);
    console.log(`[LOGIN SUCCESS] Student: ${phone}, Name: ${student.name}`);

    const deviceId = req.body.deviceId || generateDeviceId();
    const session = await issueStudentSession(req, res, db, student, deviceId);
    res.json({
      success: true,
      message: 'Login successful',
      ...session
    });
  } catch (error) {
    console.error('[STUDENT LOGIN ERROR]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Student Login with Password & Device Lock (Mirrored from server.js)
 */
export const loginWithPassword = async (req, res) => {
  try {
    const db = getDb();
    const { loginId, password, deviceId: incomingDeviceId } = req.body;
    
    if (!loginId || !password) {
      return res.status(400).json({ error: 'Login ID and Password required' });
    }

    let loginQuery = {};
    if (loginId.includes('@')) {
      loginQuery = { email: loginId.toLowerCase().trim() };
    } else if (/^\d+$/.test(loginId)) {
      loginQuery = { phone: loginId.replace(/\D/g, '') };
    } else {
      loginQuery = { $or: [{ username: loginId }, { userId: loginId }] };
    }

    const student = await db.collection('students').findOne(loginQuery);

    if (!student) {
      return res.status(401).json({ error: 'Student not found with this ID or Mobile Number' });
    }

    if (!student.password) {
      return res.status(401).json({ error: 'Password not set for this account. Please contact admin.' });
    }

    const isMatch = await verifyAndMigratePassword(db, student, password, 'students', `Student ${loginId}`);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    if (student.status === 'inactive') {
      return res.status(403).json({ error: 'Your account is currently inactive. Contact support.' });
    }

    if (!incomingDeviceId) {
      return res.status(400).json({ error: 'Device ID is required for secure login' });
    }

    const incomingDeviceName = req.body.deviceName || req.headers['user-agent'] || 'Unknown Device';
    const incomingDeviceType = req.body.deviceType || 'Browser Device';
    const incomingIP = getRealIP(req);

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEVICE-IP-DEBUG] loginWithPassword', {
        headers: {
          host: req.headers.host,
          origin: req.headers.origin,
          xForwardedFor: req.headers['x-forwarded-for'],
          xRealIp: req.headers['x-real-ip'],
        },
        reqIp: req.ip,
        socketRemoteAddress: req.socket?.remoteAddress,
        extractedIP: incomingIP,
        studentId: student.id || student._id,
        currentActiveIP: student.activeDeviceIP
      });
    }

    // DEVICE BINDING LOGIC
    const activeDeviceId = student.activeDeviceId || student.deviceId;

    if (!activeDeviceId) {
      // CASE 1: First time login - Bind device
      await db.collection('students').updateOne(
        { _id: student._id },
        { 
          $set: { 
            activeDeviceId: incomingDeviceId, 
            activeDeviceName: incomingDeviceName,
            activeDeviceType: incomingDeviceType,
            activeDeviceIP: incomingIP,
            activeDeviceUserAgent: req.headers['user-agent'],
            activeDeviceRegisteredAt: new Date(),
            activeDeviceLastLoginAt: new Date(),
            deviceId: incomingDeviceId, 
            deviceLocked: true, 
            pendingDeviceId: null 
          } 
        }
      );
    } else if (String(activeDeviceId) === String(incomingDeviceId)) {
      // CASE 2: Same device - Update metadata
      await db.collection('students').updateOne(
        { _id: student._id },
        { 
          $set: { 
            activeDeviceIP: incomingIP,
            activeDeviceLastLoginAt: new Date()
          } 
        }
      );
    } else {
      // CASE 3: Different device - Create pending request
      await db.collection('students').updateOne(
        { _id: student._id },
        { 
          $set: { 
            pendingDeviceId: incomingDeviceId,
            pendingDeviceName: incomingDeviceName,
            pendingDeviceType: incomingDeviceType,
            pendingDeviceIP: incomingIP,
            pendingDeviceUserAgent: req.headers['user-agent'],
            pendingDeviceRequestedAt: new Date(),
            pendingDeviceStatus: 'pending'
          } 
        }
      );
      return res.status(403).json({ 
        success: false,
        requiresApproval: true,
        code: 'DEVICE_APPROVAL_REQUIRED',
        message: 'This account is already linked to another device. Admin approval is required for this new device.',
        deviceName: incomingDeviceName,
        ip: incomingIP
      });
    }

    const session = await issueStudentSession(req, res, db, student, incomingDeviceId);

    res.json({
      success: true,
      ...session
    });
  } catch (error) {
    console.error('Password Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
};

/**
 * Student Registration (Mirrored from server.js)
 */
export const registerStudent = async (req, res) => {
  try {
    const db = getDb();
    const { name, email, phone, username, class: studentClass, target, address, state, district, gender, dob, password, higherEducation } = req.body;

    if (!name || !phone || !email) {
      return res.status(400).json({ error: 'Name, email, and phone are required' });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const stored = await authService.getValidOtp(cleanPhone, 'signup');
    
    if (!stored || !stored.verified) {
      return res.status(400).json({ error: 'Please verify your phone number with OTP first' });
    }

    const normalizedEmail = email ? email.toLowerCase().trim() : '';

    const existingStudent = await Student.findOne({
      $or: [
        { phone: cleanPhone },
        ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
        ...(username ? [{ userId: username }, { username: username }] : [])
      ]
    });

    if (existingStudent) {
      if (normalizedEmail && existingStudent.email === normalizedEmail) {
        return res.status(400).json({ error: 'This email address is already registered.' });
      }
      if (username && (existingStudent.userId === username || existingStudent.username === username)) {
        return res.status(400).json({ error: 'This username is already taken.' });
      }
      return res.status(400).json({ error: 'Phone number already registered' });
    }

    await authService.consumeOtp(cleanPhone, 'signup');

    const studentId = username || 'STU-' + Date.now();
    const salt = password ? await bcrypt.genSalt(10) : null;
    const hashedPassword = (password && salt) ? await bcrypt.hash(password, salt) : undefined;

    const student = new Student({
      id: studentId,
      userId: studentId,
      username: username || studentId,
      name,
      email: normalizedEmail,
      phone: cleanPhone,
      password: hashedPassword,
      class: studentClass || '11th',
      highQualification: higherEducation || '',
      admission: {
        fullAddress: address || '',
        admissionDate: new Date()
      },
      state: state || '',
      district: district || '',
      city: district || '', // Mirroring district to city for legacy compatibility
      gender: gender || '',
      dob: dob || '',
      enrolledCourses: [],
      status: 'active',
      // Referral system
      referredBy: req.body.referralCode || null,
      coins: 0,
      availableCoins: 0,
      welcomeBonus: 0
    });

    // Process Referral Code if provided
    const referralCode = req.body.referralCode;
    if (referralCode) {
      const referral = await db.collection('referrals').findOne({ referralCode });
      // Polymorphic self-referral check
      const isSelfReferral = referral && (
        String(referral.studentId) === String(studentId) || 
        String(referral.studentId) === String(student._id) ||
        referral.referralCode === student.referralCode
      );

      if (referral && !isSelfReferral) {
        const settings = await db.collection('referralSettings').findOne({}) || { 
          coinsPerReferral: 500, 
          welcomeBonusCoins: 100 
        };
        const coinsReward = settings.coinsPerReferral || 500;
        const welcomeBonus = settings.welcomeBonusCoins || 100;

        // Give Welcome Bonus to New Student
        student.coins = welcomeBonus;
        student.availableCoins = welcomeBonus;
        student.welcomeBonus = welcomeBonus;

        // 1. Update Referrals Ledger (Pending)
        await db.collection('referrals').updateOne(
          { referralCode },
          {
            $push: { 
              referredStudents: { 
                studentId: studentId, 
                studentName: name, 
                date: new Date(), 
                coins: coinsReward, 
                status: 'pending' 
              } 
            },
            $inc: { pendingCoins: coinsReward }
          }
        );

        // 2. Update Referrer's Student Profile (Pending)
        await db.collection('students').updateOne(
          { 
            $or: [
              { id: referral.studentId },
              { referralCode: referralCode },
              ...(ObjectId.isValid(referral.studentId) ? [{ _id: new ObjectId(referral.studentId) }] : [])
            ]
          },
          { $inc: { pendingCoins: coinsReward } }
        );
      }
    }

    await student.save();

    if (student.email) {
      const { subject, html } = templates.registration(student.name);
      sendEmail({ to: student.email, subject, html }).catch(e => console.error('Registration email error:', e));
    }

    res.status(201).json({ success: true, message: 'Registration successful', student });
  } catch (error) {
    console.error('Error registering student:', error);
    res.status(500).json({ error: 'Registration failed: ' + error.message });
  }
};

/**
 * Generic OTP Send (Mirrored from server.js /api/otp/send and Signup OTP)
 */
export const sendOtp = async (req, res) => {
  try {
    const db = getDb();
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) return res.status(400).json({ error: 'Invalid phone number' });

    const purpose = otpPurposeFromRequest(req);
    const startTime = performance.now();
    const student = await db.collection('students').findOne({ $or: [{ phone: cleanPhone }, { phone }] });
    const lookupDuration = (performance.now() - startTime).toFixed(2);
    
    if (purpose === 'signup' && student) {
      return res.status(400).json({ error: 'Account already exists. Please login.' });
    }
    if (purpose === 'login' && !student) {
      return res.status(404).json({ error: 'Account not found. Please sign up first.' });
    }

    const lastSent = await db.collection('otps').findOne({ phone: cleanPhone, purpose });
    if (lastSent?.createdAt && Date.now() - new Date(lastSent.createdAt).getTime() < 30000) {
      return res.status(429).json({ error: 'Please wait 30 seconds before requesting another OTP' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const saveStart = performance.now();
    await authService.saveOtp(cleanPhone, purpose, otp);
    const saveDuration = (performance.now() - saveStart).toFixed(2);

    const otpMessage = 'Your AoneTarget login OTP is ' + otp + '. Valid for 10 minutes. Do not share.';
    
    // SAFETY TIMEOUT: Promise.race to prevent hanging requests
    const smsStart = performance.now();
    const smsResult = await Promise.race([
      sendSMS(cleanPhone, otpMessage, process.env.DLT_OTP_TEMPLATE_ID),
      new Promise((_, reject) => setTimeout(() => reject(new Error('SMS_TIMEOUT')), 25000))
    ]).catch(err => ({ success: false, error: err.message }));

    const smsDuration = (performance.now() - smsStart).toFixed(2);
    const totalDuration = (performance.now() - startTime).toFixed(2);

    if (!isProduction) {
      console.log(`[AUTH] OTP flow for ${cleanPhone.slice(0, 2)}***: Lookup=${lookupDuration}ms, Save=${saveDuration}ms, SMS=${smsDuration}ms, Total=${totalDuration}ms`);
    }

    if (!smsResult.success) {
      console.error(`[AUTH] OTP dispatch failed for ${cleanPhone.slice(0, 2)}***: ${smsResult.error}`);
      return res.status(500).json({ 
        success: false, 
        message: smsResult.error === 'SMS_TIMEOUT' ? 'OTP delivery taking longer than usual. Please try again.' : 'SMS sending failed. Please try again.' 
      });
    }

    const jobId = smsResult.providerResponse?.JobId || smsResult.providerResponse?.MessageId || 'N/A';
    console.log(`[AUTH] OTP dispatch successful for ${cleanPhone.slice(0, 2)}*** | Provider=PrimeClick | JobId=${jobId} | Accepted for delivery.`);

    const responseObj = { success: true, message: 'OTP sent to your mobile number' };
    res.json(responseObj);
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
};

/**
 * Generic OTP Verify (Mirrored from server.js /api/otp/verify and Signup Verify)
 */
export const verifyOtp = async (req, res) => {
  try {
    const db = getDb();
    const { phone, otp, deviceId } = req.body;
    if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP are required' });

    const cleanPhone = phone.replace(/\D/g, '');
    const purpose = otpPurposeFromRequest(req);
    const stored = await authService.getValidOtp(cleanPhone, purpose);

    if (!stored) {
      return res.status(400).json({ error: 'OTP expired or not found' });
    }

    if (String(stored.otp) !== String(otp)) {
      await db.collection('otps').updateOne({ _id: stored._id }, { $inc: { attempts: 1 } });
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (purpose === 'signup') {
      await authService.markOtpVerified(cleanPhone, purpose);
      return res.json({ success: true, message: 'OTP verified' });
    }

    const student = await db.collection('students').findOne({ $or: [{ phone: cleanPhone }, { phone }] });
    if (!student) return res.status(404).json({ error: 'Account not found. Please sign up first.' });
    if (student.status === 'inactive') {
      return res.status(403).json({ error: 'Your account is currently inactive. Contact support.' });
    }

    const incomingDeviceId = deviceId || generateDeviceId();
    const incomingDeviceName = req.body.deviceName || req.headers['user-agent'] || 'Unknown Device';
    const incomingDeviceType = req.body.deviceType || 'Browser Device';
    const incomingIP = getRealIP(req);

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEVICE-IP-DEBUG] verifyOtp', {
        headers: {
          host: req.headers.host,
          origin: req.headers.origin,
          xForwardedFor: req.headers['x-forwarded-for'],
          xRealIp: req.headers['x-real-ip'],
        },
        reqIp: req.ip,
        socketRemoteAddress: req.socket?.remoteAddress,
        extractedIP: incomingIP,
        studentId: student.id || student._id,
        currentActiveIP: student.activeDeviceIP
      });
    }

    // DEVICE BINDING LOGIC
    const activeDeviceId = student.activeDeviceId || student.deviceId; // Check both new and legacy fields

    if (!activeDeviceId) {
      // CASE 1: First time login - Bind device
      await db.collection('students').updateOne(
        { _id: student._id },
        { 
          $set: { 
            activeDeviceId: incomingDeviceId, 
            activeDeviceName: incomingDeviceName,
            activeDeviceType: incomingDeviceType,
            activeDeviceIP: incomingIP,
            activeDeviceUserAgent: req.headers['user-agent'],
            activeDeviceRegisteredAt: new Date(),
            activeDeviceLastLoginAt: new Date(),
            deviceId: incomingDeviceId, // Sync legacy field
            deviceLocked: true, 
            pendingDeviceId: null 
          } 
        }
      );
    } else if (String(activeDeviceId) === String(incomingDeviceId)) {
      // CASE 2: Same device - Update metadata
      await db.collection('students').updateOne(
        { _id: student._id },
        { 
          $set: { 
            activeDeviceIP: incomingIP,
            activeDeviceLastLoginAt: new Date()
          } 
        }
      );
    } else {
      // CASE 3: Different device - Create pending request
      await db.collection('students').updateOne(
        { _id: student._id },
        { 
          $set: { 
            pendingDeviceId: incomingDeviceId,
            pendingDeviceName: incomingDeviceName,
            pendingDeviceType: incomingDeviceType,
            pendingDeviceIP: incomingIP,
            pendingDeviceUserAgent: req.headers['user-agent'],
            pendingDeviceRequestedAt: new Date(),
            pendingDeviceStatus: 'pending'
          } 
        }
      );
      return res.status(403).json({ 
        success: false,
        requiresApproval: true,
        code: 'DEVICE_APPROVAL_REQUIRED',
        message: 'This account is already linked to another device. Admin approval is required for this new device.',
        deviceName: incomingDeviceName,
        ip: incomingIP
      });
    }

    await authService.consumeOtp(cleanPhone, purpose);
    const session = await issueStudentSession(req, res, db, student, incomingDeviceId);
    res.json({ success: true, message: 'Login successful', ...session });
  } catch (error) {
    console.error('OTP verification failed:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
};

/**
 * Forgot Password - Send OTP via SMS (Mirrored from server.js)
 */
export const forgotPasswordSendOtp = async (req, res) => {
  try {
    const db = getDb();
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });

    const cleanPhone = phone.replace(/\D/g, '');
    const startTime = performance.now();
    const student = await Student.findOne({ $or: [{ phone: cleanPhone }, { phone }] });
    const lookupDuration = (performance.now() - startTime).toFixed(2);
    
    if (!student) return res.status(404).json({ error: 'No account found with this phone number' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const saveStart = performance.now();
    await authService.saveOtp(cleanPhone, 'reset', otp);
    const saveDuration = (performance.now() - saveStart).toFixed(2);

    const resetOtpMessage = 'Your AoneTarget password reset OTP is ' + otp + '. Valid for 10 minutes. Do not share.';
    
    // SAFETY TIMEOUT
    const smsStart = performance.now();
    const smsResult = await Promise.race([
      sendSMS(cleanPhone, resetOtpMessage, process.env.DLT_FORGOT_TEMPLATE_ID),
      new Promise((_, reject) => setTimeout(() => reject(new Error('SMS_TIMEOUT')), 25000))
    ]).catch(err => ({ success: false, error: err.message }));

    const smsDuration = (performance.now() - smsStart).toFixed(2);
    const totalDuration = (performance.now() - startTime).toFixed(2);

    if (!isProduction) {
      console.log(`[FORGOT_AUTH] OTP flow for ${cleanPhone.slice(0, 2)}***: Lookup=${lookupDuration}ms, Save=${saveDuration}ms, SMS=${smsDuration}ms, Total=${totalDuration}ms`);
    }

    if (!smsResult.success) {
      console.error(`[FORGOT_AUTH] Reset OTP dispatch failed for ${cleanPhone.slice(0, 2)}***: ${smsResult.error}`);
      return res.status(500).json({ 
        success: false, 
        message: smsResult.error === 'SMS_TIMEOUT' ? 'Reset OTP delivery taking longer than usual.' : 'Failed to send reset OTP.' 
      });
    }

    const jobId = smsResult.providerResponse?.JobId || smsResult.providerResponse?.MessageId || 'N/A';
    console.log(`[FORGOT_AUTH] Reset OTP dispatch successful for ${cleanPhone.slice(0, 2)}*** | Provider=PrimeClick | JobId=${jobId} | Accepted for delivery.`);

    const responseObj = { success: true, message: 'OTP sent to your mobile number' };
    res.json(responseObj);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send reset OTP' });
  }
};

/**
 * Forgot Password - Verify OTP (Mirrored from server.js)
 */
export const forgotPasswordVerifyOtp = async (req, res) => {
  try {
    const db = getDb();
    const { phone, otp } = req.body;
    const cleanPhone = phone.replace(/\D/g, '');
    
    const stored = await authService.getValidOtp(cleanPhone, 'reset');
    if (stored && String(stored.otp) === String(otp)) {
      await authService.markOtpVerified(cleanPhone, 'reset');
      return res.json({ success: true, message: 'OTP verified' });
    }
    
    res.status(400).json({ error: 'Invalid or expired OTP' });
  } catch (error) {
    res.status(500).json({ error: 'Verification failed' });
  }
};

/**
 * Reset Password with OTP (Mirrored from server.js)
 */
export const resetPasswordWithOtp = async (req, res) => {
  try {
    const db = getDb();
    const { phone, newPassword } = req.body;
    const cleanPhone = phone.replace(/\D/g, '');
    const stored = await authService.getValidOtp(cleanPhone, 'reset');

    if (!stored || !stored.verified) {
      return res.status(400).json({ error: 'Session expired or not verified' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await Student.updateOne(
      { $or: [{ phone: cleanPhone }, { phone }] },
      { $set: { password: hashedPassword } }
    );

    await authService.consumeOtp(cleanPhone, 'reset');
    res.json({ success: true, message: 'Password reset successful. Please login.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

/**
 * Change Password (Authenticated) (Mirrored from server.js)
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.studentId || req.user?._id || req.user?.id;
    const student = await Student.findOne({
      $or: [
        { id: userId },
        ...(userId && ObjectId.isValid(userId) ? [{ _id: new ObjectId(userId) }] : [])
      ]
    });

    if (!student || !student.password) {
      return res.status(404).json({ error: 'User not found or password not set' });
    }

    const isMatch = await bcrypt.compare(currentPassword, student.password);
    if (!isMatch) return res.status(400).json({ error: 'Incorrect current password' });

    const salt = await bcrypt.genSalt(10);
    student.password = await bcrypt.hash(newPassword, salt);
    await student.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to change password' });
  }
};

/**
 * Session Validation (Mirrored from server.js)
 */
export const validateSession = async (req, res) => {
  try {
    const db = getDb();
    const { studentId, sessionToken } = req.body || {};
    if (!studentId || !sessionToken) return res.status(400).json({ error: 'studentId and sessionToken are required' });

    const student = await db.collection('students').findOne({ id: studentId });
    if (!student || !student.sessionToken || student.sessionToken !== sessionToken) {
      return res.status(401).json({ valid: false, error: 'Session invalid or expired' });
    }
    return res.json({ valid: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to validate session' });
  }
};

/**
 * Identifier Checks
 */
export const checkPhone = async (req, res) => {
  try {
    const db = getDb();
    const { phone } = req.body || {};
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });

    const cleanPhone = phone.replace(/\D/g, '');
    const exists = await db.collection('students').findOne({ $or: [{ phone }, { phone: cleanPhone }] });
    return res.json({ exists: !!exists });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
};

export const checkEmail = async (req, res) => {
  try {
    const db = getDb();
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const exists = await db.collection('students').findOne({ email: email.toLowerCase().trim() });
    return res.json({ exists: !!exists });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
};

/**
 * Access Token Refresh (Mirrored from app.js)
 */
export const refreshAccessToken = async (req, res) => {
  try {
    const db = getDb();
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });
    
    const decoded = verifyRefreshToken(refreshToken);
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const tokenRecord = await db.collection('refresh_tokens').findOne({
      tokenHash,
      studentId: decoded.studentId,
      expiresAt: { $gt: new Date() }
    });

    if (!tokenRecord) return res.status(401).json({ error: 'Invalid refresh token' });

    const student = await Student.findOne({
      $or: [
        { id: decoded.studentId },
        ...(decoded.studentId && /^[a-f\d]{24}$/i.test(decoded.studentId) ? [{ _id: new ObjectId(decoded.studentId) }] : [])
      ]
    });
    
    if (!student) return res.status(401).json({ error: 'User not found' });
    
    await db.collection('refresh_tokens').deleteOne({ _id: tokenRecord._id });
    const session = await issueStudentSession(req, res, db, student.toObject(), student.deviceId || null);
    res.json({ accessToken: session.accessToken, refreshToken: session.refreshToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

/**
 * Forgot Password Controller (Email Based Link)
 */
export const forgotPassword = async (req, res) => {
  const { identifier } = req.body;
  const ip = req.ip || req.connection.remoteAddress;
  const db = getDb();

  try {
    if (!identifier) {
      return res.status(400).json({ error: 'Email or phone is required' });
    }

    const cleanId = identifier.replace(/\D/g, '');
    const user = await db.collection('students').findOne({
      $or: [
        { email: identifier.toLowerCase().trim() },
        { phone: identifier },
        { phone: cleanId }
      ]
    });

    const successMsg = 'If an account exists with that identifier, a reset link has been sent.';

    if (!user || (!user.email && !identifier.includes('@'))) {
      await recordAttempt(identifier, ip, false);
      return res.json({ message: successMsg });
    }

    const recipientEmail = user.email || (identifier.includes('@') ? identifier : null);
    if (!recipientEmail) return res.json({ message: successMsg });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await db.collection('password_resets').deleteOne({ userId: user.id || user._id.toString() });
    await db.collection('password_resets').insertOne({
      userId: user.id || user._id.toString(),
      tokenHash,
      expiresAt: new Date(Date.now() + 3600000),
      createdAt: new Date()
    });

    const resetUrl = `${process.env.FRONTEND_URL || 'https://aonetarget.in'}/reset-password?token=${rawToken}`;
    const { subject, html } = templates.passwordReset(user.name || 'Student', resetUrl);
    await sendEmail({ to: recipientEmail, subject, html });

    res.json({ message: successMsg });
  } catch (error) {
    console.error('[FORGOT PWD ERROR]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Reset Password Controller (Email Based Link)
 */
export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  const db = getDb();

  try {
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
       return res.status(400).json({ error: 'Password too short' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const resetDoc = await db.collection('password_resets').findOne({
      tokenHash,
      expiresAt: { $gt: new Date() }
    });

    if (!resetDoc) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const userId = resetDoc.userId;
    const filter = {
      $or: [
        { id: userId },
        { _id: ObjectId.isValid(userId) ? new ObjectId(userId) : null }
      ].filter(v => v.id || v._id)
    };

    const studentRes = await db.collection('students').updateOne(filter, { $set: { password: hashedPassword } });
    if (studentRes.matchedCount === 0) {
      await db.collection('admins').updateOne(filter, { $set: { password: hashedPassword } });
    }

    await db.collection('password_resets').deleteOne({ _id: resetDoc._id });
    await db.collection('refresh_tokens').deleteMany({ studentId: userId }); // Revoke sessions

    res.json({ success: true, message: 'Password has been reset successfully.' });
  } catch (error) {
    console.error('[RESET PWD ERROR]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Logout Controller
 */
export const logout = async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
  const db = getDb();

  try {
    if (refreshToken) {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await db.collection('refresh_tokens').deleteOne({ tokenHash });
    }
    res.clearCookie('refreshToken', {
      path: '/api/auth/refresh',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    res.clearCookie('accessToken', {
      path: '/api',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    res.clearCookie('sessionToken', {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('[LOGOUT ERROR]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
