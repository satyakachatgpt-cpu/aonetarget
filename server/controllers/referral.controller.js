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
      totalCoins: 0,
      pendingCoins: 0,
      usedCoins: 0,
      availableCoins: 0,
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
    const sid = req.params.studentId;
    
    // 1. Find Student (Source of truth for wallet)
    const student = await db.collection('students').findOne({
      $or: [
        { id: sid },
        ...(ObjectId.isValid(sid) ? [{ _id: new ObjectId(sid) }] : [])
      ]
    });

    if (!student) {
      console.error(`[REFERRAL_STATS] Student not found for ID: ${sid}`);
      return res.status(404).json({ error: 'Student not found' });
    }

    // 2. Find Referral Ledger (Source for pending/invites)
    // Polymorphic lookup to handle legacy or mixed identifier formats
    const referral = await db.collection('referrals').findOne({
      $or: [
        { studentId: student.id },
        { studentId: student._id.toString() },
        { studentId: student._id }
      ]
    });

    // 3. Aggregate Data
    const available = student.availableCoins || 0;
    const unlockedCount = referral?.referredStudents ? referral.referredStudents.filter(s => s.status === 'unlocked' || s.status === 'confirmed').length : 0;
    const pending = referral ? (referral.pendingCoins || 0) : 0;
    const invited = referral?.referredStudents ? referral.referredStudents.length : 0;
    const used = student.usedCoins || 0;
    
    // Milestone Rewards (Dynamic)
    let milestoneBonus = 0;
    if (unlockedCount >= 10) milestoneBonus = 500;
    else if (unlockedCount >= 5) milestoneBonus = 200;

    // Lifetime = Actual Earned (including welcome bonus) + Pending
    const lifetime = (student.coins || 0) + pending;

    const statsData = {
      referralCode: student.referralCode || (referral ? referral.referralCode : null),
      availableCoins: available, // Strictly persisted coins
      pendingCoins: pending,
      invitedCount: invited,
      lifetimeCoins: lifetime,
      usedCoins: used,
      milestoneBonus, // Display-only derived metric
      stats: {
        totalInvited: invited,
        pendingInvites: referral?.referredStudents ? referral.referredStudents.filter(s => s.status === 'pending').length : 0,
        unlockedInvites: unlockedCount,
        conversionRate: invited > 0 
          ? Math.round((unlockedCount / invited) * 100) 
          : 0
      }
    };

    res.json(statsData);
  } catch (error) {
    console.error('SERVER_ERROR [getReferralStats]:', error);
    res.status(500).json({ error: 'Failed to fetch referral stats' });
  }
};

export const getReferralHistory = async (req, res) => {
  try {
    const sid = req.params.studentId;
    
    // Polymorphic lookup for history as well
    const student = await db.collection('students').findOne({
      $or: [{ id: sid }, ...(ObjectId.isValid(sid) ? [{ _id: new ObjectId(sid) }] : [])]
    });

    if (!student) return res.json([]);

    const referral = await db.collection('referrals').findOne({
      $or: [
        { studentId: student.id },
        { studentId: student._id.toString() },
        { studentId: student._id }
      ]
    });

    if (!referral || !referral.referredStudents || referral.referredStudents.length === 0) {
      return res.json([]);
    }
    res.json(referral.referredStudents);
  } catch (error) {
    console.error('SERVER_ERROR [getReferralHistory]:', error);
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

    // Check if the student has already been referred (idempotency)
    const alreadyReferred = referral.referredStudents && referral.referredStudents.some(r => r.studentId === newStudentId);
    if (alreadyReferred) {
      return res.status(400).json({ error: 'This student has already been referred' });
    }

    // Check if the student already has a referredBy field (idempotency)
    const newStudent = await db.collection('students').findOne({ id: newStudentId });
    if (newStudent && newStudent.referredBy) {
      return res.status(400).json({ error: 'You have already applied a referral code' });
    }

    const settings = await db.collection('referralSettings').findOne({}) || { 
      coinsPerReferral: 500, 
      welcomeBonusCoins: 100,
      maxCoinsPerAccount: 50000 
    };
    const coinsReward = settings.coinsPerReferral || 500;
    const welcomeBonus = settings.welcomeBonusCoins || 100;

    const referredEntry = {
      studentId: newStudentId,
      studentName: newStudent ? newStudent.name : 'Unknown',
      date: new Date(),
      coins: coinsReward,
      status: 'pending'
    };

    // Update Referrer
    await db.collection('referrals').updateOne(
      { referralCode },
      {
        $push: { referredStudents: referredEntry },
        $inc: { pendingCoins: coinsReward }
      }
    );

    // Update New Student (Referred)
    await db.collection('students').updateOne(
      { id: newStudentId },
      { 
        $set: { referredBy: referralCode },
        $inc: { coins: welcomeBonus, availableCoins: welcomeBonus, welcomeBonus: welcomeBonus }
      }
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
    res.json(settings || { coinsPerReferral: 500, welcomeBonusCoins: 100, coinToRupeeRate: 10, maxCoinsPerAccount: 50000, isActive: true });
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

    const entry = referral.referredStudents?.find(rs => rs.studentId === referredStudentId);
    if (!entry) {
      return res.status(404).json({ error: 'Referred student entry not found' });
    }

    // Idempotency: skip if status is already same
    if (entry.status === status) {
      return res.json({ success: true, message: `Referral is already ${status}` });
    }

    const updatedStudents = (referral.referredStudents || []).map(rs => {
      if (rs.studentId === referredStudentId) {
        return { ...rs, status };
      }
      return rs;
    });

    const coins = entry.coins || 0;

    let updateOps = { $set: { referredStudents: updatedStudents } };
    
    if (status === 'unlocked' || status === 'confirmed') {
      if (entry.status === 'pending') {
        updateOps.$inc = { 
          totalCoins: coins, 
          availableCoins: coins, 
          pendingCoins: -coins 
        };
      }
    } else if (status === 'rejected') {
      if (entry.status === 'pending') {
        updateOps.$inc = { pendingCoins: -coins };
      } else if (entry.status === 'unlocked' || entry.status === 'confirmed') {
        updateOps.$inc = { 
          totalCoins: -coins, 
          availableCoins: -coins 
        };
      }
    }

    await db.collection('referrals').updateOne({ referralCode }, updateOps);

    // Also update Referrer student model availableCoins
    const referrer = await db.collection('students').findOne({ id: referral.studentId });
    if (referrer) {
      let studentInc = {};
      if (status === 'unlocked' || status === 'confirmed') {
        if (entry.status === 'pending') {
          studentInc = { coins: coins, availableCoins: coins };
        }
      } else if (status === 'rejected') {
        if (entry.status === 'pending') {
          // No inc
        } else if (entry.status === 'unlocked' || entry.status === 'confirmed') {
          studentInc = { coins: -coins, availableCoins: -coins };
        }
      }
      if (Object.keys(studentInc).length > 0) {
        await db.collection('students').updateOne({ id: referral.studentId }, { $inc: studentInc });
      }
    }

    res.json({ success: true, message: `Referral ${status}` });
  } catch (error) {
    console.error('Error updating referral status:', error);
    res.status(500).json({ error: 'Failed to update referral status' });
  }
};

export const deleteReferralAdmin = async (req, res) => {
  try {
    const { referralCode, studentId } = req.params;

    const referral = await db.collection('referrals').findOne({ referralCode });
    if (!referral) {
      return res.status(404).json({ error: 'Referral record not found' });
    }

    const entry = referral.referredStudents.find(rs => rs.studentId === studentId);
    if (!entry) {
      return res.status(404).json({ error: 'Student referral entry not found' });
    }

    const coins = entry.coins || 0;
    const updateOps = {
      $pull: { referredStudents: { studentId } }
    };

    if (entry.status === 'pending') {
      updateOps.$inc = { pendingCoins: -coins };
    } else if (entry.status === 'unlocked' || entry.status === 'confirmed') {
      updateOps.$inc = { 
        totalCoins: -coins, 
        availableCoins: -coins 
      };
    }

    await db.collection('referrals').updateOne({ referralCode }, updateOps);

    // Also update Referrer student model if necessary
    if (entry.status === 'unlocked' || entry.status === 'confirmed') {
      await db.collection('students').updateOne(
        { id: referral.studentId }, 
        { $inc: { coins: -coins, availableCoins: -coins } }
      );
    }

    res.json({ success: true, message: 'Referral deleted successfully' });
  } catch (error) {
    console.error('SERVER_ERROR [deleteReferralAdmin]:', error);
    res.status(500).json({ error: 'Failed to delete referral: ' + error.message });
  }
};

// --- Helper Logic for Internal Use (Payment Flow) ---

/**
 * Unlocks pending referral coins for a referrer when the referred student makes their first purchase.
 */
export const unlockReferralCoins = async (referredStudentId, purchaseId) => {
  try {
    const student = await db.collection('students').findOne({ id: referredStudentId });
    if (!student || !student.referredBy) return false;

    const referralCode = student.referredBy;
    const referral = await db.collection('referrals').findOne({ referralCode });
    if (!referral) return false;

    const entryIndex = referral.referredStudents?.findIndex(rs => rs.studentId === referredStudentId && rs.status === 'pending');
    if (entryIndex === -1 || entryIndex === undefined) return false;

    const entry = referral.referredStudents[entryIndex];
    const coins = entry.coins || 500;

    const updatedStudents = [...referral.referredStudents];
    updatedStudents[entryIndex] = { ...entry, status: 'unlocked', purchaseId };

    await db.collection('referrals').updateOne(
      { referralCode },
      {
        $set: { referredStudents: updatedStudents },
        $inc: { totalCoins: coins, availableCoins: coins, pendingCoins: -coins }
      }
    );

    // Update Referrer student model (Polymorphic update to ensure balance is added)
    await db.collection('students').updateOne(
      { 
        $or: [
          { id: referral.studentId },
          ...(ObjectId.isValid(referral.studentId) ? [{ _id: new ObjectId(referral.studentId) }] : [])
        ]
      },
      { $inc: { coins: coins, availableCoins: coins } }
    );

    return true;
  } catch (error) {
    console.error('Error unlocking referral coins:', error);
    return false;
  }
};

/**
 * Deducts used coins from student's balance after a successful purchase.
 */
export const useCoinsForPurchase = async (studentId, coinsToUse) => {
  try {
    if (!coinsToUse || coinsToUse <= 0) return true;

    const student = await db.collection('students').findOne({ id: studentId });
    if (!student || (student.availableCoins || 0) < coinsToUse) {
      console.error('Insufficient coins or student not found');
      return false;
    }

    await db.collection('students').updateOne(
      { 
        $or: [
          { id: studentId },
          ...(ObjectId.isValid(studentId) ? [{ _id: new ObjectId(studentId) }] : [])
        ]
      },
      { $inc: { availableCoins: -coinsToUse, usedCoins: coinsToUse } }
    );

    // Also update referral record usedCoins if exists
    await db.collection('referrals').updateOne(
      { studentId },
      { $inc: { availableCoins: -coinsToUse, usedCoins: coinsToUse } }
    );

    return true;
  } catch (error) {
    console.error('Error using coins for purchase:', error);
    return false;
  }
};
