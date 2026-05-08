import { db } from '../config/db.js';
import mongoose from 'mongoose';
import { findCourse, getCourseIdVariants } from '../services/course.service.js';
const { ObjectId } = mongoose.Types;

/**
 * Test Series Management Controller
 */

// GET /api/test-series
export const getAllTestSeries = async (req, res) => {
  try {
    const { studentId } = req.query;
    const seriesFromCollection = await db.collection('testSeries').find({}).toArray();
    const seriesFromTests = await db.collection('tests').find({ isSeries: true }).toArray();

    // 1. Fetch student enrollment if studentId is provided
    let enrolledCourseIds = [];
    let studentPurchases = [];
    if (studentId) {
      const student = await db.collection('students').findOne({
        $or: [
          { id: studentId },
          { userId: studentId },
          { _id: mongoose.Types.ObjectId.isValid(studentId) ? new mongoose.Types.ObjectId(studentId) : null }
        ]
      });
      if (student) {
        enrolledCourseIds = (student.enrolledCourses || []).map(id => String(id));
        
        // Fetch all successful purchases for this student for expiry calculation
        const studentIdVariants = [String(student._id), student.id, student.userId].filter(Boolean);
        studentPurchases = await db.collection('purchases').find({
          studentId: { $in: studentIdVariants },
          status: { $in: ['completed', 'success', 'captured', 'paid'] }
        }).toArray();
      }
    }

    const mergedMap = new Map();
    for (const s of seriesFromCollection) {
      const key = s.id || s._id.toString();
      mergedMap.set(key, { 
        ...s, 
        id: s.id || s._id.toString(),
        sortBy: parseFloat(String(s.sortBy || "0")) || 0 
      });
    }

    for (const s of seriesFromTests) {
      const key = s.id || s._id.toString();
      const testSortBy = parseFloat(String(s.sortBy || "0")) || 0;
      
      if (!mergedMap.has(key)) {
        mergedMap.set(key, {
          ...s,
          id: s.id || s._id.toString(),
          seriesName: s.seriesName || s.name || s.title,
          totalTests: s.totalTests || s.questions || 0,
          status: s.status || 'active',
          sortBy: testSortBy
        });
      } else {
        // Source-of-truth sync: If the item exists in both, prefer the sortBy from the tests collection 
        // because that is where the Admin reorder happens.
        const existing = mergedMap.get(key);
        if (testSortBy > 0) {
          existing.sortBy = testSortBy;
        }
      }
    }

    // Final normalization and sort
    const combined = Array.from(mergedMap.values());
    
    combined.sort((a, b) => {
      const sortA = parseFloat(String(a.sortBy || "0")) || 0;
      const sortB = parseFloat(String(b.sortBy || "0")) || 0;
      if (sortB !== sortA) return sortB - sortA;
      
      const dateA = new Date(a.createdAt || a.openDate || a.date || 0).getTime();
      const dateB = new Date(b.createdAt || b.openDate || b.date || 0).getTime();
      if (dateB !== dateA) return dateB - dateA;
      
      return String(b._id || b.id).localeCompare(String(a._id || a.id));
    });

    // 2. Pre-fetch parent links for enrollment calculation if needed
    let parentMap = new Map(); // seriesId -> Set of Batch/Package IDs
    if (studentId) {
       const [allCourses, allPackages] = await Promise.all([
           db.collection('courses').find({ "content.testSeries": { $exists: true } }).project({ id: 1, _id: 1, "content.testSeries": 1 }).toArray(),
           db.collection('packages').find({ "content.testSeries": { $exists: true } }).project({ id: 1, _id: 1, "content.testSeries": 1 }).toArray()
       ]);
       [...allCourses, ...allPackages].forEach(c => {
           const cId = String(c.id || c._id);
           (c.content?.testSeries || []).forEach(tsId => {
               if (!parentMap.has(String(tsId))) parentMap.set(String(tsId), new Set());
               parentMap.get(String(tsId)).add(cId);
           });
       });
    }

    // 3. Optimized Count Calculation: O(N+M) instead of O(N*M)
    try {
      // Fetch only necessary fields for mapping
      const allTestsLightweight = await db.collection('tests').find(
          { isSeries: { $ne: true }, status: { $ne: 'inactive' } },
          { projection: { id: 1, _id: 1, seriesId: 1, courseId: 1, courseIds: 1, testSeries: 1 } }
      ).toArray();
      
      // Indexing Maps
      const seriesToTestsMap = new Map(); // Map<SeriesId, Set<TestId>>
      const testIdToDocMap = new Map();   // Map<TestId, Boolean> (Exists check)

      for (const t of allTestsLightweight) {
        const tId = String(t.id || t._id);
        testIdToDocMap.set(tId, true);
        
        // Find all series this test belongs to
        const parentSeriesIds = new Set();
        if (t.seriesId) parentSeriesIds.add(String(t.seriesId));
        if (t.courseId) parentSeriesIds.add(String(t.courseId));
        if (Array.isArray(t.courseIds)) t.courseIds.forEach(id => parentSeriesIds.add(String(id)));
        if (Array.isArray(t.testSeries)) t.testSeries.forEach(id => parentSeriesIds.add(String(id)));
        
        for (const sId of parentSeriesIds) {
          if (!seriesToTestsMap.has(sId)) seriesToTestsMap.set(sId, new Set());
          seriesToTestsMap.get(sId).add(tId);
        }
      }

      for (const series of combined) {
        const seriesIdStr = String(series.id || series._id);
        const testSet = seriesToTestsMap.get(seriesIdStr) || new Set();
        
        // Add tests explicitly listed in the series document (Source: series.testIds / series.tests)
        const seriesTestIdsArray = Array.isArray(series.testIds) ? series.testIds.map(String) : [];
        const seriesTestsObjectsIds = Array.isArray(series.tests) ? series.tests.map(st => String(st.id || st._id)) : [];
        
        for (const tId of [...seriesTestIdsArray, ...seriesTestsObjectsIds]) {
          // Only add if the test actually exists and is active (checked via our map)
          if (testIdToDocMap.has(tId)) {
            testSet.add(tId);
          }
        }
        
        series.totalTests = testSet.size;

        // Determine enrollment
        if (studentId) {
            const isDirect = enrolledCourseIds.includes(seriesIdStr);
            
            // Check if series links to a batch the student has
            const linkedBatchIds = (series.courseIds || []).concat(series.courseId ? [series.courseId] : []);
            // Check if a batch links to this series
            const batchIdsThatIncludeThis = parentMap.get(seriesIdStr) || new Set();
            const allPossibleParents = [...new Set([...linkedBatchIds, ...Array.from(batchIdsThatIncludeThis)])].map(String);
            
            const isIncluded = allPossibleParents.some(pid => enrolledCourseIds.includes(String(pid)));
            
            series.isEnrolled = isDirect || isIncluded;
            series.isDirect = isDirect;
            series.isIncluded = isIncluded && !isDirect;

            // Calculate Expiry
            if (series.isEnrolled) {
              // Find purchase for this specific series or its parent batch/package
              const relevantIds = [seriesIdStr, ...allPossibleParents];
              const purchase = studentPurchases.find(p => relevantIds.includes(String(p.courseId)));
              const getSeriesExpired = (series) => {
                const mode = series.expiryMode;
                const val = series.validity;

                if (!mode || mode === 'Lifetime Access' || mode === 'lifetime') {
                  return false;
                }

                if (mode === 'End Date' && val) {
                  let dateStr = val;
                  const parts = val.split('-');
                  if (parts.length === 3 && parts[2].length === 4) {
                    dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
                  }
                  const expiryDate = new Date(dateStr);
                  expiryDate.setHours(23, 59, 59, 999);
                  return new Date() > expiryDate;
                }

                if (mode === 'Validity' && val) {
                  if (!purchase) return false;
                  const months = parseInt(val);
                  const createdAt = new Date(purchase.createdAt);
                  createdAt.setMonth(createdAt.getMonth() + months);
                  return new Date() > createdAt;
                }

                return false;
              };

              series.isExpired = getSeriesExpired(series);
            } else {
              series.isExpired = false;
            }
        } else {
            series.isEnrolled = false;
            series.isDirect = false;
            series.isIncluded = false;
            series.isExpired = false;
        }
      }
    } catch (countError) {
      console.error('Error calculating stats for series:', countError);
    }

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
    const seriesId = req.params.id;
    console.log('PUT /api/test-series/:id - Updating series:', seriesId, req.body);
    const { _id, ...updateData } = req.body;

    // 1. Try updating in 'testSeries' collection
    let result = await db.collection('testSeries').updateOne(
      { id: seriesId },
      { $set: updateData }
    );

    // 2. If not found, try updating in 'tests' collection (for series stored there)
    if (result.matchedCount === 0) {
      console.log('Series not found in testSeries, trying tests collection...');
      result = await db.collection('tests').updateOne(
        { id: seriesId, isSeries: true },
        { $set: updateData }
      );
    }

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Test series not found' });
    }

    console.log('Series updated successfully');
    res.json({ message: 'Series updated successfully' });
  } catch (error) {
    console.error('Error updating test series:', error);
    res.status(500).json({ error: 'Failed to update test series' });
  }
};

// DELETE /api/test-series/:id
export const deleteTestSeries = async (req, res) => {
  try {
    const seriesId = req.params.id;
    console.log('DELETE /api/test-series/:id - Deleting series:', seriesId);

    // Try deleting from both collections
    const result1 = await db.collection('testSeries').deleteOne({ id: seriesId });
    const result2 = await db.collection('tests').deleteOne({ id: seriesId, isSeries: true });

    if (result1.deletedCount === 0 && result2.deletedCount === 0) {
      return res.status(404).json({ error: 'Test series not found' });
    }

    res.json({ message: 'Series deleted successfully' });
  } catch (error) {
    console.error('Error deleting test series:', error);
    res.status(500).json({ error: 'Failed to delete test series' });
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

    // 4. Fetch the test series document to get validity settings using the robust findCourse service
    let series = await findCourse(testSeriesId);
    
    // Extra Fallback: If not found, try to find it using the courseId from the purchases
    if (!series && purchases.length > 0) {
      for (const p of purchases) {
        series = await findCourse(p.courseId);
        if (series) break;
      }
    }

    const users = students.map(student => {
      const sId = String(student.id || student._id);
      const p = purchaseMap[sId] || purchaseMap[student.id];
      
      let expiryDate = 'Lifetime'; // Default if no series info at all
      
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
        
        // Robust Fallback: If mode is missing but validity is a number, treat as 'Validity'
        if (!mode && val && !isNaN(parseInt(val))) {
          mode = 'Validity';
        }

        // Final Calculation Logic
        if (mode === 'End Date' && val) {
          expiryDate = `Valid until ${val}`;
        } else if (mode === 'Validity' && val) {
          if (p) {
            const months = parseInt(val);
            const date = new Date(p.createdAt);
            date.setMonth(date.getMonth() + months);
            const dateStr = date.toLocaleDateString('en-IN');
            expiryDate = `Valid for ${months} Months (${dateStr})`;
          } else {
            expiryDate = `Valid for ${val} Months`;
          }
        } else if (mode === 'Lifetime Access') {
          expiryDate = 'Lifetime';
        } else if (val && !isNaN(parseInt(val))) {
           // One last fallback for raw validity numbers
           expiryDate = `Valid for ${val} Months`;
        }
      } else {
        expiryDate = 'Lifetime (Series Data Not Found)';
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
