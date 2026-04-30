import mongoose from 'mongoose';
import { db } from '../config/db.js';
import { findCourse, getRelatedCourseIds } from '../services/course.service.js';
import { normalizeId } from '../utils/helpers.js';
import { generateSignedUrl } from '../middleware/auth.js';
import { syncLiveStream } from '../services/liveStream.service.js';

const { ObjectId } = mongoose.Types;

// Banner Controllers
export const getBanners = async (req, res) => {
  try {
    const banners = await db.collection('banners').find({}).toArray();
    res.json(banners);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch banners' });
  }
};

export const createBanner = async (req, res) => {
  try {
    const result = await db.collection('banners').insertOne(req.body);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create banner' });
  }
};

export const updateBanner = async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const result = await db.collection('banners').updateOne(
      { id: req.params.id },
      { $set: updateData }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Banner not found' });
    res.json({ success: true, message: 'Banner updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update banner' });
  }
};

export const deleteBanner = async (req, res) => {
  try {
    const result = await db.collection('banners').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Banner not found' });
    res.json({ success: true, message: 'Banner deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete banner' });
  }
};

// News Controllers
export const getNews = async (req, res) => {
  try {
    const news = await db.collection('news').find({}).sort({ createdAt: -1 }).toArray();
    res.json(news);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch news' });
  }
};

export const createNews = async (req, res) => {
  try {
    const result = await db.collection('news').insertOne({ ...req.body, createdAt: new Date() });
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create news' });
  }
};

export const updateNews = async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const result = await db.collection('news').updateOne({ id: req.params.id }, { $set: updateData });
    if (result.matchedCount === 0) return res.status(404).json({ error: 'News not found' });
    res.json({ success: true, message: 'News updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update news' });
  }
};

export const deleteNews = async (req, res) => {
  try {
    const result = await db.collection('news').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'News not found' });
    res.json({ success: true, message: 'News deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete news' });
  }
};

// Quick Links Controllers
export const getQuickLinks = async (req, res) => {
  try {
    const links = await db.collection('quickLinks').find({}).sort({ sortBy: -1 }).toArray();
    res.json(links);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch quick links' });
  }
};

export const createQuickLink = async (req, res) => {
  try {
    const result = await db.collection('quickLinks').insertOne(req.body);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create quick link' });
  }
};

export const updateQuickLink = async (req, res) => {
  try {
    const id = req.params.id;
    const { _id, ...updateData } = req.body;

    let filter = { id: id };
    if (ObjectId.isValid(id)) filter = { $or: [{ id: id }, { _id: new ObjectId(id) }] };

    const result = await db.collection('quickLinks').updateOne(filter, { $set: updateData });
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Quick link not found' });
    res.json({ success: true, message: 'Quick link updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update quick link' });
  }
};

export const deleteQuickLink = async (req, res) => {
  try {
    const id = req.params.id;
    let filter = { id: id };
    if (ObjectId.isValid(id)) filter = { $or: [{ id: id }, { _id: new ObjectId(id) }] };

    const result = await db.collection('quickLinks').deleteOne(filter);
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Quick link not found' });
    res.json({ success: true, message: 'Quick link deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete quick link' });
  }
};

// Instructions Controllers
export const getInstructions = async (req, res) => {
  try {
    const instructions = await db.collection('instructions').find({}).toArray();
    res.json(instructions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch instructions' });
  }
};

export const createInstruction = async (req, res) => {
  try {
    const result = await db.collection('instructions').insertOne(req.body);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create instruction' });
  }
};

export const updateInstruction = async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const result = await db.collection('instructions').updateOne({ id: req.params.id }, { $set: updateData });
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Instruction not found' });
    res.json({ success: true, message: 'Instruction updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update instruction' });
  }
};

export const deleteInstruction = async (req, res) => {
  try {
    const result = await db.collection('instructions').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Instruction not found' });
    res.json({ success: true, message: 'Instruction deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete instruction' });
  }
};

// Blog Controllers
export const getBlogPosts = async (req, res) => {
  try {
    const posts = await db.collection('blog').find({}).sort({ createdAt: -1 }).toArray();
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch blog posts' });
  }
};

export const createBlogPost = async (req, res) => {
  try {
    const result = await db.collection('blog').insertOne({
      ...req.body,
      createdAt: new Date(),
      status: req.body.status || 'draft'
    });
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create blog post' });
  }
};

export const updateBlogPost = async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const result = await db.collection('blog').updateOne(
      { id: req.params.id },
      { $set: updateData }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Blog post not found' });
    res.json({ success: true, message: 'Blog post updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update blog post' });
  }
};

export const deleteBlogPost = async (req, res) => {
  try {
    const result = await db.collection('blog').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Blog post not found' });
    res.json({ success: true, message: 'Blog post deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete blog post' });
  }
};

// Exam Document Controllers
export const getExamDocuments = async (req, res) => {
  try {
    const docs = await db.collection('examDocuments').find({}).toArray();
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch exam documents' });
  }
};

export const createExamDocument = async (req, res) => {
  try {
    const result = await db.collection('examDocuments').insertOne(req.body);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create exam document' });
  }
};

export const updateExamDocument = async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const result = await db.collection('examDocuments').updateOne({ id: req.params.id }, { $set: updateData });
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Exam document not found' });
    res.json({ success: true, message: 'Exam document updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update exam document' });
  }
};

export const deleteExamDocument = async (req, res) => {
  try {
    const result = await db.collection('examDocuments').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Exam document not found' });
    res.json({ success: true, message: 'Exam document deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete exam document' });
  }
};

// --- Course Content Import (Copy/Move) ---

export const importCourseContent = async (req, res) => {
  try {
    const { sourceCourseId, targetCourseId, targetFolderId, itemIds, action } = req.body;
    if (!sourceCourseId || !targetCourseId || !itemIds || !Array.isArray(itemIds)) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const contentCollections = ['videos', 'notes', 'pdfs', 'tests'];
    let processedCount = 0;

    const buildIdQuery = (itemId) => {
      const queryList = [{ id: String(itemId) }];
      if (ObjectId.isValid(itemId)) {
        try { queryList.push({ _id: new ObjectId(itemId) }); } catch (e) { }
      }
      return queryList;
    };

    const processFolderRecursively = async (sourceFolder, targetCourseId, action, targetParentId = null) => {
      let targetFolderId;
      if (action === 'copy') {
        const newFolder = { ...sourceFolder };
        delete newFolder._id;
        newFolder.id = `folder_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        newFolder.courseId = String(targetCourseId);
        newFolder.parentId = targetParentId;
        newFolder.createdAt = new Date().toISOString();
        await db.collection('folders').insertOne(newFolder);
        targetFolderId = newFolder.id;
      } else {
        await db.collection('folders').updateOne(
          { _id: sourceFolder._id },
          { $set: { courseId: String(targetCourseId), parentId: targetParentId } }
        );
        targetFolderId = sourceFolder._id.toString();
      }

      const folderIdStr = sourceFolder.id || (sourceFolder._id ? sourceFolder._id.toString() : null);
      const folderOidStr = sourceFolder._id ? sourceFolder._id.toString() : null;
      const folderMatchIds = [...new Set([folderIdStr, folderOidStr].filter(Boolean))];
      const folderMatchOids = folderMatchIds.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id));
      const childrenFilter = { folderId: { $in: [...folderMatchIds, ...folderMatchOids] } };

      for (const collName of contentCollections) {
        const items = await db.collection(collName).find(childrenFilter).toArray();
        for (const item of items) {
          if (action === 'copy') {
            const newItem = { ...item };
            delete newItem._id;
            
            // CANONICAL TARGET: Both 'notes' and 'pdfs' copies go to 'pdfs' collection
            const targetColl = (collName === 'notes') ? 'pdfs' : collName;
            
            newItem.id = `${targetColl}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            newItem.courseId = String(targetCourseId);
            newItem.folderId = targetFolderId;
            newItem.createdAt = new Date().toISOString();
            await db.collection(targetColl).insertOne(newItem);
          } else {
            await db.collection(collName).updateOne(
              { _id: item._id },
              { $set: { courseId: String(targetCourseId) } }
            );
          }
        }
      }

      const subFolders = await db.collection('folders').find({
        parentId: { $in: [...folderMatchIds, ...folderMatchOids] }
      }).toArray();

      for (const sub of subFolders) {
        await processFolderRecursively(sub, targetCourseId, action, targetFolderId);
      }
    };

    for (const itemId of itemIds) {
      const sourceFolder = await db.collection('folders').findOne({ $or: buildIdQuery(itemId) });
      if (sourceFolder) {
        await processFolderRecursively(sourceFolder, targetCourseId, action, targetFolderId || null);
        processedCount++;
      } else {
        for (const collName of contentCollections) {
          const item = await db.collection(collName).findOne({ $or: buildIdQuery(itemId) });
          if (item) {
            if (action === 'copy') {
              const newItem = { ...item };
              delete newItem._id;
              
              // CANONICAL TARGET: Both 'notes' and 'pdfs' copies go to 'pdfs' collection
              const targetColl = (collName === 'notes') ? 'pdfs' : collName;
              
              newItem.id = `${targetColl}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
              newItem.courseId = String(targetCourseId);
              newItem.folderId = targetFolderId || null;
              newItem.createdAt = new Date().toISOString();
              await db.collection(targetColl).insertOne(newItem);
            } else {
              await db.collection(collName).updateOne(
                { _id: item._id },
                { $set: { courseId: String(targetCourseId), folderId: targetFolderId || null } }
              );
            }
            processedCount++;
            break;
          }
        }
      }
    }
    res.status(200).json({ success: true, processed: processedCount });
  } catch (error) {
    console.error('importCourseContent logic error:', error);
    res.status(500).json({ error: error.message || 'Failed to process import action' });
  }
};

// --- Course Notes/PDFs ---

export const getCourseNotes = async (req, res) => {
  try {
    const course = await findCourse(req.params.id);
    if (!course) return res.json([]);

    const idVariants = await getRelatedCourseIds(course, req.params.id);
    const primaryId = req.params.id;
    const query = {
      courseId: { $in: idVariants },
      status: { $nin: ['inactive', 'deleted'] }
    };

    // Check both pdfs and notes collections for backward compatibility
    // Sort by sortBy first (new), then order (legacy), then creation date
    const pdfs = await db.collection('pdfs').find(query).sort({ sortBy: 1, order: 1, createdAt: -1 }).toArray();
    const notes = await db.collection('notes').find(query).sort({ sortBy: 1, order: 1, createdAt: -1 }).toArray();
    
    // Merge all raw notes
    const allRawNotes = [...pdfs, ...notes];

    // Aggressive Deduplication Strategy
    const uniqueNotes = [];
    const seenTitles = new Set();
    const seenUrls = new Set();
    const seenIds = new Set();

    const normalizeUrl = (url) => {
      if (!url) return '';
      return url.trim().toLowerCase().replace(/\/$/, '');
    };

    // First pass: Add notes from the current specific batch
    allRawNotes.forEach(n => {
      if (normalizeId(n.courseId) === normalizeId(primaryId)) {
        const title = (n.title || '').trim().toLowerCase();
        const url = normalizeUrl(n.fileUrl || n.url);
        const id = n.id || n._id?.toString();

        if (title) seenTitles.add(title);
        if (url) seenUrls.add(url);
        if (id) seenIds.add(id);

        uniqueNotes.push(n);
      }
    });

    // Second pass: Add notes from other related batches ONLY if they are unique
    allRawNotes.forEach(n => {
      if (normalizeId(n.courseId) !== normalizeId(primaryId)) {
        const title = (n.title || '').trim().toLowerCase();
        const url = normalizeUrl(n.fileUrl || n.url);
        const id = n.id || n._id?.toString();

        const isDuplicate =
          (id && seenIds.has(id)) ||
          (title && seenTitles.has(title)) ||
          (url && seenUrls.has(url));

        if (!isDuplicate) {
          if (title) seenTitles.add(title);
          if (url) seenUrls.add(url);
          if (id) seenIds.add(id);
          uniqueNotes.push(n);
        }
      }
    });

    // --- ENROLLMENT CHECK ---
    const studentId = req.user?.studentId;
    const adminId = req.user?.adminId;
    let hasFullAccess = !!adminId;

    if (!hasFullAccess && studentId) {
      const student = await db.collection('students').findOne({
        $or: [
          { id: studentId },
          { _id: ObjectId.isValid(studentId) ? new ObjectId(studentId) : null }
        ].filter(f => f.id || f._id)
      });
      if (student) {
        const enrolledCourses = student.enrolledCourses || [];
        hasFullAccess = idVariants.some(id => enrolledCourses.includes(id)) ||
          (course.price === 0 || course.isFree === true);
      }
    } else if (!hasFullAccess) {
      // Guest or unauthenticated
      hasFullAccess = (course.price === 0 || course.isFree === true);
    }

    // Map notes to hide URLs if not authorized
    const processedNotes = uniqueNotes.map(n => {
      if (hasFullAccess || n.isFree) {
        return n;
      }
      // Return same object structure but nullify sensitive fields
      return {
        ...n,
        url: null,
        fileUrl: null
      };
    });

    res.json(processedNotes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
};

export const createCourseNote = async (req, res) => {
  try {
    const course = await findCourse(req.params.id);
    const courseId = course ? (course.id || course._id.toString()) : req.params.id;

    const note = {
      ...req.body,
      courseId,
      createdAt: new Date().toISOString()
    };
    
    // Ensure URL consistency for backward compatibility
    if (note.url && !note.fileUrl) note.fileUrl = note.url;
    if (note.fileUrl && !note.url) note.url = note.fileUrl;

    const result = await db.collection('pdfs').insertOne(note);
    res.status(201).json({ _id: result.insertedId, ...note });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add note' });
  }
};

export const updateCourseNote = async (req, res) => {
  try {
    const course = await findCourse(req.params.id);
    const noteId = req.params.noteId;

    const query = {
      $or: [
        { id: noteId },
        { _id: ObjectId.isValid(noteId) ? new ObjectId(noteId) : null }
      ].filter(v => v.id || v._id)
    };

    if (course) {
      query.courseId = { $in: [course.id, course._id.toString(), req.params.id] };
    }

    const { _id, ...updateData } = req.body;
    
    // Ensure URL consistency
    if (updateData.url && !updateData.fileUrl) updateData.fileUrl = updateData.url;
    if (updateData.fileUrl && !updateData.url) updateData.url = updateData.fileUrl;

    // Try pdfs collection first, then notes
    let result = await db.collection('pdfs').updateOne(
      query,
      { $set: { ...updateData, updatedAt: new Date().toISOString() } }
    );
    if (result.matchedCount === 0) {
      result = await db.collection('notes').updateOne(
        query,
        { $set: { ...updateData, updatedAt: new Date().toISOString() } }
      );
    }
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Note not found' });
    res.json({ success: true, message: 'Note updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update note' });
  }
};

export const deleteCourseNote = async (req, res) => {
  try {
    const course = await findCourse(req.params.id);
    const noteId = req.params.noteId;

    const query = {
      $or: [
        { id: noteId },
        { _id: ObjectId.isValid(noteId) ? new ObjectId(noteId) : null }
      ].filter(v => v.id || v._id)
    };

    if (course) {
      query.courseId = { $in: [course.id, course._id.toString(), req.params.id] };
    }

    // Try pdfs collection first, then notes
    let result = await db.collection('pdfs').deleteOne(query);
    if (result.deletedCount === 0) {
      result = await db.collection('notes').deleteOne(query);
    }
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Note not found' });
    res.json({ success: true, message: 'Note deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete note' });
  }
};

export const deleteAllPdfs = async (req, res) => {
  try {
    const result = await db.collection('pdfs').deleteMany({});
    res.json({ success: true, message: `Deleted ${result.deletedCount} PDFs` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete all PDFs' });
  }
};

export const bulkCreatePdfs = async (req, res) => {
  try {
    const { pdfs } = req.body;
    if (!Array.isArray(pdfs) || pdfs.length === 0) return res.status(400).json({ error: 'No PDFs provided' });
    
    // Normalize Each PDF URL
    const normalizedPdfs = pdfs.map(p => {
      const np = { ...p };
      if (np.url && !np.fileUrl) np.fileUrl = np.url;
      if (np.fileUrl && !np.url) np.url = np.fileUrl;
      return np;
    });

    const result = await db.collection('pdfs').insertMany(normalizedPdfs);
    res.status(201).json({ success: true, inserted: result.insertedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk create PDFs' });
  }
};

export const createStandalonePdf = async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.url && !data.fileUrl) data.fileUrl = data.url;
    if (data.fileUrl && !data.url) data.url = data.fileUrl;
    
    const result = await db.collection('pdfs').insertOne(data);
    res.status(201).json({ _id: result.insertedId, ...data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create PDF' });
  }
};

export const updateAllPdfs = async (req, res) => {
  try {
    const updates = Array.isArray(req.body) ? req.body : Object.values(req.body);
    for (const update of updates) {
      const { id, _id, ...data } = update;
      if (id) await db.collection('pdfs').updateOne({ id }, { $set: data });
    }
    res.json({ success: true, message: 'PDFs updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update all PDFs' });
  }
};

// --- Splash Screen ---

export const getSplashScreenSettings = async (req, res) => {
  try {
    const splash = await db.collection('settings').findOne({ type: 'splash_screen' });
    const defaultSplash = {
      type: 'splash_screen',
      imageUrl: process.env.DEFAULT_SPLASH_URL || '/attach-assist/ChatGPT_Image_Feb_8,_2026,_05_51_58_PM_1770553325908.png',
      isActive: true,
      duration: 3000
    };
    res.json(splash || defaultSplash);
  } catch (error) {
    res.json({
      type: 'splash_screen',
      imageUrl: process.env.DEFAULT_SPLASH_URL || '/attach-assist/ChatGPT_Image_Feb_8,_2026,_05_51_58_PM_1770553325908.png',
      isActive: true,
      duration: 3000
    });
  }
};

export const updateSplashScreenSettings = async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    updateData.type = 'splash_screen';
    await db.collection('settings').updateOne(
      { type: 'splash_screen' },
      { $set: updateData },
      { upsert: true }
    );
    res.json({ success: true, message: 'Splash screen settings updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update splash screen settings' });
  }
};

export const getCoursePosts = async (req, res) => {
  try {
    const course = await findCourse(req.params.id);
    if (!course) return res.json([]);
    const query = {
      courseId: { $in: [String(course.id || ''), String(course._id || ''), req.params.id].filter(Boolean) }
    };
    const posts = await db.collection('posts').find(query).sort({ createdAt: -1 }).toArray();
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
};

// --- Course Posts ---

export const createCoursePost = async (req, res) => {
  try {
    const course = await findCourse(req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    const courseId = course.id || course._id.toString();
    const post = {
      ...req.body,
      courseId,
      createdAt: new Date().toISOString(),
      likes: 0,
      comments: []
    };
    const result = await db.collection('posts').insertOne(post);
    res.status(201).json({ _id: result.insertedId, ...post });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create post' });
  }
};

export const deleteCoursePost = async (req, res) => {
  try {
    const postId = req.params.postId;
    const filter = ObjectId.isValid(postId) ? { _id: new ObjectId(postId) } : { id: postId };
    const result = await db.collection('posts').deleteOne(filter);
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Post not found' });
    res.json({ success: true, message: 'Post deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
};

// --- Generic Note/PDF CRUD (Phase 19F) ---

export const updateStandaloneNote = async (req, res) => {
  try {
    const id = req.params.id;
    const query = {
      $or: [
        { id: id },
        { _id: ObjectId.isValid(id) ? new ObjectId(id) : null }
      ].filter(v => v.id || v._id)
    };
    const { _id, ...updateData } = req.body;
    let result = await db.collection('pdfs').updateOne(query, { $set: updateData });
    if (result.matchedCount === 0) {
      result = await db.collection('notes').updateOne(query, { $set: updateData });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
};

export const deleteStandaloneNote = async (req, res) => {
  try {
    const id = req.params.id;
    const query = {
      $or: [
        { id: id },
        { _id: ObjectId.isValid(id) ? new ObjectId(id) : null }
      ].filter(v => v.id || v._id)
    };
    let result = await db.collection('pdfs').deleteOne(query);
    if (result.deletedCount === 0) {
      result = await db.collection('notes').deleteOne(query);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
};

export const getGenericPdfs = async (req, res) => {
  try {
    const { courseId, isFree } = req.query;
    const query = {};
    if (courseId) query.courseId = courseId;
    if (isFree === 'true') query.isFree = true;
    
    const pdfs = await db.collection('pdfs').find(query).sort({ sortBy: 1 }).toArray();
    res.json(pdfs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch PDFs' });
  }
};

export const updateGenericPdf = async (req, res) => {
  try {
    const id = req.params.id;
    const query = {
      $or: [
        { id: id },
        { _id: ObjectId.isValid(id) ? new ObjectId(id) : null }
      ].filter(v => v.id || v._id)
    };
    const { _id, ...updateData } = req.body;
    await db.collection('pdfs').updateOne(query, { $set: updateData });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
};

export const deleteGenericPdf = async (req, res) => {
  try {
    const id = req.params.id;
    const query = {
      $or: [
        { id: id },
        { _id: ObjectId.isValid(id) ? new ObjectId(id) : null }
      ].filter(v => v.id || v._id)
    };
    const result = await db.collection('pdfs').deleteOne(query);
    if (result.deletedCount === 0) return res.status(404).json({ error: 'PDF not found' });
    res.json({ success: true, message: 'PDF deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete PDF' });
  }
};

// --- Chat System ---

export const getUnreadAdminChatsCount = async (req, res) => {
  try {
    const result = await db.collection('chats').aggregate([
      { $group: { _id: null, total: { $sum: '$unreadAdmin' } } }
    ]).toArray();
    res.json({ unread: result[0]?.total || 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
};

export const getChats = async (req, res) => {
  try {
    const { studentId } = req.query;
    const query = studentId ? { studentId } : {};
    const chats = await db.collection('chats').find(query).sort({ updatedAt: -1 }).toArray();
    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
};

export const startChat = async (req, res) => {
  try {
    const { studentId, studentName } = req.body;
    if (!studentId) return res.status(400).json({ error: 'studentId is required' });
    const existing = await db.collection('chats').findOne({ studentId });
    if (existing) return res.json(existing);

    const chatId = 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const chat = {
      id: chatId, studentId, studentName: studentName || 'Student',
      lastMessage: '', lastMessageBy: '', unreadAdmin: 0, unreadStudent: 0,
      createdAt: new Date(), updatedAt: new Date()
    };
    await db.collection('chats').insertOne(chat);
    res.status(201).json(chat);
  } catch (error) {
    res.status(500).json({ error: 'Failed to start chat' });
  }
};

export const getChatMessages = async (req, res) => {
  try {
    const messages = await db.collection('chatMessages')
      .find({ chatId: req.params.chatId })
      .sort({ createdAt: 1 })
      .toArray();
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chat messages' });
  }
};

// --- Video System (Phase 19H) ---

export const getCourseVideos = async (req, res) => {
  try {
    const course = await findCourse(req.params.id);
    if (!course) return res.json([]);

    const idVariants = await getRelatedCourseIds(course, req.params.id);
    const primaryId = req.params.id;

    // --- CHECK ENROLLMENT ---
    const studentId = req.user?.studentId;
    const adminId = req.user?.adminId;
    let isEnrolled = !!adminId;

    if (!isEnrolled && studentId) {
      const student = await db.collection('students').findOne({
        $or: [
          { id: studentId },
          { _id: ObjectId.isValid(studentId) ? new ObjectId(studentId) : null }
        ].filter(f => f.id || f._id)
      });
      if (student) {
        const enrolledCourses = student.enrolledCourses || [];
        isEnrolled = idVariants.some(id => enrolledCourses.includes(id)) ||
          (course.price === 0 || course.isFree === true); // Free courses are always "enrolled"
      }
    } else if (!isEnrolled) {
      // Guest or unauthenticated
      isEnrolled = (course.price === 0 || course.isFree === true);
    }

    // If not enrolled and not a free course, only return demo video
    if (!isEnrolled && course.price > 0) {
      if (course.demoVideo) {
        return res.json([{
          id: 'demo_' + (course.id || course._id),
          _id: 'demo_' + (course.id || course._id),
          title: 'Course Preview (Demo)',
          youtubeUrl: course.demoVideo,
          videoUrl: course.demoVideo,
          url: course.demoVideo,
          isFree: true,
          isDemo: true,
          thumbnail: course.thumbnail || course.imageUrl,
          duration: 'Preview',
          order: -1,
          contentType: 'video'
        }]);
      }
      return res.json([]);
    }
    // --- END ENROLLMENT CHECK ---

    // Fetch from all relevant batches
    let allRawVideos = await db.collection('videos').find({
      courseId: { $in: idVariants },
      status: { $nin: ['inactive', 'deleted'] }
    }).sort({ order: 1 }).toArray();

    if (allRawVideos.length === 0) {
      const courseNames = [course.name, course.title].filter(Boolean);
      if (courseNames.length > 0) {
        allRawVideos = await db.collection('videos').find({
          $or: [
            { course: { $in: courseNames } },
            { courseId: { $in: idVariants } }
          ],
          status: { $nin: ['inactive', 'deleted'] }
        }).sort({ order: 1 }).toArray();
      }
    }

    // Aggressive Deduplication Strategy
    // 1. Prioritize videos from the primary batch
    const uniqueVideos = [];
    const seenTitles = new Set();
    const seenUrls = new Set();
    const seenIds = new Set();

    const normalizeUrl = (url) => {
      if (!url) return '';
      try {
        let u = url.trim().toLowerCase();
        if (u.includes('youtube.com/watch?v=')) {
          const id = u.split('v=')[1]?.split('&')[0];
          if (id) return `yt:${id}`;
        }
        if (u.includes('youtu.be/')) {
          const id = u.split('youtu.be/')[1]?.split('?')[0];
          if (id) return `yt:${id}`;
        }
        if (u.includes('youtube.com/embed/')) {
          const id = u.split('embed/')[1]?.split('?')[0];
          if (id) return `yt:${id}`;
        }
        return u.replace(/\/$/, '');
      } catch (e) { return url.toLowerCase(); }
    };

    const normalizeTitle = (title) => {
      if (!title) return '';
      return title.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    };

    // First pass: Add videos from the current specific batch
    allRawVideos.forEach(v => {
      if (normalizeId(v.courseId) === normalizeId(primaryId)) {
        const title = normalizeTitle(v.title);
        const url = normalizeUrl(v.youtubeUrl || v.videoUrl || v.url);
        const id = v.id || v._id?.toString();

        if (title) seenTitles.add(title);
        if (url) seenUrls.add(url);
        if (id) seenIds.add(id);

        uniqueVideos.push(v);
      }
    });

    // Second pass: Add videos from other related batches ONLY if they are unique
    allRawVideos.forEach(v => {
      if (normalizeId(v.courseId) !== normalizeId(primaryId)) {
        const title = normalizeTitle(v.title);
        const url = normalizeUrl(v.youtubeUrl || v.videoUrl || v.url);
        const id = v.id || v._id?.toString();

        const isDuplicate =
          (id && seenIds.has(id)) ||
          (title && seenTitles.has(title)) ||
          (url && seenUrls.has(url));

        if (!isDuplicate) {
          if (title) seenTitles.add(title);
          if (url) seenUrls.add(url);
          if (id) seenIds.add(id);
          uniqueVideos.push(v);
        }
      }
    });

    // If admin and course has a demoVideo that's not already in the list, prepend it
    if (adminId && course.demoVideo) {
      const demoNormUrl = normalizeUrl(course.demoVideo);
      const alreadyPresent = uniqueVideos.some(v => normalizeUrl(v.youtubeUrl || v.videoUrl || v.url) === demoNormUrl);
      if (!alreadyPresent) {
        uniqueVideos.unshift({
          id: 'demo_' + (course.id || course._id),
          _id: 'demo_' + (course.id || course._id),
          title: 'Course Preview (Demo)',
          youtubeUrl: course.demoVideo,
          videoUrl: course.demoVideo,
          url: course.demoVideo,
          isFree: true,
          isDemo: true,
          thumbnail: course.thumbnail || course.imageUrl,
          duration: 'Preview',
          order: -1,
          contentType: 'video'
        });
      }
    }

    // --- MAPPING AND FALLBACK LOGIC ---
    const mappedVideos = uniqueVideos.map(v => {
      const videoUrl = v.youtubeUrl || v.videoUrl || v.url || '';
      const hasProvider = !!v.provider;
      
      let provider = v.provider;
      if (!hasProvider) {
        const url = videoUrl.toLowerCase();
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
          provider = 'youtube';
        } else if (url.includes('.m3u8')) {
          provider = 'hls';
        } else {
          provider = 'direct';
        }
      }

      return {
        ...v,
        provider,
        // Ensure the player always sees the expected fields
        youtubeUrl: provider === 'youtube' ? (v.youtubeUrl || videoUrl) : v.youtubeUrl,
        streamUrl: (provider === 'hls' || provider === 'direct') ? (v.streamUrl || videoUrl) : v.streamUrl,
        videoUrl: videoUrl // Keep for backward compatibility
      };
    });

    res.json(mappedVideos);

  } catch (error) {
    console.error('Fetch videos error:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
};

export const signVideoUrl = async (req, res) => {
  try {
    const { videoPath, courseId } = req.body;
    if (!videoPath) {
      return res.status(400).json({ error: 'Video path required' });
    }

    let student = null;
    if (req.user) {
      student = await db.collection('students').findOne({
        $or: [
          { id: req.user.studentId },
          ...(req.user.studentId && /^[a-f\d]{24}$/i.test(req.user.studentId) ? [{ _id: new ObjectId(req.user.studentId) }] : [])
        ]
      });
    } else if (req._legacySession && req.cookies.sessionToken) {
      student = await db.collection('students').findOne({ sessionToken: req.cookies.sessionToken });
    }

    if (!student) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (courseId) {
      const enrolled = (student.enrolledCourses || []).map(c => String(c));
      if (!enrolled.includes(String(courseId))) {
        const video = await db.collection('videos').findOne({
          $or: [
            { url: { $regex: videoPath } },
            { videoUrl: { $regex: videoPath } }
          ]
        });
        if (!video || !video.isFree) {
          return res.status(403).json({ error: 'Not enrolled in this course' });
        }
      }
    }

    const filename = videoPath.split('/').pop();
    const { signature, expiry } = generateSignedUrl(filename, 3600);
    const signedUrl = `/api/secure-video/${filename}?sig=${signature}&exp=${expiry}`;

    res.json({ signedUrl, expiresAt: expiry });
  } catch (error) {
    console.error('Sign URL error:', error);
    res.status(500).json({ error: 'Failed to generate signed URL' });
  }
};

export const postChatMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { senderId, senderName, senderType, message } = req.body;
    const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const chatMessage = {
      id: msgId, chatId, senderId,
      senderName: senderName || 'Unknown',
      senderType, message, createdAt: new Date()
    };
    await db.collection('chatMessages').insertOne(chatMessage);
    const unreadField = senderType === 'student' ? 'unreadAdmin' : 'unreadStudent';
    await db.collection('chats').updateOne(
      { id: chatId },
      {
        $set: { lastMessage: message, lastMessageBy: senderName, updatedAt: new Date() },
        $inc: { [unreadField]: 1 }
      }
    );
    res.status(201).json(chatMessage);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
};

export const markChatReadAdmin = async (req, res) => {
  try {
    await db.collection('chats').updateOne({ id: req.params.chatId }, { $set: { unreadAdmin: 0 } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
};

export const markChatReadStudent = async (req, res) => {
  try {
    await db.collection('chats').updateOne({ id: req.params.chatId }, { $set: { unreadStudent: 0 } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
};
// --- Course Video CRUD (Migrated from server.js) ---

export const createCourseVideo = async (req, res) => {
  try {
    const course = await findCourse(req.params.id);
    const courseId = course ? (course._id ? course._id.toString() : course.id) : req.params.id;

    // Sanitize folderId
    let folderId = req.body.folderId;
    if (folderId === 'null' || folderId === 'undefined' || !folderId) {
      folderId = null;
    } else {
      folderId = String(folderId);
    }

    const videoData = { ...req.body };
    const isLiveStream = videoData.contentType === 'live_stream' || videoData.type === 'live';

    const video = {
      ...videoData,
      ...(isLiveStream ? {
        title: videoData.title,
        platform: videoData.platform,
        meetingLink: videoData.meetingLink || videoData.link || videoData.url,
        startTime: videoData.startTime || videoData.publishOn || videoData.startDateTime,
        startDateTime: videoData.startDateTime || videoData.startTime || videoData.publishOn,
        publishOn: videoData.publishOn || videoData.startTime || videoData.startDateTime,
        isFree: videoData.isFree,
        isPaid: videoData.isPaid !== undefined ? videoData.isPaid : !videoData.isFree,
        thumbnail: videoData.thumbnail || videoData.image,
        contentType: 'live_stream', 
        type: videoData.type || 'live',
        status: videoData.status || 'upcoming',
        url: videoData.meetingLink || videoData.url || videoData.link
      } : {}),
      courseId: String(courseId),
      folderId: folderId,
      provider: videoData.provider || 'youtube',
      streamUrl: videoData.streamUrl,
      youtubeUrl: videoData.youtubeUrl,
      createdAt: new Date().toISOString()
    };
    if (isLiveStream) {
      if (videoData.endTime) video.endTime = videoData.endTime;
      if (videoData.endDateTime) video.endDateTime = videoData.endDateTime;
      if (videoData.joinBeforeMinutes) video.joinBeforeMinutes = videoData.joinBeforeMinutes;
      if (videoData.visibility) video.visibility = videoData.visibility;
    }
    delete video.instructor;

    if (isLiveStream) {
      const syncResult = await syncLiveStream(null, video, 'create');
      res.status(201).json({ _id: syncResult._id, ...video });
    } else {
      const result = await db.collection('videos').insertOne(video);
      res.status(201).json({ _id: result.insertedId, ...video });
    }
  } catch (error) {
    console.error('Video save error:', error);
    res.status(500).json({ error: 'Failed to add video' });
  }
};

export const updateCourseVideo = async (req, res) => {
  try {
    const course = await findCourse(req.params.id);
    const videoId = req.params.videoId;

    const query = {
      $or: [
        { id: videoId },
        { _id: ObjectId.isValid(videoId) ? new ObjectId(videoId) : null }
      ].filter(v => v.id || v._id)
    };

    if (course) {
      query.courseId = { $in: [String(course.id || ''), String(course._id || ''), req.params.id] };
    }

    const { _id, ...updateData } = req.body;
    const isLiveStream = updateData.contentType === 'live_stream' || updateData.type === 'live';

    const finalUpdate = { ...updateData };

    if (isLiveStream) {
      Object.assign(finalUpdate, {
        title: updateData.title || finalUpdate.title,
        platform: updateData.platform || finalUpdate.platform,
        meetingLink: updateData.meetingLink || updateData.link || updateData.url || finalUpdate.meetingLink,
        startTime: updateData.startTime || updateData.publishOn || updateData.startDateTime || finalUpdate.startTime,
        startDateTime: updateData.startDateTime || updateData.startTime || updateData.publishOn || finalUpdate.startDateTime,
        publishOn: updateData.publishOn || updateData.startTime || updateData.startDateTime || finalUpdate.publishOn,
        isFree: updateData.isFree !== undefined ? updateData.isFree : finalUpdate.isFree,
        isPaid: updateData.isPaid !== undefined ? updateData.isPaid : (updateData.isFree !== undefined ? !updateData.isFree : finalUpdate.isPaid),
        thumbnail: updateData.thumbnail || updateData.image || finalUpdate.thumbnail,
        contentType: 'live_stream',
        type: updateData.type || 'live',
        status: updateData.status || finalUpdate.status || 'upcoming',
        url: updateData.meetingLink || updateData.url || updateData.link || finalUpdate.url
      });

      if (updateData.endTime) finalUpdate.endTime = updateData.endTime;
      if (updateData.endDateTime) finalUpdate.endDateTime = updateData.endDateTime;
      if (updateData.joinBeforeMinutes) finalUpdate.joinBeforeMinutes = updateData.joinBeforeMinutes;
      if (updateData.visibility) finalUpdate.visibility = updateData.visibility;
    }
    delete finalUpdate.instructor;

    if (finalUpdate.folderId !== undefined) {
      if (finalUpdate.folderId === 'null' || finalUpdate.folderId === 'undefined' || !finalUpdate.folderId) {
        finalUpdate.folderId = null;
      } else {
        finalUpdate.folderId = String(finalUpdate.folderId);
      }
    }

    if (updateData.provider) finalUpdate.provider = updateData.provider;
    if (updateData.streamUrl !== undefined) finalUpdate.streamUrl = updateData.streamUrl;
    if (updateData.youtubeUrl !== undefined) finalUpdate.youtubeUrl = updateData.youtubeUrl;

    if (isLiveStream) {
      await syncLiveStream(videoId, finalUpdate, 'update');
      res.json({ success: true, message: 'Live stream updated and synced' });
    } else {
      const result = await db.collection('videos').updateOne(
        query,
        { $set: { ...finalUpdate, updatedAt: new Date().toISOString() } }
      );
      if (result.matchedCount === 0) return res.status(404).json({ error: 'Video not found' });
      res.json({ success: true, message: 'Video updated' });
    }
  } catch (error) {
    console.error('Video update error:', error);
    res.status(500).json({ error: 'Failed to update video' });
  }
};

export const deleteCourseVideo = async (req, res) => {
  try {
    const course = await findCourse(req.params.id);
    const videoId = req.params.videoId;

    const query = {
      $or: [
        { id: videoId },
        { _id: ObjectId.isValid(videoId) ? new ObjectId(videoId) : null }
      ].filter(v => v.id || v._id)
    };

    if (course) {
      query.courseId = { $in: [course.id, course._id.toString(), req.params.id] };
    }

    const video = await db.collection('videos').findOne(query);
    const isLiveStream = video && (video.contentType === 'live_stream' || video.type === 'live' || video.platform);

    if (isLiveStream) {
      await syncLiveStream(videoId, null, 'delete');
      res.json({ success: true, message: 'Live stream deleted across all collections' });
    } else {
      const result = await db.collection('videos').deleteOne(query);
      if (result.deletedCount === 0) return res.status(404).json({ error: 'Video not found' });
      res.json({ success: true, message: 'Video deleted' });
    }
  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({ error: 'Failed to delete video' });
  }
};
