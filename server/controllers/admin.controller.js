import { db, getDb } from '../config/db.js';
import Student from '../models/Student.js';
import mongoose from 'mongoose';

/**
 * GET /api/admin/verify
 * Verifies admin session
 */
export const verifyAdmin = async (req, res) => {
  try {
    const admin = req.admin;

    if (!admin) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Optional: Fetch fresh data from DB if needed, but since it's already verified by middleware,
    // we can use the context or just confirm the ID still exists.
    const adminDoc = await db.collection('admins').findOne({ adminId: admin.id });

    if (!adminDoc) {
      return res.status(401).json({ error: 'Admin not found' });
    }

    res.json({
      success: true,
      adminId: adminDoc.adminId,
      name: adminDoc.name
    });
  } catch (error) {
    res.status(500).json({ error: 'Verification failed' });
  }
};

/**
 * GET /api/admin/dashboard-stats
 * Returns aggregated stats for admin dashboard
 */
export const getDashboardStats = async (req, res) => {
  try {
    const { type = 'Daily', date, from, to } = req.query;
    const db = getDb();
    const now = new Date();

    let start, end;
    if (type === 'Custom' && from && to) {
      start = new Date(from);
      start.setHours(0, 0, 0, 0);
      end = new Date(to);
      end.setHours(23, 59, 59, 999);
    } else if (type === 'Weekly') {
      start = new Date(now);
      start.setDate(now.getDate() - 42); // 6 weeks
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      end.setHours(23, 59, 59, 999);
    } else if (type === 'Monthly') {
      start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      end.setHours(23, 59, 59, 999);
    } else {
      const baseDate = date ? new Date(date) : now;
      end = new Date(baseDate);
      end.setHours(23, 59, 59, 999);
      start = new Date(baseDate);
      start.setDate(baseDate.getDate() - 14);
      start.setHours(0, 0, 0, 0);
    }

    const totalStudents = await db.collection('students').countDocuments();
    const totalCourses = await db.collection('courses').countDocuments();

    const duration = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - duration - 1);
    const prevEnd = new Date(start.getTime() - 1);

    const purchases = await db.collection('purchases').find({
      status: 'completed',
      createdAt: { $gte: prevStart, $lte: end }
    }).toArray();

    const students = await db.collection('students').find({
      createdAt: { $gte: prevStart, $lte: end }
    }).toArray();

    let currentRevenue = 0, currentSales = 0;
    let prevRevenue = 0, prevSales = 0;

    purchases.forEach(p => {
      const d = new Date(p.createdAt);
      const amount = Number(p.amount) || 0;
      if (d >= start && d <= end) {
        currentRevenue += amount;
        currentSales += 1;
      } else if (d >= prevStart && d <= prevEnd) {
        prevRevenue += amount;
        prevSales += 1;
      }
    });

    const dailyStats = {};
    if (type === 'Weekly') {
      let curr = new Date(start);
      while (curr <= end) {
        const nextWeek = new Date(curr);
        nextWeek.setDate(curr.getDate() + 7);
        const key = `W_${curr.getTime()}`;
        dailyStats[key] = { 
          name: `W${Math.ceil(curr.getDate() / 7)} ${curr.toLocaleDateString('en-GB', { month: 'short' })}`, 
          sales: 0, 
          revenue: 0, 
          signups: 0, 
          _s: curr.getTime(), 
          _e: nextWeek.getTime() 
        };
        curr = nextWeek;
      }
    } else if (type === 'Monthly') {
      for (let i = 0; i < 6; i++) {
        const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
        const key = d.toISOString().substring(0, 7);
        dailyStats[key] = { name: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), sales: 0, revenue: 0, signups: 0 };
      }
    } else {
      let curr = new Date(start);
      while (curr <= end) {
        const key = curr.toISOString().split('T')[0];
        dailyStats[key] = { name: curr.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), sales: 0, revenue: 0, signups: 0 };
        curr.setDate(curr.getDate() + 1);
        if (Object.keys(dailyStats).length > 62) break;
      }
    }

    purchases.forEach(p => {
      const d = new Date(p.createdAt);
      if (d < start || d > end) return;
      let key;
      if (type === 'Weekly') key = Object.keys(dailyStats).find(k => d.getTime() >= dailyStats[k]._s && d.getTime() < dailyStats[k]._e);
      else if (type === 'Monthly') key = d.toISOString().substring(0, 7);
      else key = d.toISOString().split('T')[0];

      if (key && dailyStats[key]) {
        dailyStats[key].sales += 1;
        dailyStats[key].revenue += (Number(p.amount) || 0);
      }
    });

    students.forEach(s => {
      const d = new Date(s.createdAt);
      if (d < start || d > end) return;
      let key;
      if (type === 'Weekly') key = Object.keys(dailyStats).find(k => d.getTime() >= dailyStats[k]._s && d.getTime() < dailyStats[k]._e);
      else if (type === 'Monthly') key = d.toISOString().substring(0, 7);
      else key = d.toISOString().split('T')[0];
      if (key && dailyStats[key]) dailyStats[key].signups += 1;
    });

    const chartData = Object.keys(dailyStats).sort().map(k => ({
      ...dailyStats[k],
      vol: dailyStats[k].sales
    }));

    const recentTrends = {
      sales: chartData.map(t => Number(t.sales) || 0),
      revenue: chartData.map(t => Number(t.revenue) || 0),
      signups: chartData.map(t => Number(t.signups) || 0)
    };

    res.json({
      success: true,
      totalStudents, totalCourses,
      totalRevenue: currentRevenue,
      salesVolume: currentSales,
      prevRevenue, prevSales,
      rank: Math.max(1, 1271 - Math.floor(totalStudents / 5)),
      chartData,
      recentTrends
    });
  } catch (error) {
    console.error('Stats Error:', error);
    res.status(500).json({ error: 'Failed' });
  }
};


/**
 * GET /api/institute
 * Retrieve institute settings
 */
export const getInstituteSettings = async (req, res) => {
  try {
    const settings = await db.collection('institute').findOne({});
    res.json(settings || { name: '', email: '', phone: '', address: '', logo: '' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch institute settings' });
  }
};

/**
 * PUT /api/institute
 * Update institute settings
 */
export const updateInstituteSettings = async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const result = await db.collection('institute').updateOne(
      {},
      { $set: updateData },
      { upsert: true }
    );
    res.json({ success: true, message: 'Institute settings updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update institute settings' });
  }
};

/**
 * POST /api/admin/approve-device
 * Approve a pending device request for a student
 */
export const approveDevice = async (req, res) => {
  try {
    const { studentId } = req.body;
    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    
    if (!student.pendingDeviceId) {
      return res.status(400).json({ error: 'No pending device request found' });
    }

    // Move pending info to active
    student.activeDeviceId = student.pendingDeviceId;
    student.activeDeviceName = student.pendingDeviceName;
    student.activeDeviceType = student.pendingDeviceType;
    student.activeDeviceIP = student.pendingDeviceIP;
    student.activeDeviceUserAgent = student.pendingDeviceUserAgent;
    student.activeDeviceRegisteredAt = new Date();
    student.activeDeviceLastLoginAt = new Date();
    
    // Sync legacy field
    student.deviceId = student.pendingDeviceId;
    
    student.deviceLocked = true;
    
    // Clear pending fields
    student.pendingDeviceId = null;
    student.pendingDeviceName = null;
    student.pendingDeviceType = null;
    student.pendingDeviceIP = null;
    student.pendingDeviceUserAgent = null;
    student.pendingDeviceRequestedAt = null;
    student.pendingDeviceStatus = 'approved';
    
    await student.save();
    
    res.json({ success: true, message: 'Device approved successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve device' });
  }
};

/**
 * POST /api/admin/reject-device
 * Reject a pending device request for a student
 */
export const rejectDevice = async (req, res) => {
  try {
    const { studentId } = req.body;
    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    
    student.pendingDeviceId = null;
    student.pendingDeviceName = null;
    student.pendingDeviceType = null;
    student.pendingDeviceIP = null;
    student.pendingDeviceUserAgent = null;
    student.pendingDeviceRequestedAt = null;
    student.pendingDeviceStatus = 'rejected';
    
    await student.save();
    
    res.json({ success: true, message: 'Device request rejected' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject device' });
  }
};

/**
 * POST /api/admin/reset-device
 * Reset device lock for a student
 */
export const resetDevice = async (req, res) => {
  try {
    const { studentId } = req.body;
    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    
    student.deviceId = null;
    student.activeDeviceId = null;
    student.activeDeviceName = null;
    student.activeDeviceType = null;
    student.activeDeviceIP = null;
    student.activeDeviceUserAgent = null;
    student.activeDeviceRegisteredAt = null;
    student.activeDeviceLastLoginAt = null;
    
    student.pendingDeviceId = null;
    student.pendingDeviceName = null;
    student.pendingDeviceType = null;
    student.pendingDeviceIP = null;
    student.pendingDeviceUserAgent = null;
    student.pendingDeviceRequestedAt = null;
    student.pendingDeviceStatus = null;
    
    student.deviceLocked = true;
    
    // Also remove any active session traces
    student.sessionToken = null;
    student.activeSessions = [];
    
    await student.save();
    
    res.json({ success: true, message: 'Device limit reset successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset device' });
  }
};
