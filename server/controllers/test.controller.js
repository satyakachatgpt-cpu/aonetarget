import mongoose from 'mongoose';
const { ObjectId } = mongoose.Types;
import { db } from '../config/db.js';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';
import { findCourse, getRelatedCourseIds } from '../services/course.service.js';

/**
 * MCQ Framework - Test Management Controller
 */

// GET /api/tests
export const getAllTests = async (req, res) => {
  try {
    const startTimeMetric = Date.now();
    const { courseId } = req.query;

    const matchStage = courseId ? { courseId } : {};
    const tests = await db.collection('tests').find(matchStage).toArray();

    // Count questions accurately for each test using OR conditions (handles both 'id' and '_id')
    const testsWithCounts = await Promise.all(tests.map(async (test) => {
      const testId = test.id ? String(test.id) : null;
      const testObjectId = test._id ? test._id.toString() : null;

      const orConditions = [];
      if (testId) {
        orConditions.push({ testId: testId });
        if (!isNaN(testId)) orConditions.push({ testId: Number(testId) });
      }
      if (testObjectId && testObjectId !== testId) {
        orConditions.push({ testId: testObjectId });
        if (ObjectId.isValid(testObjectId)) {
          orConditions.push({ testId: new ObjectId(testObjectId) });
        }
      }
      // also check for "test_ID" format
      if (testId) orConditions.push({ testId: `test_${testId}` });
      if (testObjectId) orConditions.push({ testId: `test_${testObjectId}` });

      const questionCount = orConditions.length > 0
        ? await db.collection('questions').countDocuments({ $or: orConditions })
        : 0;

      return {
        ...test,
        id: testId || testObjectId,
        questions: questionCount
      };
    }));

    console.log(`[PERF] Admin /api/tests loaded with counts in ${Date.now() - startTimeMetric}ms`);
    res.json(testsWithCounts);
  } catch (error) {
    console.error('Error fetching tests:', error);
    res.status(500).json({ error: 'Failed to fetch tests' });
  }
};

// GET /api/tests/:id
export const getTestById = async (req, res) => {
  try {
    const id = req.params.id;
    const orConditions = [
      { id: id },
      { id: !isNaN(id) ? Number(id) : null },
      { _id: id }
    ].filter(v => v.id !== null && v.id !== undefined || v._id !== null && v._id !== undefined);

    if (ObjectId.isValid(id)) {
      orConditions.push({ _id: new ObjectId(id) });
    }

    let test = await db.collection('tests').findOne({ $or: orConditions });

    if (!test) {
      const questionCount = await db.collection('questions').countDocuments({
        $or: [{ testId: id }, { testId: !isNaN(id) ? Number(id) : id }]
      });
      if (questionCount > 0) {
        test = {
          id,
          name: `Unregistered Test ${id}`,
          questions: [],
          temp: true
        };
      } else {
        return res.status(404).json({ error: 'Test not found' });
      }
    }

    const testIdStr = test.id ? String(test.id) : test._id?.toString();
    const questionFilter = {
      $or: [
        { testId: id },
        { testId: testIdStr },
        { testId: String(id) },
        { testId: "test_" + id },
        { testId: "test_" + testIdStr }
      ]
    };

    if (!isNaN(id)) questionFilter.$or.push({ testId: Number(id) });
    if (testIdStr && !isNaN(testIdStr)) questionFilter.$or.push({ testId: Number(testIdStr) });
    if (ObjectId.isValid(id)) questionFilter.$or.push({ testId: new ObjectId(id) });
    if (test._id && ObjectId.isValid(test._id.toString())) {
      questionFilter.$or.push({ testId: new ObjectId(test._id.toString()) });
    }

    const separateQuestions = await db.collection('questions').find(questionFilter).sort({ orderIndex: 1, id: 1 }).toArray();
    const embeddedQuestions = Array.isArray(test.questions) ? test.questions : [];
    const questions = separateQuestions.length > 0 ? separateQuestions : embeddedQuestions;
    res.json({ ...test, questions });
  } catch (error) {
    console.error('Error fetching test:', error);
    res.status(500).json({ error: 'Failed to fetch test' });
  }
};

// POST /api/tests
export const createTest = async (req, res) => {
  try {
    console.log('POST /api/tests - Received test data:', req.body);
    const result = await db.collection('tests').insertOne(req.body);
    console.log('Test created successfully with ID:', result.insertedId);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    console.error('Error creating test:', error);
    res.status(500).json({ error: 'Failed to create test', details: error.message });
  }
};

// PUT /api/tests/:id
export const updateTest = async (req, res) => {
  try {
    const id = req.params.id;
    const orConditions = [
      { id: id },
      { id: !isNaN(id) ? Number(id) : null },
      { _id: id },
      { _id: ObjectId.isValid(id) ? new ObjectId(id) : null }
    ].filter(v => v.id !== null && v.id !== undefined || v._id !== null && v._id !== undefined);
    
    const query = { $or: orConditions };
    const { _id, ...updateData } = req.body;
    
    const result = await db.collection('tests').updateOne(
      query, 
      { $set: { ...updateData, updatedAt: new Date().toISOString() } }, 
      { upsert: true }
    );
    
    res.json({ success: true, message: result.upsertedCount > 0 ? 'Test created' : 'Test updated' });
  } catch (error) {
    console.error('Error updating test:', error);
    res.status(500).json({ error: 'Failed to update test' });
  }
};

// DELETE /api/tests/:id
export const deleteTest = async (req, res) => {
  try {
    const id = req.params.id;
    const orConditions = [
      { id: id },
      { id: !isNaN(id) ? Number(id) : null },
      { _id: id },
      { _id: ObjectId.isValid(id) ? new ObjectId(id) : null }
    ].filter(v => v.id !== null && v.id !== undefined || v._id !== null && v._id !== undefined);
    
    const query = { $or: orConditions };
    const result = await db.collection('tests').deleteOne(query);
    
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Test not found' });
    res.json({ success: true, message: 'Test deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete test' });
  }
};

// POST /api/tests/:id/duplicate
export const duplicateTest = async (req, res) => {
  try {
    const id = req.params.id;
    const orConditions = [
      { id: id },
      { id: !isNaN(id) ? Number(id) : null },
      { _id: id }
    ].filter(v => v.id !== null && v.id !== undefined || v._id !== null && v._id !== undefined);
    if (ObjectId.isValid(id)) orConditions.push({ _id: new ObjectId(id) });

    const test = await db.collection('tests').findOne({ $or: orConditions });
    if (!test) return res.status(404).json({ error: 'Test not found' });

    const { _id, id: oldId, ...duplicateData } = test;
    duplicateData.name = `${test.name || test.title || 'Test'} Copy`;
    duplicateData.id = `test_${Date.now()}`;
    duplicateData.createdAt = new Date();
    duplicateData.updatedAt = new Date();
    duplicateData.status = 'draft';

    const result = await db.collection('tests').insertOne(duplicateData);

    const testIdForQuestions = test.id || test._id.toString();
    const questionFilter = { $or: [{ testId: id }, { testId: testIdForQuestions }] };
    if (!isNaN(id)) questionFilter.$or.push({ testId: Number(id) });
    const questions = await db.collection('questions').find(questionFilter).toArray();

    if (questions.length > 0) {
      const newQuestions = questions.map(({ _id, ...q }) => ({
        ...q,
        testId: duplicateData.id,
        createdAt: new Date()
      }));
      await db.collection('questions').insertMany(newQuestions);
    }

    res.status(201).json({ _id: result.insertedId, ...duplicateData });
  } catch (error) {
    console.error('Duplicate error:', error);
    res.status(500).json({ error: 'Failed to duplicate test' });
  }
};

// DELETE /api/tests
export const deleteAllTests = async (req, res) => {
  try {
    const result = await db.collection('tests').deleteMany({});
    res.json({ success: true, message: `Deleted ${result.deletedCount} tests` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete all tests' });
  }
};

// POST /api/tests/bulk
export const bulkCreateTests = async (req, res) => {
  try {
    const { tests } = req.body;
    if (!Array.isArray(tests) || tests.length === 0) return res.status(400).json({ error: 'No tests provided' });
    const result = await db.collection('tests').insertMany(tests);
    res.status(201).json({ success: true, inserted: result.insertedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk create tests' });
  }
};

// PUT /api/tests/update-all
export const updateAllTests = async (req, res) => {
  try {
    const updates = (req.body && req.body.updates) ? req.body.updates : (Array.isArray(req.body) ? req.body : []);
    for (const update of updates) {
      const { id, _id, ...data } = update;
      if (id) await db.collection('tests').updateOne({ id }, { $set: data });
    }
    res.json({ success: true, message: 'Tests updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update tests' });
  }
};

// GET /api/tests/:id/export
export const exportTestToFile = async (req, res) => {
  try {
    const id = req.params.id;
    const { solution } = req.query;
    const orConditions = [
      { id: id },
      { id: !isNaN(id) ? Number(id) : null },
      { _id: id }
    ].filter(v => v.id !== null && v.id !== undefined || v._id !== null && v._id !== undefined);
    if (ObjectId.isValid(id)) orConditions.push({ _id: new ObjectId(id) });

    const test = await db.collection('tests').findOne({ $or: orConditions });
    if (!test) return res.status(404).json({ error: 'Test not found' });

    const testIdForQuestions = test.id || test._id.toString();
    const questionFilter = { $or: [{ testId: id }, { testId: testIdForQuestions }] };
    if (!isNaN(id)) questionFilter.$or.push({ testId: Number(id) });
    const questions = await db.collection('questions').find(questionFilter).toArray();

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: test.name || test.title || 'Test',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          ...questions.flatMap((q, i) => [
            new Paragraph({
              children: [
                new TextRun({ text: `Q${i + 1}. ${q.question}`, bold: true }),
              ],
              spacing: { before: 200 },
            }),
            new Paragraph({ text: `A) ${q.optionA}` }),
            new Paragraph({ text: `B) ${q.optionB}` }),
            new Paragraph({ text: `C) ${q.optionC}` }),
            new Paragraph({ text: `D) ${q.optionD}` }),
            ...(solution === 'true' ? [
              new Paragraph({
                children: [
                  new TextRun({ text: `Correct Answer: ${q.correctAnswer}`, color: '008000', bold: true }),
                ],
              }),
              new Paragraph({ text: `Explanation: ${q.explanation || 'None'}` }),
            ] : []),
          ]),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=${(test.name || 'test').replace(/\s+/g, '_')}.docx`);
    res.send(buffer);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export test' });
  }
};

// POST /api/tests/:testId/bulk-excel
export const bulkExcelImport = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
    
    let test = await db.collection('tests').findOne({ id: req.params.testId });
    if (!test && ObjectId.isValid(req.params.testId)) {
      test = await db.collection('tests').findOne({ _id: new ObjectId(req.params.testId) });
    }
    
    const existingQuestions = test ? (test.questions || []) : [];
    const testMarks = test ? (Number(test.marks) || 0) : 0;
    const newQuestions = jsonData.map((row, i) => {
      let providedMarks = (row.marks !== undefined && row.marks !== '') ? parseFloat(row.marks) : ((row.Marks !== undefined && row.Marks !== '') ? parseFloat(row.Marks) : undefined);
      let providedNeg = (row.negativeMarks !== undefined && row.negativeMarks !== '') ? parseFloat(row.negativeMarks) : ((row['Negative Marks'] !== undefined && row['Negative Marks'] !== '') ? parseFloat(row['Negative Marks']) : undefined);

      if ((providedMarks === undefined || isNaN(providedMarks)) && testMarks <= 0) {
         throw new Error(`Excel Import Blocked: Question ${i + 1} is missing marks, and Test has no default marks.`);
      }

      return {
        id: row.id || `q_${Date.now()}_${i}`,
        question: row.question || row.Question || '',
        optionA: row.optionA || row['Option A'] || '',
        optionB: row.optionB || row['Option B'] || '',
        optionC: row.optionC || row['Option C'] || '',
        optionD: row.optionD || row['Option D'] || '',
        correctAnswer: (row.correctAnswer || row['Correct Answer'] || 'A').toString().toUpperCase(),
        explanation: row.explanation || row.Explanation || '',
        marks: providedMarks,
        negativeMarks: providedNeg
      };
    });
    
    const allQuestions = [...existingQuestions, ...newQuestions];
    if (test) {
      await db.collection('tests').updateOne({ _id: test._id }, { $set: { questions: allQuestions } });
    }
    res.json({ success: true, added: newQuestions.length, total: allQuestions.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process Excel file: ' + error.message });
  }
};

// POST /api/tests/:testId/bulk-questions
export const bulkQuestionsImport = async (req, res) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'No questions provided' });
    }
    
    let test = await db.collection('tests').findOne({ id: req.params.testId });
    if (!test) {
      try { test = await db.collection('tests').findOne({ _id: new ObjectId(req.params.testId) }); } catch (e) { }
    }
    
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }
    
    const existingQuestions = test.questions || [];
    const testMarks = Number(test.marks) || 0;
    
    const newQuestions = questions.map((q, i) => {
      let providedMarks = q.marks !== undefined && q.marks !== '' ? parseFloat(q.marks) : undefined;
      let providedNeg = (q.negativeMarks !== undefined && q.negativeMarks !== '') ? parseFloat(q.negativeMarks) : ((q.negative_marks !== undefined && q.negative_marks !== '') ? parseFloat(q.negative_marks) : undefined);

      if ((providedMarks === undefined || isNaN(providedMarks)) && testMarks <= 0) {
         throw new Error(`Bulk Import Blocked: Question ${i + 1} is missing marks, and Test has no default marks.`);
      }

      return {
        id: `q_${Date.now()}_${i}`,
        question: q.question || '',
        optionA: q.optionA || q.option_a || '',
        optionB: q.optionB || q.option_b || '',
        optionC: q.optionC || q.option_c || '',
        optionD: q.optionD || q.option_d || '',
        correctAnswer: (q.correctAnswer || q.correct_answer || q.answer || 'A').toUpperCase(),
        explanation: q.explanation || '',
        marks: providedMarks,
        negativeMarks: providedNeg,
        questionImage: q.questionImage || '',
      };
    });
    
    const allQuestions = [...existingQuestions, ...newQuestions];
    await db.collection('tests').updateOne(
      { _id: test._id },
      { $set: { questions: allQuestions } }
    );
    res.json({ success: true, added: newQuestions.length, total: allQuestions.length });
  } catch (error) {
    console.error('Error bulk uploading questions:', error);
    res.status(500).json({ error: 'Failed to bulk upload questions' });
  }
};

// PATCH /api/tests/:id/publish
export const publishTest = async (req, res) => {
  const id = req.params.id;
  console.log(`[Publish] Starting publish for ID: ${id}`);
  try {
    const now = new Date();
    const formatted = now.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const orConditions = [{ id: id }];
    if (!isNaN(id)) orConditions.push({ id: Number(id) });
    if (ObjectId.isValid(id)) orConditions.push({ _id: new ObjectId(id) });
    orConditions.push({ _id: id });

    // Validation: Block incomplete tests
    const test = await db.collection('tests').findOne({ $or: orConditions });
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    const qFilter = { $or: [{ testId: id }, { testId: String(id) }] };
    if (!isNaN(id)) qFilter.$or.push({ testId: Number(id) });
    if (ObjectId.isValid(id)) qFilter.$or.push({ testId: new ObjectId(id) });
    
    const questions = await db.collection('questions').find(qFilter).toArray();
    
    const testMarks = test.marks || test.marksPerQuestion;
    const testDuration = test.duration || test.time;
    const testNegativeMarking = test.negativeMarking;
    const declaredCount = Number(test.noOfQuestions) || 0;
    const actualCount = questions.length;

    // VALIDATION: Strict Consistency Checks
    if (declaredCount > 0 && actualCount !== declaredCount) {
      return res.status(400).json({ 
        error: `Inconsistent Question Count! Test settings say ${declaredCount} questions, but ${actualCount} questions have been added. Please fix before publishing.` 
      });
    }

    if (!testDuration) {
      return res.status(400).json({ error: 'Test Duration (Timer) is missing. Set duration before publishing.' });
    }

    // CHECK: Every question must have marks (directly or via test-level default)
    const questionsWithoutMarks = questions.filter(q => 
      (q.marks === undefined || q.marks === null || q.marks === "") && 
      (q.positiveMarks === undefined || q.positiveMarks === null || q.positiveMarks === "") && 
      (test.marksPerQuestion === undefined || test.marksPerQuestion === null || test.marksPerQuestion === "")
    );

    if (questionsWithoutMarks.length > 0) {
      return res.status(400).json({ 
        error: `${questionsWithoutMarks.length} questions are missing marks, and no Test-level default (Marks Per Question) is set. Please specify marks for all questions.` 
      });
    }

    let hasError = false;
    let errorMsg = '';

    for (let i = 0; i < questions.length; i++) {
      let q = questions[i];
      let qMarks = Number(q.marks) || Number(q.positiveMarks);
      if (isNaN(qMarks) || qMarks <= 0) {
         if (testMarks <= 0) {
           hasError = true;
           errorMsg = `Publish blocked: Missing marks configuration. Question ${i + 1} has no marks, and Test has no default marks.`;
           break;
         }
      }
    }

    if (questions.length === 0 && test.type !== 'PDF') {
       // Optionally block empty tests, but maybe subjective tests have 0 questions?
       // Leaving it optional to avoid breaking existing flows, mainly validate the ones with questions
    }

    if (hasError) {
      return res.status(400).json({ error: errorMsg });
    }

    const result = await db.collection('tests').updateOne(
      { $or: orConditions },
      { $set: { published: formatted, status: 'active', updatedAt: now.toISOString() } },
      { upsert: true }
    );

    console.log(`[Publish] matched=${result.matchedCount}, upserted=${result.upsertedCount}, modified=${result.modifiedCount}`);
    res.json({ success: true, published: formatted });
  } catch (error) {
    console.log(`[Publish] ERROR: ${error.message}`);
    res.status(500).json({ error: 'Failed to publish test: ' + error.message });
  }
};

// COURSE-LINKED TEST HANDLERS

// GET /api/courses/:courseId/tests (Canonical: Line 2502)
export const getCourseTests = async (req, res) => {
  try {
    const { courseId } = req.params;
    const query = { $or: [{ courseId }, { course: courseId }] };
    const tests = await db.collection('tests').find(query).toArray();

    // Fetch question counts
    const testsWithCounts = await Promise.all(tests.map(async (test) => {
      const testId = test.id || test._id?.toString();
      const questionFilter = { $or: [{ testId: testId }, { testId: String(testId) }, { testId: testId?.toString() }] };
      if (testId && !isNaN(testId)) questionFilter.$or.push({ testId: Number(testId) });
      if (test._id && ObjectId.isValid(test._id.toString())) {
        questionFilter.$or.push({ testId: new ObjectId(test._id.toString()) });
      }
      const questionCount = await db.collection('questions').countDocuments(questionFilter);

      return {
        ...test,
        id: test.id || test._id?.toString(),
        questions: questionCount || (Array.isArray(test.questions) ? test.questions.length : (test.questions || 0))
      };
    }));

    res.json(testsWithCounts);
  } catch (error) {
    console.error('Failed to fetch course tests:', error);
    res.status(500).json({ error: 'Failed to fetch course tests' });
  }
};

// POST /api/courses/:courseId/tests
export const addTestToCourse = async (req, res) => {
  try {
    const testData = { ...req.body, courseId: req.params.courseId };
    const result = await db.collection('tests').insertOne(testData);
    res.status(201).json({ _id: result.insertedId, ...testData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add test to course' });
  }
};

// PUT /api/courses/:courseId/tests/:testId
export const updateCourseTest = async (req, res) => {
  try {
    const course = await findCourse(req.params.courseId);
    const testId = req.params.testId;

    const query = {
      $or: [
        { id: testId },
        { _id: ObjectId.isValid(testId) ? new ObjectId(testId) : null }
      ].filter(v => v.id || v._id)
    };

    if (course) {
      query.courseId = { $in: [course.id, course._id.toString(), req.params.courseId] };
    }

    const { _id, ...updateData } = req.body;
    const result = await db.collection('tests').updateOne(
      query,
      { $set: { ...updateData, updatedAt: new Date().toISOString() } }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Test not found' });
    res.json({ success: true, message: 'Test updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update test' });
  }
};

// DELETE /api/courses/:courseId/tests/:testId
export const deleteCourseTest = async (req, res) => {
  const { courseId, testId } = req.params;
  console.log(`[DELETE TEST] Attempting to delete test ${testId} from course ${courseId}`);
  try {
    const course = await findCourse(courseId);
    const idVariants = await getRelatedCourseIds(course, courseId);

    const idConditions = [
      { id: testId },
      { id: !isNaN(testId) ? Number(testId) : null },
      { _id: testId },
      { _id: ObjectId.isValid(testId) ? new ObjectId(testId) : null }
    ].filter(v => (v.id !== null && v.id !== undefined) || (v._id !== null && v._id !== undefined));

    const query = {
      $or: idConditions,
      $and: [{
        $or: [
          { courseId: { $in: idVariants } },
          { course: { $in: idVariants } }
        ]
      }]
    };

    const result = await db.collection('tests').deleteOne(query);
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Test not found' });
    res.json({ success: true, message: 'Test deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete test' });
  }
};
