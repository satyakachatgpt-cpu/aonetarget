import { db } from '../config/db.js';

/**
 * Test Series Management Controller
 */

// GET /api/test-series
export const getAllTestSeries = async (req, res) => {
  try {
    const seriesFromCollection = await db.collection('testSeries').find({}).toArray();
    const seriesFromTests = await db.collection('tests').find({ isSeries: true }).toArray();

    const mergedMap = new Map();
    for (const s of seriesFromCollection) {
      const key = s.id || s._id.toString();
      mergedMap.set(key, s);
    }
    for (const s of seriesFromTests) {
      const key = s.id || s._id.toString();
      if (!mergedMap.has(key)) {
        mergedMap.set(key, {
          ...s,
          id: s.id || s._id.toString(),
          seriesName: s.seriesName || s.name || s.title,
          totalTests: s.totalTests || s.questions || 0,
          status: s.status || 'active'
        });
      }
    }
    for (const s of seriesFromCollection) {
      const key = s.id || s._id.toString();
      const existing = mergedMap.get(key);
      if (existing && !existing.id) {
        existing.id = key;
      }
    }

    const combined = Array.from(mergedMap.values());
    console.log('GET /api/test-series - Found', combined.length, 'series (collection:', seriesFromCollection.length, '+ tests:', seriesFromTests.length, ')');
    res.json(combined);
  } catch (error) {
    console.error('Error fetching test series:', error);
    res.status(500).json({ error: 'Failed to fetch test series' });
  }
};

// POST /api/test-series
export const createTestSeries = async (req, res) => {
  try {
    console.log('POST /api/test-series - Received series data:', req.body);
    const result = await db.collection('testSeries').insertOne(req.body);
    console.log('Series created successfully with ID:', result.insertedId);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    console.error('Error creating test series:', error);
    res.status(500).json({ error: 'Failed to create test series', details: error.message });
  }
};

// PUT /api/test-series/:id
export const updateTestSeries = async (req, res) => {
  try {
    console.log('PUT /api/test-series/:id - Updating series:', req.params.id, req.body);
    const { _id, ...updateData } = req.body;
    const result = await db.collection('testSeries').updateOne(
      { id: req.params.id },
      { $set: updateData }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Series not found' });
    console.log('Series updated successfully:', req.params.id);
    res.json({ success: true, message: 'Series updated' });
  } catch (error) {
    console.error('Error updating test series:', error);
    res.status(500).json({ error: 'Failed to update test series', details: error.message });
  }
};

// DELETE /api/test-series/:id
export const deleteTestSeries = async (req, res) => {
  try {
    console.log('DELETE /api/test-series/:id - Deleting series:', req.params.id);
    const result = await db.collection('testSeries').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Series not found' });
    console.log('Series deleted successfully:', req.params.id);
    res.json({ success: true, message: 'Series deleted' });
  } catch (error) {
    console.error('Error deleting test series:', error);
    res.status(500).json({ error: 'Failed to delete test series', details: error.message });
  }
};

// DELETE /api/test-series (Delete all)
export const deleteAllTestSeries = async (req, res) => {
  try {
    const result = await db.collection('testSeries').deleteMany({});
    res.json({ success: true, message: `Deleted ${result.deletedCount} test series` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete all test series' });
  }
};

// POST /api/test-series/bulk
export const bulkCreateTestSeries = async (req, res) => {
  try {
    const { series } = req.body;
    if (!Array.isArray(series) || series.length === 0) return res.status(400).json({ error: 'No series provided' });
    const result = await db.collection('testSeries').insertMany(series);
    res.status(201).json({ success: true, inserted: result.insertedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk create test series' });
  }
};

// PUT /api/test-series/update-all
export const updateAllTestSeries = async (req, res) => {
  try {
    const updates = (req.body && req.body.updates) ? req.body.updates : (Array.isArray(req.body) ? req.body : []);
    for (const update of updates) {
      const { id, _id, ...data } = update;
      if (id) await db.collection('testSeries').updateOne({ id }, { $set: data });
    }
    res.json({ success: true, message: `Updated ${updates.length} series` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update all test series' });
  }
};
