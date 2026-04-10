import bcrypt from 'bcrypt';
import crypto from 'crypto';
import mongoose from 'mongoose';
const { ObjectId } = mongoose.Types;

import { generateTokens, generateAdminToken, generateDeviceId } from '../middleware/auth.js';
import { recordAttempt, GENERIC_AUTH_ERROR } from '../middleware/security.js';
import { sendEmail, templates } from '../utils/email.js';
import { findStudent, findAdmin } from '../services/user.service.js';

/**
 * Admin Login Controller
 */
export const adminLogin = async (req, res) => {
  const { adminId, password } = req.body;
  const ip = req.ip || req.connection.remoteAddress;
  const db = mongoose.connection.db;

  try {
    const admin = await db.collection('admins').findOne({ adminId: adminId?.trim() });
    let isMatch = false;

    if (admin) {
      if (admin.password.startsWith('$2')) {
        isMatch = await bcrypt.compare(password, admin.password);
      } else {
        isMatch = admin.password === password;
        if (isMatch) {
          const hashedPassword = await bcrypt.hash(password, 10);
          await db.collection('admins').updateOne({ _id: admin._id }, { $set: { password: hashedPassword } });
          console.log(`[SECURITY] Admin ${adminId} password migrated to bcrypt.`);
        }
      }
    }

    if (!isMatch) {
      await recordAttempt(adminId, ip, false);
      return res.status(401).json({ error: GENERIC_AUTH_ERROR });
    }

    await recordAttempt(adminId, ip, true);
    console.log(`[LOGIN SUCCESS] Admin: ${adminId}, Name: ${admin.name}`);
    
    const adminToken = generateAdminToken(admin);
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
 * Student Login Controller
 */
export const studentLogin = async (req, res) => {
  const { phone, password } = req.body;
  const ip = req.ip || req.connection.remoteAddress;
  const db = mongoose.connection.db;

  try {
    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone and password are required' });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const student = await db.collection('students').findOne({ 
      $or: [{ phone }, { phone: cleanPhone }] 
    });

    let isMatch = false;
    if (student) {
      if (student.password && student.password.startsWith('$2')) {
        isMatch = await bcrypt.compare(password, student.password);
      } else {
        isMatch = (student.password === password);
        if (isMatch) {
          const hashedPassword = await bcrypt.hash(password, 10);
          await db.collection('students').updateOne({ _id: student._id }, { $set: { password: hashedPassword } });
          console.log(`[SECURITY] Student ${phone} password migrated to bcrypt.`);
        }
      }
    }

    if (!isMatch) {
      await recordAttempt(phone, ip, false);
      return res.status(401).json({ error: GENERIC_AUTH_ERROR });
    }

    await recordAttempt(phone, ip, true);
    console.log(`[LOGIN SUCCESS] Student: ${phone}, Name: ${student.name}`);

    const { accessToken, refreshToken } = generateTokens(student);
    const deviceId = generateDeviceId();

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await db.collection('refresh_tokens').insertOne({
      tokenHash,
      studentId: student.id || student._id.toString(),
      ip,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date()
    });

    const { password: _, ...studentNoPwd } = student;
    res.json({
      success: true,
      message: 'Login successful',
      student: studentNoPwd,
      accessToken,
      refreshToken,
      deviceId
    });
  } catch (error) {
    console.error('[STUDENT LOGIN ERROR]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Forgot Password Controller
 */
export const forgotPassword = async (req, res) => {
  const { identifier } = req.body;
  const ip = req.ip || req.connection.remoteAddress;
  const db = mongoose.connection.db;

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
 * Reset Password Controller
 */
export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  const db = mongoose.connection.db;

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
  const { refreshToken } = req.body;
  const db = mongoose.connection.db;

  try {
    if (refreshToken) {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await db.collection('refresh_tokens').deleteOne({ tokenHash });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('[LOGOUT ERROR]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
