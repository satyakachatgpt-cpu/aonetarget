import { db } from '../config/db.js';

export const getAllSubjectiveTests = async (req, res) => {
  try {
    const tests = await db.collection('subjectiveTests').find({}).toArray();
    console.log('GET /api/subjective-tests - Found', tests.length, 'tests');
    res.json(tests);
  } catch (error) {
    console.error('Error fetching subjective tests:', error);
    res.status(500).json({ error: 'Failed to fetch subjective tests' });
  }
};

export const createSubjectiveTest = async (req, res) => {
  try {
    console.log('POST /api/subjective-tests - Received test data:', req.body);
    const result = await db.collection('subjectiveTests').insertOne(req.body);
    console.log('Subjective test created successfully with ID:', result.insertedId);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    console.error('Error creating subjective test:', error);
    res.status(500).json({ error: 'Failed to create subjective test', details: error.message });
  }
};

export const updateSubjectiveTest = async (req, res) => {
  try {
    console.log('PUT /api/subjective-tests/:id - Updating test:', req.params.id, req.body);
    const { _id, ...updateData } = req.body;
    const result = await db.collection('subjectiveTests').updateOne(
      { id: req.params.id },
      { $set: updateData }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Test not found' });
    console.log('Subjective test updated successfully:', req.params.id);
    res.json({ success: true, message: 'Test updated' });
  } catch (error) {
    console.error('Error updating subjective test:', error);
    res.status(500).json({ error: 'Failed to update subjective test', details: error.message });
  }
};

export const deleteSubjectiveTest = async (req, res) => {
  try {
    console.log('DELETE /api/subjective-tests/:id - Deleting test:', req.params.id);
    const result = await db.collection('subjectiveTests').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Test not found' });
    console.log('Subjective test deleted successfully:', req.params.id);
    res.json({ success: true, message: 'Test deleted' });
  } catch (error) {
    console.error('Error deleting subjective test:', error);
    res.status(500).json({ error: 'Failed to delete subjective test', details: error.message });
  }
};

export const deleteAllSubjectiveTests = async (req, res) => {
  try {
    const result = await db.collection('subjectiveTests').deleteMany({});
    res.json({ success: true, message: `Deleted ${result.deletedCount} subjective tests` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete all subjective tests' });
  }
};

export const bulkCreateSubjectiveTests = async (req, res) => {
  try {
    const { tests } = req.body;
    if (!Array.isArray(tests) || tests.length === 0) return res.status(400).json({ error: 'No tests provided' });
    const result = await db.collection('subjectiveTests').insertMany(tests);
    res.status(201).json({ success: true, inserted: result.insertedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk create subjective tests' });
  }
};

export const bulkUpdateSubjectiveTests = async (req, res) => {
  try {
    const updates = (req.body && req.body.updates) ? req.body.updates : (Array.isArray(req.body) ? req.body : []);
    for (const update of updates) {
      const { id, _id, ...data } = update;
      if (id) await db.collection('subjectiveTests').updateOne({ id }, { $set: data });
    }
    res.json({ success: true, message: `Updated ${updates.length} subjective tests` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update all subjective tests' });
  }
};
