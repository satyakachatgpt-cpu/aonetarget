import { db, getDb } from '../config/db.js';
import mongoose from 'mongoose';
import Folder from '../models/Folder.js';
import { findCourse, getRelatedCourseIds, syncDemoVideoWithFreeContent } from '../services/course.service.js';

const { ObjectId } = mongoose.Types;

// --- Categories ---

export const getCategories = async (req, res) => {
  try {
    const categories = await db.collection('categories').find({}).sort({ order: 1 }).toArray();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { _id, ...categoryData } = req.body;
    const result = await db.collection('categories').insertOne(categoryData);
    res.status(201).json({ _id: result.insertedId, ...categoryData });
  } catch (error) {
    console.error('Category creation error:', error);
    res.status(500).json({ error: 'Failed to create category', details: error.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const id = req.params.id;
    const query = {
      $or: [
        { id: id },
        { _id: ObjectId.isValid(id) ? new ObjectId(id) : null }
      ].filter(v => v.id || v._id)
    };

    const { _id, ...updateData } = req.body;
    console.log(`Updating category ${id} with:`, updateData);

    const result = await db.collection('categories').updateOne(query, { $set: updateData });

    if (result.matchedCount === 0) {
      console.warn(`Category not found for update: ${id}`);
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ success: true, message: 'Category updated' });
  } catch (error) {
    console.error('Category update error:', error);
    res.status(500).json({ error: 'Failed to update category', details: error.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    let filter;
    try { 
      filter = { _id: new ObjectId(req.params.id) }; 
    } catch { 
      filter = { id: req.params.id }; 
    }
    const result = await db.collection('categories').deleteOne(filter);
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Category not found' });
    
    // Cleanup subcategories
    await db.collection('subcategories').deleteMany({ categoryId: req.params.id });
    
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
};

export const seedCategories = async (req, res) => {
  try {
    const count = await db.collection('categories').countDocuments();
    if (count > 0) return res.json({ message: 'Categories already seeded', count });

    const defaultCategories = [
      { id: 'neet', title: 'NEET', subtitle: 'Medical Entrance', icon: 'biotech', gradient: 'from-blue-600 to-indigo-700', description: 'Class 11th & 12th - Biology, Chemistry, Physics', tag: 'Most Popular', order: 1, isActive: true },
      { id: 'iit-jee', title: 'IIT-JEE', subtitle: 'Engineering Entrance', icon: 'engineering', gradient: 'from-orange-500 to-red-600', description: 'Physics, Chemistry, Mathematics', tag: 'Trending', order: 2, isActive: true },
      { id: 'nursing', title: 'Nursing CET', subtitle: 'Nursing & Paramedical', icon: 'local_hospital', gradient: 'from-teal-500 to-emerald-600', description: 'BSC, GNM, ANM-MPHW & More', tag: '', order: 3, isActive: true },
      { id: 'general', title: 'General Studies', subtitle: 'Class 9th & 10th', icon: 'menu_book', gradient: 'from-purple-500 to-violet-600', description: 'CBSE & HBSE Board', tag: '', order: 4, isActive: true }
    ];

    await db.collection('categories').insertMany(defaultCategories);

    const defaultSubcategories = [
      // NEET Subcategories
      { categoryId: 'neet', id: 'recorded_batch', title: 'Recorded Batch', icon: 'play_circle', color: 'from-[#303F9F] to-[#1A237E]', order: 1, isActive: true },
      { categoryId: 'neet', id: 'live_classroom', title: 'Live Classroom', icon: 'cast_for_education', color: 'from-[#D32F2F] to-[#B71C1C]', order: 2, isActive: true },
      { categoryId: 'neet', id: 'crash_course', title: 'Crash Course', icon: 'bolt', color: 'from-[#E65100] to-[#BF360C]', order: 3, isActive: true },
      { categoryId: 'neet', id: 'mock_test', title: 'Mock Test', icon: 'quiz', color: 'from-[#2E7D32] to-[#1B5E20]', order: 4, isActive: true },

      // IIT-JEE Subcategories
      { categoryId: 'iit-jee', id: 'recorded_batch', title: 'Recorded Batch', icon: 'play_circle', color: 'from-[#303F9F] to-[#1A237E]', order: 1, isActive: true },
      { categoryId: 'iit-jee', id: 'live_classroom', title: 'Live Classroom', icon: 'cast_for_education', color: 'from-[#D32F2F] to-[#B71C1C]', order: 2, isActive: true },
      { categoryId: 'iit-jee', id: 'crash_course', title: 'Crash Course', icon: 'bolt', color: 'from-[#E65100] to-[#BF360C]', order: 3, isActive: true },
      { categoryId: 'iit-jee', id: 'mock_test', title: 'Mock Test', icon: 'quiz', color: 'from-[#2E7D32] to-[#1B5E20]', order: 4, isActive: true },

      // 11th-12th Subcategories
      { categoryId: '11th-12th', id: 'recorded_batch', title: 'Recorded Batch', icon: 'play_circle', color: 'from-[#303F9F] to-[#1A237E]', order: 1, isActive: true },
      { categoryId: '11th-12th', id: 'live_classroom', title: 'Live Classroom', icon: 'cast_for_education', color: 'from-[#D32F2F] to-[#B71C1C]', order: 2, isActive: true },
      { categoryId: '11th-12th', id: 'crash_course', title: 'Crash Course', icon: 'bolt', color: 'from-[#E65100] to-[#BF360C]', order: 3, isActive: true },
      { categoryId: '11th-12th', id: 'mock_test', title: 'Mock Test', icon: 'quiz', color: 'from-[#2E7D32] to-[#1B5E20]', order: 4, isActive: true },

      // 9th-10th (foundation) Subcategories
      { categoryId: 'foundation', id: 'class-9th', title: 'Class 9th', icon: 'school', color: 'from-indigo-600 to-violet-700', order: 1, isActive: true },
      { categoryId: 'foundation', id: 'class-10th', title: 'Class 10th', icon: 'school', color: 'from-purple-600 to-fuchsia-700', order: 2, isActive: true },

      // Nursing CET Subcategories
      { categoryId: 'nursing-cet', id: 'bsc-cet-entrance', title: 'BSc CET Entrance', icon: 'local_hospital', color: 'from-teal-500 to-teal-600', order: 1, isActive: true },
      { categoryId: 'nursing-cet', id: 'nursing-officer', title: 'Nursing Officer', icon: 'medical_services', color: 'from-emerald-500 to-emerald-600', order: 2, isActive: true },
      { categoryId: 'nursing-cet', id: 'anm-mphw', title: 'ANM / MPHW', icon: 'emergency', color: 'from-teal-600 to-teal-700', order: 3, isActive: true },
      { categoryId: 'nursing-cet', id: 'gnm', title: 'GNM', icon: 'school', color: 'from-emerald-600 to-emerald-700', order: 4, isActive: true },
      { categoryId: 'nursing-cet', id: 'ebooks', title: 'E-Book', icon: 'menu_book', color: 'from-cyan-600 to-cyan-700', order: 5, isActive: true },
      { categoryId: 'nursing-cet', id: 'bsc-nursing', title: 'BSc Nursing', icon: 'diversity_1', color: 'from-teal-700 to-teal-800', order: 6, isActive: true },
      { categoryId: 'nursing-cet', id: 'mock-tests', title: 'Mock Test', icon: 'quiz', color: 'from-emerald-700 to-emerald-800', order: 7, isActive: true },
    ];

    await db.collection('subcategories').insertMany(defaultSubcategories);
    res.json({ message: 'Categories seeded successfully', categories: defaultCategories.length, subcategories: defaultSubcategories.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to seed categories' });
  }
};

export const reorderCategories = async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ error: 'orderedIds must be a non-empty array' });
    }

    const bulkOps = orderedIds.map((id, index) => {
      let filter;
      try {
        filter = { _id: new ObjectId(id) };
      } catch {
        filter = { id: id };
      }
      return {
        updateOne: {
          filter,
          update: { $set: { order: index + 1 } }
        }
      };
    });

    await db.collection('categories').bulkWrite(bulkOps);
    res.json({ success: true, message: 'Categories reordered successfully' });
  } catch (error) {
    console.error('Reorder categories error:', error);
    res.status(500).json({ error: 'Failed to reorder categories' });
  }
};

// --- Subcategories ---

export const getSubcategories = async (req, res) => {
  try {
    const { categoryId, level1Branch, level2Branch } = req.query;
    const query = {};
    if (categoryId) query.categoryId = categoryId;
    if (level1Branch) query.level1Branch = level1Branch;
    if (level2Branch) query.level2Branch = level2Branch;
    
    const subcategories = await db.collection('subcategories').find(query).sort({ order: 1 }).toArray();
    res.json(subcategories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subcategories' });
  }
};

export const createSubcategory = async (req, res) => {
  try {
    const result = await db.collection('subcategories').insertOne(req.body);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create subcategory' });
  }
};

export const updateSubcategory = async (req, res) => {
  try {
    let filter;
    try { 
      filter = { _id: new ObjectId(req.params.id) }; 
    } catch { 
      filter = { id: req.params.id }; 
    }
    const { _id, ...updateData } = req.body;
    const result = await db.collection('subcategories').updateOne(filter, { $set: updateData });
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Subcategory not found' });
    res.json({ success: true, message: 'Subcategory updated' });
  } catch (error) {
    console.error('Subcategory update error:', error);
    res.status(500).json({ error: 'Failed to update subcategory' });
  }
};

export const deleteSubcategory = async (req, res) => {
  try {
    let filter;
    try { 
      filter = { _id: new ObjectId(req.params.id) }; 
    } catch { 
      filter = { id: req.params.id }; 
    }
    const result = await db.collection('subcategories').deleteOne(filter);
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Subcategory not found' });
    res.json({ success: true, message: 'Subcategory deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete subcategory' });
  }
};

export const reorderSubcategories = async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ error: 'orderedIds must be a non-empty array' });
    }

    const bulkOps = orderedIds.map((id, index) => {
      let filter;
      try {
        filter = { _id: new ObjectId(id) };
      } catch {
        filter = { id: id };
      }
      return {
        updateOne: {
          filter,
          update: { $set: { order: index + 1 } }
        }
      };
    });

    await db.collection('subcategories').bulkWrite(bulkOps);
    res.json({ success: true, message: 'Subcategories reordered successfully' });
  } catch (error) {
    console.error('Reorder subcategories error:', error);
    res.status(500).json({ error: 'Failed to reorder subcategories' });
  }
};

// --- Subjects ---

export const getSubjects = async (req, res) => {
  try {
    const { categoryId, subcategoryId, level1Branch, level2Branch } = req.query;
    const query = {};
    if (categoryId) query.categoryId = categoryId;
    if (subcategoryId) query.subcategoryId = subcategoryId;
    if (level1Branch) query.level1Branch = level1Branch;
    if (level2Branch) query.level2Branch = level2Branch;

    const subjects = await db.collection('subjects').find(query).toArray();
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
};

export const createSubject = async (req, res) => {
  try {
    const result = await db.collection('subjects').insertOne(req.body);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create subject' });
  }
};

export const updateSubject = async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const result = await db.collection('subjects').updateOne({ id: req.params.id }, { $set: updateData });
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Subject not found' });
    res.json({ success: true, message: 'Subject updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update subject' });
  }
};

export const deleteSubject = async (req, res) => {
  try {
    const result = await db.collection('subjects').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Subject not found' });
    res.json({ success: true, message: 'Subject deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete subject' });
  }
};

// --- Topics ---

export const getTopics = async (req, res) => {
  try {
    const topics = await db.collection('topics').find({}).toArray();
    res.json(topics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch topics' });
  }
};

export const createTopic = async (req, res) => {
  try {
    const result = await db.collection('topics').insertOne(req.body);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create topic' });
  }
};

export const updateTopic = async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const result = await db.collection('topics').updateOne({ id: req.params.id }, { $set: updateData });
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Topic not found' });
    res.json({ success: true, message: 'Topic updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update topic' });
  }
};

export const deleteTopic = async (req, res) => {
  try {
    const result = await db.collection('topics').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Topic not found' });
    res.json({ success: true, message: 'Topic deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete topic' });
  }
};

// --- Folders ---

export const getFoldersByCourse = async (req, res) => {
  try {
    const course = await findCourse(req.params.courseId);
    if (!course) return res.json([]);

    const idVariants = await getRelatedCourseIds(course, req.params.courseId);
    const query = {
      courseId: { $in: idVariants }
    };
    const folders = await Folder.find(query).sort({ order: 1, sortingOrder: 1 }).lean();
    res.json(folders || []);
  } catch (error) {
    console.error('Fetch folders error:', error);
    res.status(500).json({ error: 'Failed to fetch' });
  }
};

export const createFolder = async (req, res) => {
  try {
    const folderData = {
      ...req.body,
      courseId: req.params.courseId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const folder = new Folder(folderData);
    await folder.save();
    res.status(201).json(folder);
  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const updateFolder = async (req, res) => {
  try {
    const course = await findCourse(req.params.courseId);
    const folderId = req.params.folderId;

    const query = {
      $or: [
        { id: folderId },
        { _id: ObjectId.isValid(folderId) ? new ObjectId(folderId) : null }
      ].filter(v => v.id || v._id)
    };

    if (course) {
      query.courseId = { $in: [course.id, course._id.toString(), req.params.courseId] };
    }

    const { _id, ...updateData } = req.body;
    const result = await Folder.updateOne(
      query,
      { $set: { ...updateData, updatedAt: new Date() } }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Folder not found' });
    res.json({ success: true, message: 'Folder updated' });
  } catch (error) {
    console.error('Update folder error:', error);
    res.status(500).json({ error: 'Failed to update folder' });
  }
};

export const deleteFolder = async (req, res) => {
  console.log(`DELETE /api/courses/${req.params.courseId}/folders/${req.params.folderId}`);
  try {
    const course = await findCourse(req.params.courseId);
    const folderId = req.params.folderId;
    const courseId = course ? (course.id || course._id.toString()) : req.params.courseId;

    // Local helper to normalize an ID to a plain string
    const toStr = (id) => (id ? id.toString() : null);

    // Recursive function to find all nested folder IDs (as strings) with cycle protection
    const getAllNestedFolderIds = async (id, visited = new Set()) => {
      const idStr = id ? id.toString() : null;
      if (!idStr || visited.has(idStr)) return [];
      visited.add(idStr);

      let ids = [idStr];
      const subFolders = await Folder.find({
        $or: [
          { parentId: id },
          { parentId: idStr },
          ...(ObjectId.isValid(id) ? [{ parentId: new ObjectId(id) }] : [])
        ],
        courseId: courseId
      }).lean();

      for (const sub of subFolders) {
        const subId = sub.id || sub._id?.toString();
        if (subId && !visited.has(subId)) {
          const nestedIds = await getAllNestedFolderIds(subId, visited);
          ids = [...ids, ...nestedIds];
        }
      }
      return ids;
    };

    const allFolderStringIds = Array.from(new Set(await getAllNestedFolderIds(folderId)));
    const allFolderObjectIds = allFolderStringIds
      .filter(id => ObjectId.isValid(id))
      .map(id => new ObjectId(id));

    // Filter for all folders to delete (match by custom string id OR ObjectId _id)
    const folderFilter = {
      courseId: courseId,
      $or: [
        { id: { $in: allFolderStringIds } },
        { _id: { $in: allFolderObjectIds } }
      ]
    };

    // Filter for all content within those folders
    const contentFilter = {
      courseId: courseId,
      $or: [
        { folderId: { $in: allFolderStringIds } },
        { folderId: { $in: allFolderObjectIds } }
      ]
    };

    // Delete content within these folders and the folders themselves
    await Promise.all([
      db.collection('videos').deleteMany(contentFilter),
      db.collection('notes').deleteMany(contentFilter),
      db.collection('pdfs').deleteMany(contentFilter),
      db.collection('tests').deleteMany(contentFilter),
      Folder.deleteMany(folderFilter)
    ]);

    res.json({ success: true, message: 'Folder and its content deleted' });
  } catch (error) {
    console.error('Delete folder error:', error);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
};

// --- Packages / Batches ---

export const getPackages = async (req, res) => {
  try {
    const packages = await db.collection('packages').aggregate([
      {
        $addFields: {
          sortOrder: {
            $cond: {
              if: { $or: [{ $eq: ['$settings.sortingOrder', 0] }, { $not: ['$settings.sortingOrder'] }] },
              then: 1000,
              else: '$settings.sortingOrder'
            }
          }
        }
      },
      { $project: { content: 0, features: 0 } },
      { $sort: { sortOrder: 1, createdAt: -1 } }
    ]).toArray();
    res.json(packages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
};

export const createPackage = async (req, res) => {
  try {
    const result = await db.collection('packages').insertOne(req.body);
    const newPackage = { _id: result.insertedId, ...req.body };
    if (newPackage.demoVideo) {
      await syncDemoVideoWithFreeContent(newPackage, result.insertedId.toString());
    }
    res.status(201).json(newPackage);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create package' });
  }
};

export const updatePackage = async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const id = req.params.id;
    let record = await db.collection('packages').findOne({ $or: [{ id: id }, { _id: id }] });
    if (!record && mongoose.Types.ObjectId.isValid(id)) {
      record = await db.collection('packages').findOne({ _id: new mongoose.Types.ObjectId(id) });
    }
    let targetCollection = 'packages';
    if (!record) {
      record = await db.collection('courses').findOne({ $or: [{ id: id }, { _id: id }] });
      if (!record && mongoose.Types.ObjectId.isValid(id)) {
        record = await db.collection('courses').findOne({ _id: new mongoose.Types.ObjectId(id) });
      }
      if (record) targetCollection = 'courses';
    }
    if (!record) return res.status(404).json({ error: 'Package/Course not found in DB' });

    const finalUpdate = { ...updateData, updatedAt: new Date().toISOString() };
    if (updateData.settings && record.settings) {
      finalUpdate.settings = { ...record.settings, ...updateData.settings };
    }
    if (updateData.content && record.content) {
      finalUpdate.content = { ...record.content, ...updateData.content };
    }
    await db.collection(targetCollection).updateOne({ _id: record._id }, { $set: finalUpdate });
    if (finalUpdate.demoVideo !== undefined) {
      const fullRecord = { ...record, ...finalUpdate };
      await syncDemoVideoWithFreeContent(fullRecord, record._id.toString());
    }
    res.json({ success: true, message: 'Updated successfully', collection: targetCollection });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update package', details: error.message });
  }
};

export const deletePackage = async (req, res) => {
  try {
    let filter = {
      $or: [
        { id: req.params.id },
        { _id: ObjectId.isValid(req.params.id) ? new ObjectId(req.params.id) : null }
      ].filter(f => f.id || f._id)
    };
    let result = await db.collection('packages').deleteOne(filter);
    if (result.deletedCount === 0) result = await db.collection('courses').deleteOne(filter);
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Package not found' });
    res.json({ success: true, message: 'Package/Course deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete package' });
  }
};

export const reorderPackages = async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: 'orderedIds must be an array' });
    }

    // Phase 2 Cleanup: Remove null/empty IDs
    const cleanIds = orderedIds.filter(id => id && typeof id === 'string');
    if (cleanIds.length === 0) {
      return res.status(400).json({ error: 'No valid IDs provided for reordering' });
    }

    const database = getDb();
    const bulkPackages = [];
    const bulkCourses = [];

    for (let i = 0; i < cleanIds.length; i++) {
      const id = cleanIds[i];
      const sortingOrder = i + 1;
      
      const or = [{ id: id }];
      if (ObjectId.isValid(id)) {
        or.push({ _id: new ObjectId(id) });
      }
      
      const filter = { $or: or };
      const update = { $set: { 'settings.sortingOrder': sortingOrder } };

      bulkPackages.push({ updateOne: { filter, update } });
      bulkCourses.push({ updateOne: { filter, update } });
    }

    if (bulkPackages.length > 0) await database.collection('packages').bulkWrite(bulkPackages);
    if (bulkCourses.length > 0) await database.collection('courses').bulkWrite(bulkCourses);

    res.json({ success: true, message: 'Order updated successfully' });
  } catch (error) {
    console.error('Reorder error:', error);
    res.status(500).json({ error: 'Failed to reorder' });
  }
};


// --- Subcourses ---

export const getSubcourses = async (req, res) => {
  try {
    const subcourses = await db.collection('subcourses').find({}).toArray();
    res.json(subcourses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subcourses' });
  }
};

export const createSubcourse = async (req, res) => {
  try {
    const result = await db.collection('subcourses').insertOne(req.body);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create subcourse' });
  }
};

export const updateSubcourse = async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const result = await db.collection('subcourses').updateOne({ id: req.params.id }, { $set: updateData });
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Subcourse not found' });
    res.json({ success: true, message: 'Subcourse updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update subcourse' });
  }
};

export const deleteSubcourse = async (req, res) => {
  try {
    const result = await db.collection('subcourses').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Subcourse not found' });
    res.json({ success: true, message: 'Subcourse deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete subcourse' });
  }
};

// --- Instructors ---

export const getInstructors = async (req, res) => {
  try {
    const instructors = await db.collection('instructors').find({}).toArray();
    res.json(instructors);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch instructors' });
  }
};

export const bulkCreateCourses = async (req, res) => {
  try {
    const courses = req.body;
    if (!Array.isArray(courses)) return res.status(400).json({ error: 'Data must be an array' });
    const result = await db.collection('courses').insertMany(courses);
    res.status(201).json({ success: true, count: result.insertedCount });
  } catch (error) {
    res.status(500).json({ error: 'Bulk insert failed' });
  }
};
