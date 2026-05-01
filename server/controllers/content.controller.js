import mongoose from 'mongoose';
import { db } from '../config/db.js';

const { ObjectId } = mongoose.Types;

// --- Course Content Logic ---

/**
 * Orchestrator for recursive folder and content copy/move operations.
 * This remains in the core controller to avoid circular complexity 
 * between domain controllers during tree traversal.
 */

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

    const processFolderRecursively = async (sourceFolder, targetCourseId, action, targetParentId = null, visited = new Set()) => {
      const sourceId = sourceFolder._id?.toString() || sourceFolder.id;
      if (!sourceId || visited.has(sourceId)) return;
      visited.add(sourceId);

      let targetFolderId;
      if (action === 'copy') {
        const newFolder = { ...sourceFolder };
        delete newFolder._id;
        // Ensure every copied folder gets a unique ID to avoid cross-course collisions
        newFolder.id = `folder_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        newFolder.courseId = String(targetCourseId);
        newFolder.parentId = targetParentId;
        newFolder.createdAt = new Date().toISOString();
        await db.collection('folders').insertOne(newFolder);
        targetFolderId = newFolder.id;
      } else {
        // Move Safety: Prevent moving a folder into itself
        if (sourceId === targetParentId) return;

        await db.collection('folders').updateOne(
          { _id: sourceFolder._id },
          { $set: { courseId: String(targetCourseId), parentId: targetParentId } }
        );
        targetFolderId = sourceId;
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
              { $set: { courseId: String(targetCourseId), folderId: targetFolderId } }
            );
          }
        }
      }

      // Find subfolders within the SAME SOURCE course to avoid accidental cross-course pollution
      const subFolders = await db.collection('folders').find({
        courseId: sourceFolder.courseId,
        parentId: { $in: [...folderMatchIds, ...folderMatchOids] }
      }).toArray();

      for (const sub of subFolders) {
        await processFolderRecursively(sub, targetCourseId, action, targetFolderId, visited);
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
