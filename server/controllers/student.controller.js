import mongoose from 'mongoose';
import { getDb } from '../config/db.js';
import Student from '../models/Student.js';
import bcrypt from 'bcrypt';
import * as XLSX from 'xlsx';
import { verifyAccessToken } from '../middleware/auth.js';

const { ObjectId } = mongoose.Types;

// --- User CRUD ---

export const getUserById = async (req, res) => {
  try {
    const db = getDb();
    const user = await db.collection('users').findOne({ id: req.params.id });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

export const createUser = async (req, res) => {
  try {
    const db = getDb();
    const result = await db.collection('users').insertOne(req.body);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// --- Student CRUD ---

export const getStudents = async (req, res) => {
  try {
    const students = await Student.find({}, {
      academic: 0,
      documents: 0,
      fees: 0,
      notes: 0
    }).sort({ _id: -1 }).lean();
    
    // Map to include hasPassword and strip password
    const safeStudents = students.map(s => {
      const { password, ...safeS } = s;
      return { ...safeS, hasPassword: !!password };
    });

    console.log('GET /api/students - Optimized Payload - Found', students.length, 'students');
    res.json(safeStudents);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Failed to fetch students', details: error.message });
  }
};

export const getStudentById = async (req, res) => {
  try {
    let query = { id: req.params.id };
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      query = { $or: [{ id: req.params.id }, { _id: req.params.id }] };
    }
    const student = await Student.findOne(query).lean();
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const { password, ...safeStudent } = student;
    res.json({ ...safeStudent, hasPassword: !!password });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch student' });
  }
};

export const createStudent = async (req, res) => {
  try {
    console.log('POST /api/students - Received admission data:', req.body);
    const { email, phone } = req.body;

    // Duplicate check
    const existingStudent = await Student.findOne({
      $or: [
        { phone },
        ...(email ? [{ email }] : [])
      ]
    });

    if (existingStudent) {
      const field = existingStudent.phone === phone ? 'phone' : 'email';
      return res.status(400).json({ error: `Student with this ${field} already exists.` });
    }

    // Generate unique student ID
    const studentId = "STU-" + Date.now() + Math.floor(Math.random() * 1000);

    // Hash password if provided
    let hashedPassword = null;
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(req.body.password, salt);
    }

    // Structure data for new schema
    const studentData = {
      id: studentId,
      userId: (req.body.userId || "").trim() || studentId, // Use provide userId or fallback to auto ID
      password: hashedPassword,
      name: (req.body.name || "").trim(),
      email: (req.body.email && req.body.email.trim()) ? req.body.email.trim() : null, // Handle empty string as null for sparse unique index
      phone: (req.body.phone || "").trim(),
      dob: req.body.dob,
      city: req.body.city,
      state: req.body.state,
      course: req.body.course,
      highQualification: req.body.highQualification,
      status: req.body.status || 'active',
      registrationType: req.body.registrationType || 'regular',
      registrationDate: req.body.registrationDate || new Date().toISOString().split('T')[0],
      district: req.body.district,
      gender: req.body.gender,
      whatsAppNumber: req.body.whatsAppNumber,
      alternateNumber: req.body.alternateNumber,
      alternateWhatsAppNumber: req.body.alternateWhatsAppNumber || req.body.alternateNumber,
      class: req.body.class,
      notes: req.body.notes,
      paymentStatus: req.body.paymentStatus || 'pending',

      admission: {
        fatherName: (req.body.fatherName || "").trim(),
        motherName: (req.body.motherName || "").trim(),
        gender: req.body.gender,
        alternatePhone: (req.body.alternateNumber || req.body.alternatePhone || "").trim(),
        fullAddress: req.body.fullAddress || req.body.address,
        batchTiming: req.body.batchTiming,
        admissionDate: req.body.admissionDate || new Date()
      },
      fees: {
        totalFees: Number(req.body.totalFees || 0),
        paidAmount: Number(req.body.paidAmount || 0),
        remainingAmount: Number(req.body.totalFees || 0) - Number(req.body.paidAmount || 0)
      },
      academic: {
        previousClass: req.body.previousClass,
        schoolName: req.body.schoolName,
        marksPercentage: req.body.marksPercentage,
        passingYear: req.body.passingYear
      },
      documents: {
        aadharCard: req.body.aadharCard,
        marksheet: req.body.marksheet,
        photo: req.body.photo,
        profilePhoto: req.body.profilePhoto
      }
    };

    const student = new Student(studentData);
    await student.save();

    console.log('Student created successfully with ID:', studentId);

    const studentObj = student.toObject ? student.toObject() : student;
    const { password, ...safeStudent } = studentObj;

    res.status(201).json({
      ...safeStudent,
      hasPassword: !!password
    });
  } catch (error) {
    console.error('Error creating student (FULL ERROR):', error);
    res.status(500).json({
      error: error.code === 11000 ? 'Duplicate key error: A student with this phone or email already exists.' : 'Failed to create student',
      details: error.message
    });
  }
};

export const updateStudent = async (req, res) => {
  try {
    console.log('PUT /api/students/:id - Updating student:', req.params.id, req.body);
    const { _id, ...body } = req.body;

    const updateData = {};
    const stringFields = [
      'name', 'phone', 'userId', 'highQualification', 'dob', 'city', 'state', 
      'course', 'status', 'registrationType', 'registrationDate', 'district', 
      'gender', 'whatsAppNumber', 'alternateNumber', 'alternateWhatsAppNumber', 
      'class', 'notes', 'paymentStatus', 'banReason'
    ];

    stringFields.forEach(field => {
      if (body[field] !== undefined) {
        if (typeof body[field] === 'string' && field !== 'banReason') {
          updateData[field] = body[field].trim();
        } else {
          updateData[field] = body[field];
        }
      }
    });

    if (body.email !== undefined) {
      updateData.email = (body.email && body.email.trim()) ? body.email.toLowerCase().trim() : null;
    }

    if (body.isBanned !== undefined) updateData.isBanned = body.isBanned;

    // Handle Nested Objects (Preserve existing data if not provided)
    if (body.fatherName !== undefined) updateData['admission.fatherName'] = body.fatherName.trim();
    if (body.motherName !== undefined) updateData['admission.motherName'] = body.motherName.trim();
    if (body.admissionDate !== undefined) updateData['admission.admissionDate'] = body.admissionDate;
    if (body.batchTiming !== undefined) updateData['admission.batchTiming'] = body.batchTiming;
    if (body.fullAddress !== undefined || body.address !== undefined) {
      updateData['admission.fullAddress'] = body.fullAddress || body.address;
    }

    if (body.totalFees !== undefined) updateData['fees.totalFees'] = Number(body.totalFees);
    if (body.paidAmount !== undefined) updateData['fees.paidAmount'] = Number(body.paidAmount);
    if (body.totalFees !== undefined || body.paidAmount !== undefined) {
      // Logic for remaining amount needs careful handling if only one is updated
      // but for simplicity in partial updates, we'll let Mongoose handle specific paths
    }

    const academicFields = ['previousClass', 'schoolName', 'marksPercentage', 'passingYear'];
    academicFields.forEach(f => {
      if (body[f] !== undefined) updateData[`academic.${f}`] = body[f];
    });

    const docFields = ['aadharCard', 'marksheet', 'photo', 'profilePhoto'];
    docFields.forEach(f => {
      if (body[f] !== undefined) updateData[`documents.${f}`] = body[f];
    });

    if (updateData.email) {
      const existing = await Student.findOne({
        email: updateData.email,
        id: { $ne: req.params.id }
      });
      if (existing) {
        return res.status(400).json({ error: 'This email address is already registered to another student.' });
      }
    }

    if (body.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(body.password, salt);
    }

    const student = await Student.findOneAndUpdate(
      { id: req.params.id },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!student) {
      console.warn('Student not found:', req.params.id);
      return res.status(404).json({ error: 'Student not found' });
    }

    console.log('Student updated successfully:', req.params.id);

    const studentObj = student.toObject ? student.toObject() : student;
    const { password, ...safeStudent } = studentObj;

    res.json({
      ...safeStudent,
      hasPassword: !!password
    });
  } catch (error) {
    console.error('Error updating student (FULL ERROR):', error);
    res.status(500).json({
      error: error.code === 11000 ? 'Duplicate key error: A student with this phone or email already exists.' : 'Failed to update student',
      details: error.message
    });
  }
};

export const deleteStudent = async (req, res) => {
  try {
    const db = getDb();
    console.log('DELETE /api/students/:id - Deleting student:', req.params.id);
    const result = await Student.findOneAndDelete({ id: req.params.id });
    if (!result) {
      console.warn('Student not found for deletion:', req.params.id);
      return res.status(404).json({ error: 'Student not found' });
    }
    console.log('Student deleted successfully:', req.params.id);
    res.json({ success: true, message: 'Student deleted' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ error: 'Failed to delete student', details: error.message });
  }
};

export const banStudent = async (req, res) => {
  try {
    const { userId, reason } = req.body;
    console.log('POST /api/security-admin/ban-user - Banning user:', userId, 'Reason:', reason);
    
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const student = await Student.findOneAndUpdate(
      { id: userId },
      { 
        $set: { 
          isBanned: true, 
          banReason: reason || 'Terms of service violation',
          status: 'inactive',
          activeSessions: [],
          deviceId: null,
          pendingDeviceId: null,
          activeDeviceId: null,
          sessionToken: null
        } 
      },
      { new: true }
    );

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    console.log('Student banned and sessions cleared:', userId);
    res.json({ success: true, message: 'User has been banned and sessions cleared' });
  } catch (error) {
    console.error('Error banning student:', error);
    res.status(500).json({ error: 'Failed to ban student', details: error.message });
  }
};

export const deleteAllStudents = async (req, res) => {
  try {
    const result = await Student.deleteMany({});
    res.json({ success: true, message: `Deleted ${result.deletedCount} students` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete all students' });
  }
};

export const bulkCreateStudents = async (req, res) => {
  try {
    const db = getDb();
    const { students } = req.body;
    if (!Array.isArray(students) || students.length === 0) return res.status(400).json({ error: 'No students provided' });
    const result = await Student.insertMany(students);
    res.status(201).json({ success: true, inserted: result.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk create students' });
  }
};

export const updateAllStudents = async (req, res) => {
  try {
    const db = getDb();
    const { updates } = req.body;
    if (!Array.isArray(updates)) return res.status(400).json({ error: 'Updates must be an array' });
    for (const update of updates) {
      const { id, _id, ...data } = update;
      await Student.updateOne({ id }, { $set: data });
    }
    res.json({ success: true, message: `Updated ${updates.length} students` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update all students' });
  }
};

export const bulkCreateFromExcel = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    if (jsonData.length === 0) return res.status(400).json({ error: 'No data found in file' });

    const students = jsonData.map((row, idx) => ({
      id: row.id || row.ID || `ST-${String(Date.now() + idx).slice(-6)}`,
      name: row.name || row.Name || row['Full Name'] || row['Student Name'] || '',
      email: row.email || row.Email || '',
      phone: String(row.phone || row.Phone || row.Mobile || row.mobile || ''),
      dob: row.dob || row.DOB || row['Date of Birth'] || '',
      course: row.course || row.Course || '',
      city: row.city || row.City || '',
      registrationDate: row.registrationDate || row['Registration Date'] || new Date().toISOString().split('T')[0],
      registrationType: row.registrationType || row['Registration Type'] || 'regular',
      status: (row.status || row.Status || 'active').toString().toLowerCase(),
      paymentStatus: (row.paymentStatus || row['Payment Status'] || 'pending').toString().toLowerCase(),
      notes: row.notes || row.Notes || ''
    })).filter(s => s.name || s.email || s.phone);

    if (students.length === 0) return res.status(400).json({ error: 'No valid student data found' });
    const db = getDb();
    const result = await db.collection('students').insertMany(students);
    res.json({ success: true, inserted: result.insertedCount, students });
  } catch (error) {
    console.error('Excel upload error:', error);
    res.status(500).json({ error: 'Failed to process Excel file: ' + error.message });
  }
};

// --- Session & Auth (Identity functions moved to auth.controller.js) ---

export const getCurrentUser = async (req, res) => {
  try {
    let student = null;

    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    if (!token && req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (token) {
      try {
        const decoded = verifyAccessToken(token);
        if (decoded && decoded.studentId) {
          student = await Student.findOne({
            $or: [
              { id: decoded.studentId },
              ...(typeof decoded.studentId === 'string' && /^[a-f\d]{24}$/i.test(decoded.studentId) ? [{ _id: new ObjectId(decoded.studentId) }] : [])
            ]
          });
        }
      } catch (e) {
        if (e.name === 'TokenExpiredError') {
          return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
        }
        console.error('Access token verify error:', e.message);
      }
    }

    if (!student) {
      const sessionToken = req.cookies.sessionToken;
      if (!sessionToken) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      student = await Student.findOne({ sessionToken });
      if (!student) {
        res.clearCookie('sessionToken');
        return res.status(401).json({ error: 'Invalid session' });
      }
    }

    if (!student) {
      return res.status(401).json({ error: 'Student not found' });
    }

    const { sessionToken: __, password: _pw, ...studentData } = student.toObject();
    return res.json({ student: studentData });
  } catch (err) {
    console.error('API /me error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

export const logout = async (req, res) => {
  try {
    const sessionToken = req.cookies.sessionToken;
    if (sessionToken) {
      await Student.updateOne(
        { sessionToken },
        { $unset: { sessionToken: 1, activeDeviceId: 1 } }
      );
    }
    res.clearCookie('sessionToken');
    res.clearCookie('accessToken', { path: '/api' });
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
    res.json({ success: true });
  } catch (e) {
    res.clearCookie('sessionToken');
    res.clearCookie('accessToken', { path: '/api' });
    res.json({ success: true });
  }
};

// --- Downloads (Phase 19F) ---

export const getDownloads = async (req, res) => {
  try {
    const isOwner = req.user?.studentId === req.params.id;
    const isAdmin = req.user?.role === 'admin' || req.user?.isAdmin;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized access to student data' });
    }

    const db = getDb();
    const downloads = await db.collection('downloads').find({ studentId: req.params.id }).toArray();
    res.json(downloads);
  } catch (error) {
    console.error('Error fetching downloads:', error);
    res.status(500).json({ error: 'Failed to fetch downloads' });
  }
};

export const createDownload = async (req, res) => {
  try {
    const isOwner = req.user?.studentId === req.params.id;
    const isAdmin = req.user?.role === 'admin' || req.user?.isAdmin;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized: Cannot create download record for another student' });
    }

    const db = getDb();
    const result = await db.collection('downloads').insertOne({
      ...req.body,
      studentId: req.params.id,
      downloadedAt: new Date()
    });
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    console.error('Error saving download:', error);
    res.status(500).json({ error: 'Failed to save download' });
  }
};

export const deleteDownload = async (req, res) => {
  try {
    const { downloadId } = req.params;
    const db = getDb();
    const result = await db.collection('downloads').deleteOne({
      $or: [
        { id: downloadId },
        { _id: ObjectId.isValid(downloadId) ? new ObjectId(downloadId) : null }
      ].filter(v => v.id || v._id),
      studentId: req.params.id
    });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Download not found' });
    }
    res.json({ success: true, message: 'Download deleted' });
  } catch (error) {
    console.error('Error deleting download:', error);
    res.status(500).json({ error: 'Failed to delete download' });
  }
};

// --- Watch History ---

export const getWatchHistory = async (req, res) => {
  try {
    const db = getDb();
    const history = await db.collection('watchHistory')
      .find({ studentId: req.params.id })
      .sort({ updatedAt: -1, watchedAt: -1 })
      .limit(100)
      .toArray();

    res.json(history);
  } catch (error) {
    console.error('Error fetching watch history:', error);
    res.status(500).json({ error: 'Failed to fetch watch history' });
  }
};

export const saveWatchHistory = async (req, res) => {
  try {
    const { videoId } = req.body;
    if (!videoId) {
      return res.status(400).json({ error: 'videoId is required' });
    }

    const db = getDb();
    const now = new Date();
    const historyItem = {
      ...req.body,
      studentId: req.params.id,
      watchedAt: req.body.watchedAt ? new Date(req.body.watchedAt) : now,
      updatedAt: now
    };

    await db.collection('watchHistory').updateOne(
      { studentId: req.params.id, videoId },
      { $set: historyItem, $setOnInsert: { createdAt: now } },
      { upsert: true }
    );

    const saved = await db.collection('watchHistory').findOne({ studentId: req.params.id, videoId });
    res.status(201).json(saved);
  } catch (error) {
    console.error('Error saving watch history:', error);
    res.status(500).json({ error: 'Failed to save watch history' });
  }
};

export const clearWatchHistory = async (req, res) => {
  try {
    const db = getDb();
    await db.collection('watchHistory').deleteMany({ studentId: req.params.id });
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing watch history:', error);
    res.status(500).json({ error: 'Failed to clear watch history' });
  }
};
