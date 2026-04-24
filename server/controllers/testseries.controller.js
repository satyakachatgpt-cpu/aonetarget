import { db } from '../config/db.js';
import mongoose from 'mongoose';
import { getCourseIdVariants } from '../services/course.service.js';
const { ObjectId } = mongoose.Types;

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

    // Calculate actual test count for each series
    try {
      const allTestsLightweight = await db.collection('tests').find({}).toArray();
      console.log('[DEBUG] allTestsLightweight length:', allTestsLightweight.length);
      
      for (const series of combined) {
        const seriesIdStr = String(series.id || series._id);
        const seriesTestIdsArray = Array.isArray(series.testIds) ? series.testIds.map(String) : [];
        const seriesTestsObjectsIds = Array.isArray(series.tests) ? series.tests.map(st => String(st.id || st._id)) : [];
        
        const count = allTestsLightweight.filter(t => {
          const tIdStr = String(t.id || t._id);
          return (
            String(t.seriesId) === seriesIdStr || 
            String(t.courseId) === seriesIdStr ||
            (Array.isArray(t.courseIds) && t.courseIds.map(String).includes(seriesIdStr)) ||
            (Array.isArray(t.testSeries) && t.testSeries.map(String).includes(seriesIdStr)) ||
            seriesTestIdsArray.includes(tIdStr) ||
            seriesTestsObjectsIds.includes(tIdStr)
          );
        }).length;
        
        // console.log(`[DEBUG] Series: ${seriesIdStr}, Count: ${count}`);
        series.totalTests = count;
      }
    } catch (countError) {
      console.error('Error calculating test counts for series:', countError);
    }

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

// GET /api/test-series/:id/users
export const getTestSeriesUsers = async (req, res) => {
  try {
    const testSeriesId = req.params.id;

    // 1. Use centralized service to resolve all possible related IDs (variants, packages, etc.)
    const idVariants = await getCourseIdVariants(testSeriesId);
    
    // Add the original ID if not already included
    if (!idVariants.includes(testSeriesId)) idVariants.push(testSeriesId);

    // Prepare ObjectId versions for variants that look like MongoDB IDs
    const objectIdVariants = idVariants
      .filter(id => id && typeof id === 'string' && id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id))
      .map(id => new ObjectId(id));

    // 2. Fetch students who have any of these variants in their enrolledCourses
    const students = await db.collection('students').find({
      $or: [
        { enrolledCourses: { $in: idVariants } },
        { enrolledCourses: { $in: objectIdVariants } }
      ]
    }).toArray();

    // 3. Fetch purchases for any of these variants
    const purchases = await db.collection('purchases').find({
      $or: [
        { courseId: { $in: idVariants } },
        { courseId: { $in: objectIdVariants } }
      ]
    }).toArray();

    const purchaseMap = {};
    for (const p of purchases) {
      const sId = String(p.studentId);
      if (!purchaseMap[sId] || new Date(p.createdAt) > new Date(purchaseMap[sId].createdAt)) {
        purchaseMap[sId] = p;
      }
    }

    // 4. Fetch the test series document to get validity settings
    const series = await db.collection('testSeries').findOne({ 
      $or: [{ id: testSeriesId }, { _id: ObjectId.isValid(testSeriesId) ? new ObjectId(testSeriesId) : null }] 
    }) || await db.collection('tests').findOne({ 
      $or: [{ id: testSeriesId }, { _id: ObjectId.isValid(testSeriesId) ? new ObjectId(testSeriesId) : null }] 
    });

    const users = students.map(student => {
      const sId = String(student.id || student._id);
      const p = purchaseMap[sId] || purchaseMap[student.id];
      
      let expiryDate = 'Lifetime';
      if (series) {
        let mode = series.expiryMode;
        let val = series.validity;

        // Handle Course/Test Series complex validity object structure
        if (typeof val === 'object' && val !== null) {
          if (val.tab === 'end') {
            mode = 'End Date';
            val = val.endDate;
          } else if (val.tab === 'set') {
            mode = 'Validity';
            val = val.value;
          } else if (val.tab === 'lifetime') {
            mode = 'Lifetime Access';
            val = null;
          }
        }
        
        if (mode === 'End Date' && val) {
          expiryDate = val;
        } else if (mode === 'Validity' && val && p) {
          const months = parseInt(val);
          if (!isNaN(months)) {
            const date = new Date(p.createdAt);
            date.setMonth(date.getMonth() + months);
            expiryDate = date.toLocaleDateString('en-IN');
          }
        } else if (mode === 'Lifetime Access') {
          expiryDate = 'Lifetime';
        } else if (mode === 'Validity' && val) {
          // Default for manual enrollment if no purchase found
          expiryDate = `+${val} Months`;
        } else if (val && !isNaN(parseInt(val))) {
          // Fallback: If validity is a number but mode is missing, assume "Validity" mode
          const months = parseInt(val);
          if (p) {
            const date = new Date(p.createdAt);
            date.setMonth(date.getMonth() + months);
            expiryDate = date.toLocaleDateString('en-IN');
          } else {
            expiryDate = `+${months} Months`;
          }
        }
      }

      return {
        id: student.id || student._id,
        name: student.name || 'Unknown',
        phone: student.phone || student.email || 'N/A',
        transactionId: p ? (p.razorpayPaymentId || p.id) : 'Manual/Free',
        dateTime: p ? new Date(p.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A',
        expiryDate: expiryDate
      };
    });

    res.json(users);
  } catch (error) {
    console.error('Error fetching test series users:', error);
    res.status(500).json({ error: 'Failed to fetch enrolled users' });
  }
};
