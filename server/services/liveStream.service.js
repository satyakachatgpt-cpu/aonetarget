import { db } from '../config/db.js';
import mongoose from 'mongoose';

const { ObjectId } = mongoose.Types;

/**
 * Centralized Sync Helper for Live Streams
 * Ensures liveVideos (Primary), videos, and liveClasses are kept in sync.
 * Ported from server.js (Source of Truth).
 */
export async function syncLiveStream(id, data, operation = 'update') {
  console.log(`[SYNC_LIVE_STREAM] ${operation.toUpperCase()} id=${id}`, data);
  try {
    const query = {
      $or: [
        { id: id },
        { _id: ObjectId.isValid(id) ? new ObjectId(id) : null }
      ].filter(f => f.id || f._id)
    };

    if (operation === 'delete') {
      await Promise.all([
        db.collection('liveVideos').deleteOne(query),
        db.collection('videos').deleteOne(query),
        db.collection('liveClasses').deleteOne(query)
      ]);
      return { success: true };
    }

    // Standardize mapping for consistency
    const syncData = { ...data };
    
    // Metadata standardization
    if (data.url || data.streamId || data.link || data.videoUrl) {
      syncData.url = data.url || data.streamId || data.link || data.videoUrl;
    }
    
    // Force Correct Classification
    syncData.contentType = 'live_stream';
    syncData.type = 'live';
    
    // Visibility vs Lifecycle Split
    if (!syncData.status || syncData.status === 'upcoming' || syncData.status === 'live' || syncData.status === 'ended') {
      if (!syncData.streamStatus) syncData.streamStatus = syncData.status || 'upcoming';
      syncData.status = 'active'; 
    }

    if (data.pdf1Url) syncData.pdf1 = data.pdf1Url;
    if (data.pdf1) syncData.pdf1Url = data.pdf1;
    if (data.pdf2Url) syncData.pdf2 = data.pdf2Url;
    if (data.pdf2) syncData.pdf2Url = data.pdf2;
    if (data.studyMaterialUrl) syncData.studyMaterial = data.studyMaterialUrl;
    if (data.studyMaterial) syncData.studyMaterialUrl = data.studyMaterial;

    syncData.updatedAt = new Date().toISOString();

    if (operation === 'create') {
      const result = await db.collection('liveVideos').insertOne(syncData);
      const insertedId = result.insertedId;
      const copyData = { ...syncData, _id: insertedId };
      
      await Promise.all([
        db.collection('videos').insertOne(copyData).catch(e => console.error('Sync create to videos failed:', e)),
        db.collection('liveClasses').insertOne(copyData).catch(e => console.error('Sync create to liveClasses failed:', e))
      ]);
      return { success: true, _id: insertedId };
    } else {
      await db.collection('liveVideos').updateOne(query, { $set: syncData });
      await Promise.all([
        db.collection('videos').updateMany(query, { $set: syncData }).catch(e => console.error('Sync update to videos failed:', e)),
        db.collection('liveClasses').updateMany(query, { $set: syncData }).catch(e => console.error('Sync update to liveClasses failed:', e))
      ]);
      return { success: true };
    }
  } catch (error) {
    console.error('syncLiveStream error:', error);
    throw error;
  }
}
