import { db } from '../config/db.js';
import mongoose from 'mongoose';
import * as XLSX from 'xlsx';

const { ObjectId } = mongoose.Types;

export const getAllQuestions = async (req, res) => {
  try {
    const filter = {};
    if (req.query.testId) filter.testId = req.query.testId;
    if (req.query.courseId) filter.courseId = req.query.courseId;
    const questions = await db.collection('questions').find(filter).sort({ orderIndex: 1, id: 1 }).toArray();
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
};

export const createQuestion = async (req, res) => {
  try {
    const result = await db.collection('questions').insertOne(req.body);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create question' });
  }
};

export const bulkUpdateQuestions = async (req, res) => {
  try {
    const updates = (req.body && req.body.updates) ? req.body.updates : (Array.isArray(req.body) ? req.body : []);
    console.log(`[Reorder] Processing ${updates.length} updates`);

    for (const update of updates) {
      const { id, _id, ...data } = update;
      let query = null;

      if (id) {
        query = { id: id };
      } else if (_id) {
        query = { _id: (ObjectId.isValid(_id.toString())) ? new ObjectId(_id.toString()) : _id };
      }

      if (query) {
        await db.collection('questions').updateOne(query, { $set: data });
      }
    }
    res.json({ success: true, message: `Updated ${updates.length} questions` });
  } catch (error) {
    console.error('[Reorder] Error:', error);
    res.status(500).json({ error: 'Failed to update all questions', details: error.message });
  }
};

export const updateQuestion = async (req, res) => {
  const id = req.params.id;
  const logToFile = (msg) => {
    console.log(`[Question Update] ${msg}`);
  };

  logToFile(`Started update for ID: ${id}`);
  try {
    const { _id, ...updateData } = req.body;

    // Build flexible query
    const orConditions = [{ id: id }];
    if (!isNaN(id)) orConditions.push({ id: Number(id) });

    if (id && id.length === 24) {
      try {
        const oid = new mongoose.Types.ObjectId(id);
        orConditions.push({ _id: oid });
        logToFile(`Added ObjectId condition: ${oid}`);
      } catch (e) {
        logToFile(`Skipped ObjectId creation: invalid format`);
      }
    }
    orConditions.push({ _id: id });

    logToFile(`Final query conditions: ${JSON.stringify(orConditions)}`);

    // Plan A
    const mainResult = await db.collection('questions').updateOne(
      { $or: orConditions },
      { $set: { ...updateData, updatedAt: new Date().toISOString() } }
    );

    logToFile(`Plan A (Standalone) Matched: ${mainResult.matchedCount}, Modified: ${mainResult.modifiedCount}`);

    if (mainResult.matchedCount > 0) {
      return res.json({ success: true, message: 'Question updated in global collection' });
    }

    // Plan B
    logToFile(`Searching embedded questions...`);
    let embeddedMatch = false;
    for (const condition of orConditions) {
      const searchKey = Object.keys(condition)[0];
      const searchValue = condition[searchKey];
      const testQuery = { [`questions.${searchKey}`]: searchValue };

      const testUpdate = await db.collection('tests').updateMany(
        testQuery,
        { $set: { ...Object.fromEntries(Object.entries(updateData).map(([k, v]) => [`questions.$.${k}`, v])) } }
      );

      if (testUpdate.matchedCount > 0) {
        logToFile(`Plan B (Embedded) SUCCESS using ${JSON.stringify(condition)}`);
        embeddedMatch = true;
        break;
      }
    }

    if (embeddedMatch) {
      return res.json({ success: true, message: 'Question updated in tests' });
    }

    logToFile(`FAILED: No match found for ${id}`);
    return res.status(404).json({ error: 'Question not found' });
  } catch (error) {
    logToFile(`CRASH: ${error.message}`);
    res.status(500).json({ error: 'Failed to update question: ' + error.message });
  }
};

export const deleteQuestion = async (req, res) => {
  try {
    const id = req.params.id;

    // Build flexible query to match by id field, _id string, or ObjectId
    const orConditions = [
      { id: id }
    ];
    if (!isNaN(id)) orConditions.push({ id: Number(id) });
    if (mongoose && mongoose.Types && mongoose.Types.ObjectId.isValid(id)) {
      orConditions.push({ _id: new mongoose.Types.ObjectId(id) });
    }
    orConditions.push({ _id: id });

    // Deleting from global questions collection
    const mainResult = await db.collection('questions').deleteMany({ $or: orConditions });

    // Clean up embedded questions in any test - only if questions field is an array
    const testResult = await db.collection('tests').updateMany(
      { questions: { $type: 'array' } },
      {
        $pull: {
          questions: {
            $or: orConditions.map(c => {
              const key = Object.keys(c)[0];
              const val = c[key];
              return { [key]: val };
            })
          }
        }
      }
    );

    if (mainResult.deletedCount === 0 && testResult.matchedCount === 0) {
      console.warn(`[Question Delete] No match found for ID: ${id} to delete`);
      return res.status(404).json({ error: 'Question not found' });
    }

    console.log(`[Question Delete] Deleted ${mainResult.deletedCount} from global and removed from matching tests`);
    res.json({ success: true, message: 'Question deleted successfully' });
  } catch (error) {
    console.error('[Question Delete] Error:', error);
    res.status(500).json({ error: 'Failed to delete question: ' + error.message });
  }
};

export const deleteAllQuestions = async (req, res) => {
  try {
    const result = await db.collection('questions').deleteMany({});
    res.json({ success: true, message: `Deleted ${result.deletedCount} questions` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete all questions' });
  }
};

export const bulkDeleteQuestions = async (req, res) => {
  try {
    const { ids, questionIds } = req.body;
    const finalIds = ids || questionIds;

    if (!Array.isArray(finalIds) || finalIds.length === 0) {
      return res.status(400).json({ error: 'No question IDs provided' });
    }

    const stringIds = finalIds.map(id => String(id));
    const mongoIds = [];
    stringIds.forEach(id => {
      if (id && id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id)) {
        try {
          mongoIds.push(new mongoose.Types.ObjectId(id));
        } catch (e) { }
      }
    });

    const qFilter = {
      $or: [
        { id: { $in: finalIds } },
        { id: { $in: stringIds } },
        { _id: { $in: mongoIds } },
        { _id: { $in: stringIds } }
      ]
    };

    const result = await db.collection('questions').deleteMany(qFilter);
    console.log(`[Bulk Delete] Deleted ${result.deletedCount} questions from the questions collection.`);

    try {
      await db.collection('tests').updateMany(
        { questions: { $type: 'array' } },
        {
          $pull: {
            questions: {
              $or: [
                { id: { $in: finalIds } },
                { id: { $in: stringIds } },
                { _id: { $in: mongoIds } },
                { _id: { $in: stringIds } }
              ]
            }
          }
        }
      );
    } catch (pullErr) {
      console.warn('[Bulk Delete] Embedded cleanup warning:', pullErr.message);
    }

    res.json({
      success: true,
      message: `Questions deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('[Bulk Delete] Server Error:', error);
    res.status(500).json({ error: 'Failed to bulk delete questions', details: error.message });
  }
};

export const bulkCreateQuestions = async (req, res) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) return res.status(400).json({ error: 'No questions provided' });
    const result = await db.collection('questions').insertMany(questions);
    res.status(201).json({ success: true, inserted: result.insertedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk create questions' });
  }
};

export const bulkExcelUpload = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
    const questions = jsonData.map((row, i) => ({
      id: row.id || `q_${Date.now()}_${i}`,
      question: row.question || row.Question || '',
      optionA: row.optionA || row['Option A'] || '',
      optionB: row.optionB || row['Option B'] || '',
      optionC: row.optionC || row['Option C'] || '',
      optionD: row.optionD || row['Option D'] || '',
      correctAnswer: (row.correctAnswer || row['Correct Answer'] || 'A').toString().toUpperCase(),
      explanation: row.explanation || '',
      marks: parseInt(row.marks) || 4,
      negativeMarks: parseFloat(row.negativeMarks) || 0
    }));
    if (questions.length === 0) return res.status(400).json({ error: 'No valid question data found' });
    const result = await db.collection('questions').insertMany(questions);
    res.status(201).json({ success: true, inserted: result.insertedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process Excel: ' + error.message });
  }
};
