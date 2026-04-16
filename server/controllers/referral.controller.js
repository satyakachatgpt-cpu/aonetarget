import { db } from '../config/db.js';
import mongoose from 'mongoose';

const { ObjectId } = mongoose.Types;

// --- Student Referral Controllers ---

export const generateReferralCode = async (req, res) => {
  try {
    const { studentId } = req.body;
    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' });
    }

    const student = await db.collection('students').findOne({ id: studentId });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const existing = await db.collection('referrals').findOne({ studentId });
    if (existing) {
      return res.json({ referralCode: existing.referralCode });
    }

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'AONE-';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    let codeExists = await db.collection('referrals').findOne({ referralCode: code });
    while (codeExists) {
      code = 'AONE-';
      for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      codeExists = await db.collection('referrals').findOne({ referralCode: code });
    }

    const referralDoc = {
      studentId,
      referralCode: code,
      referredStudents: [],
      totalEarnings: 0,
      pendingEarnings: 0,
      createdAt: new Date()
    };

    await db.collection('referrals').insertOne(referralDoc);
    await db.collection('students').updateOne({ id: studentId }, { $set: { referralCode: code } });

    res.status(201).json({ referralCode: code });
  } catch (error) {
    console.error('Error generating referral code:', error);
    res.status(500).json({ error: 'Failed to generate referral code' });
  }
};

export const getReferralStats = async (req, res) => {
  try {
    const referral = await db.collection('referrals').findOne({ studentId: req.params.studentId });
    if (!referral) {
      return res.json({ referralCode: null, totalReferrals: 0, totalEarnings: 0, pendingEarnings: 0 });
    }
    res.json({
      referralCode: referral.referralCode,
      totalReferrals: referral.referredStudents ? referral.referredStudents.length : 0,
      totalEarnings: referral.totalEarnings || 0,
      pendingEarnings: referral.pendingEarnings || 0
    });
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    res.status(500).json({ error: 'Failed to fetch referral stats' });
  }
};

export const getReferralHistory = async (req, res) => {
  try {
    const referral = await db.collection('referrals').findOne({ studentId: req.params.studentId });
    if (!referral || !referral.referredStudents || referral.referredStudents.length === 0) {
      return res.json([]);
    }
    res.json(referral.referredStudents);
  } catch (error) {
    console.error('Error fetching referral history:', error);
    res.status(500).json({ error: 'Failed to fetch referral history' });
  }
};

export const applyReferralCode = async (req, res) => {
  try {
    const { referralCode, newStudentId } = req.body;
    if (!referralCode || !newStudentId) {
      return res.status(400).json({ error: 'Referral code and new student ID are required' });
    }

    const referral = await db.collection('referrals').findOne({ referralCode });
    if (!referral) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }

    if (referral.studentId === newStudentId) {
      return res.status(400).json({ error: 'You cannot use your own referral code' });
    }

    const alreadyReferred = referral.referredStudents && referral.referredStudents.some(r => r.studentId === newStudentId);
    if (alreadyReferred) {
      return res.status(400).json({ error: 'This student has already been referred' });
    }

    const settings = await db.collection('referralSettings').findOne({}) || { commissionType: 'fixed', commissionValue: 50 };
    const earning = settings.commissionType === 'fixed' ? (settings.commissionValue || 50) : 0;

    const newStudent = await db.collection('students').findOne({ id: newStudentId });
    const referredEntry = {
      studentId: newStudentId,
      studentName: newStudent ? newStudent.name : 'Unknown',
      date: new Date(),
      earning: earning,
      status: 'pending'
    };

    await db.collection('referrals').updateOne(
      { referralCode },
      {
        $push: { referredStudents: referredEntry },
        $inc: { pendingEarnings: earning }
      }
    );

    await db.collection('students').updateOne(
      { id: newStudentId },
      { $set: { referredBy: referralCode } }
    );

    res.json({ success: true, message: 'Referral applied successfully' });
  } catch (error) {
    console.error('Error applying referral:', error);
    res.status(500).json({ error: 'Failed to apply referral code' });
  }
};

// --- Admin Referral Controllers ---

export const getAdminReferralSettings = async (req, res) => {
  try {
    const settings = await db.collection('referralSettings').findOne({});
    res.json(settings || { commissionType: 'fixed', commissionValue: 50, isActive: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch referral settings' });
  }
};

export const updateAdminReferralSettings = async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const result = await db.collection('referralSettings').updateOne(
      {},
      { $set: { ...updateData, updatedAt: new Date() } },
      { upsert: true }
    );
    res.json({ success: true, message: 'Referral settings updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update referral settings' });
  }
};

export const getAllReferralsAdmin = async (req, res) => {
  try {
    const referrals = await db.collection('referrals').find({}).toArray();
    res.json(referrals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch all referrals' });
  }
};

export const updateReferralStatusAdmin = async (req, res) => {
  try {
    const { referralCode, referredStudentId, status } = req.body;
    if (!referralCode || !referredStudentId || !status) {
      return res.status(400).json({ error: 'referralCode, referredStudentId, and status are required' });
    }

    const referral = await db.collection('referrals').findOne({ referralCode });
    if (!referral) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    const updatedStudents = (referral.referredStudents || []).map(rs => {
      if (rs.studentId === referredStudentId) {
        return { ...rs, status };
      }
      return rs;
    });

    const entry = referral.referredStudents?.find(rs => rs.studentId === referredStudentId);
    const earning = entry ? entry.earning || 0 : 0;

    let updateOps = { $set: { referredStudents: updatedStudents } };
    if (status === 'confirmed' && entry && entry.status !== 'confirmed') {
      updateOps.$inc = { totalEarnings: earning, pendingEarnings: -earning };
    } else if (status === 'rejected' && entry && entry.status === 'pending') {
      updateOps.$inc = { pendingEarnings: -earning };
    }

    await db.collection('referrals').updateOne({ referralCode }, updateOps);
    res.json({ success: true, message: `Referral ${status}` });
  } catch (error) {
    console.error('Error updating referral status:', error);
    res.status(500).json({ error: 'Failed to update referral status' });
  }
};
