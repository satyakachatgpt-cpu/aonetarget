import { db } from '../config/db.js';
import mongoose from 'mongoose';

const { ObjectId } = mongoose.Types;

// --- Student Reported Question Controllers ---
export const reportQuestion = async (req, res) => {
  try {
    const reportData = {
      ...req.body,
      studentId: req.user?.studentId || req.body.studentId,
      studentName: req.user?.name || req.body.studentName,
      status: 'pending',
      reportedAt: new Date(),
    };
    const result = await db.collection('reportedQuestions').insertOne(reportData);
    res.status(201).json({ id: result.insertedId, ...reportData });
  } catch (error) {
    console.error('Error reporting question:', error);
    res.status(500).json({ error: 'Failed to report question' });
  }
};

// --- Admin Moderation Controllers ---

export const getReportedQuestions = async (req, res) => {
  try {
    const reports = await db.collection('reportedQuestions').aggregate([
      {
        $lookup: {
          from: 'students',
          localField: 'studentId',
          foreignField: 'id',
          as: 'studentInfo'
        }
      },
      {
        $lookup: {
          from: 'questions',
          localField: 'questionId',
          foreignField: 'id',
          as: 'questionInfo'
        }
      },
      {
        $lookup: {
          from: 'tests',
          localField: 'testId',
          foreignField: 'id',
          as: 'testInfo'
        }
      },
      { $unwind: { path: '$studentInfo', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$questionInfo', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$testInfo', preserveNullAndEmptyArrays: true } },
      { $sort: { reportedAt: -1 } }
    ]).toArray();

    // Map to the structure expected by the frontend
    const formattedReports = reports.map(r => {
      let qNum = r.questionNumber;
      if (!qNum) {
        if (r.questionInfo && r.questionInfo.orderIndex !== undefined) {
          qNum = r.questionInfo.orderIndex + 1;
        } else if (r.testInfo && Array.isArray(r.testInfo.questions)) {
          const idx = r.testInfo.questions.findIndex(q => String(q.id || q._id) === String(r.questionId));
          if (idx !== -1) qNum = idx + 1;
        }
      }
      
      return {
        id: r._id.toString(),
        studentName: r.studentInfo?.name || r.studentName || 'Unknown Student',
        studentEmail: r.studentInfo?.email || r.studentEmail || '-',
        studentPhone: r.studentInfo?.phone || r.studentPhone || '-',
        testTitle: r.testInfo?.title || r.testTitle || 'Unknown Test',
        batchSeries: r.testInfo?.batchSeries || r.batchSeries || '-',
        questionId: r.questionId,
        questionNumber: qNum || '-',
        questionEn: r.questionInfo?.questionEn || r.questionEn || '-',
        questionHi: r.questionInfo?.questionHi || r.questionHi || '-',
        issue: r.issue,
        comment: r.comment || '',
        reportedDate: r.reportedAt,
        status: r.status || 'pending'
      };
    });

    res.json(formattedReports);
  } catch (error) {
    console.error('Error fetching reported questions:', error);
    res.status(500).json({ error: 'Failed to fetch reported questions' });
  }
};

export const updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const query = { _id: ObjectId.isValid(id) ? new ObjectId(id) : id };
    const result = await db.collection('reportedQuestions').updateOne(
      query,
      { $set: { status, updatedAt: new Date() } }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Report not found' });
    res.json({ success: true, message: 'Report status updated' });
  } catch (error) {
    console.error('Error updating report status:', error);
    res.status(500).json({ error: 'Failed to update report status' });
  }
};
export const deleteReport = async (req, res) => {
  try {
    const { id } = req.params;
    const query = { _id: ObjectId.isValid(id) ? new ObjectId(id) : id };
    const result = await db.collection('reportedQuestions').deleteOne(query);
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Report not found' });
    res.json({ success: true, message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
};

export const bulkDeleteReports = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No IDs provided' });
    }
    const objectIds = ids.map(id => {
      try {
        return ObjectId.isValid(id) ? new ObjectId(id) : id;
      } catch (e) {
        return id;
      }
    });
    const result = await db.collection('reportedQuestions').deleteMany({ _id: { $in: objectIds } });
    res.json({ success: true, deletedCount: result.deletedCount, message: `${result.deletedCount} reports deleted` });
  } catch (error) {
    console.error('Error bulk deleting reports:', error);
    res.status(500).json({ error: 'Failed to bulk delete reports' });
  }
};
