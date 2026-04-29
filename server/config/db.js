import mongoose from 'mongoose';

/** Initialized after connectDB() succeeds. Never access directly — use getDb(). */
let _db;

/** Public read-only export kept for backward compatibility with existing imports. */
export { _db as db };

const MONGODB_URI = process.env.MONGODB_URI;

/**
 * Returns the initialized db instance.
 * Throws a controlled error if called before connectDB() has resolved.
 * Use this in controllers that were written before the guard was added,
 * as a migration path.
 */
export function getDb() {
  if (!_db) {
    const error = new Error('[DB] Database not initialized. connectDB() must resolve before handling requests.');
    error.code = 'DB_NOT_READY';
    throw error;
  }
  return _db;
}

/**
 * Connects to MongoDB.
 *
 * Startup behavior (isInitialConnect = true, default):
 *   - Throws on failure → caller (startServer) must handle and abort startup.
 *   - Does NOT silently swallow errors on initial connect.
 *
 * Reconnect behavior (isInitialConnect = false):
 *   - Retries every 5s (same as before) — handles transient Atlas disconnects.
 */
export const connectDB = async (isInitialConnect = true) => {
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: 'aonetarget',
      serverSelectionTimeoutMS: 30000, // Allow slow Atlas handshakes
      family: 4 // Force IPv4 to avoid resolution issues
    });

    _db = mongoose.connection.db;
    console.log('✅ MongoDB connected successfully');

    // Ensure required indexes (non-fatal if already exist)
    try {
      const existingIndexes = await _db.collection('students').indexes();
      const existingNames = existingIndexes.map(i => i.name);
      if (!existingNames.includes('phone_1')) {
        await _db.collection('students').createIndex({ phone: 1 }, { unique: true, sparse: true });
      }
      if (!existingNames.includes('sessionToken_1')) {
        await _db.collection('students').createIndex({ sessionToken: 1 }, { sparse: true });
      }
      if (!existingNames.includes('id_1')) {
        await _db.collection('students').createIndex({ id: 1 }, { sparse: true });
      }
      await _db.collection('videos').createIndex({ courseId: 1 });
      await _db.collection('videos').createIndex({ folderId: 1 });
      // Ensure other indexes with existence checks to avoid warnings
      const ensureIndex = async (collName, keys, options) => {
        try {
          const coll = _db.collection(collName);
          const indexes = await coll.indexes();
          const name = options.name || Object.keys(keys).map(k => `${k}_${keys[k]}`).join('_');
          if (!indexes.some(idx => idx.name === name)) {
            await coll.createIndex(keys, options);
          }
        } catch (e) { /* Silent ignore for non-fatal conflicts */ }
      };

      await ensureIndex('courses', { id: 1 }, { sparse: true });
      await ensureIndex('packages', { id: 1 }, { sparse: true });
      await _db.collection('folders').createIndex({ courseId: 1, parentId: 1 });
      await _db.collection('tests').createIndex({ courseId: 1 });
      await _db.collection('tests').createIndex({ isSeries: 1 });
      await _db.collection('tests').createIndex({ status: 1 });
      await _db.collection('pdfs').createIndex({ courseId: 1 });
      await _db.collection('questions').createIndex({ testId: 1 });
      await _db.collection('questions').createIndex({ courseId: 1 });
      await _db.collection('testResults').createIndex({ testId: 1 });
      await _db.collection('testResults').createIndex({ studentId: 1 });
      await _db.collection('enrollments').createIndex({ studentId: 1 });
      await _db.collection('courseProgress').createIndex({ studentId: 1, courseId: 1 });
      await _db.collection('videoProgress').createIndex({ userId: 1, videoId: 1 });
      await _db.collection('watchHistory').createIndex({ studentId: 1, videoId: 1 });
      await _db.collection('watchHistory').createIndex({ studentId: 1, updatedAt: -1 });
      await _db.collection('liveVideos').createIndex({ courseId: 1 });
      await _db.collection('liveClasses').createIndex({ courseId: 1 });
      await _db.collection('categories').createIndex({ isActive: 1 });
      await _db.collection('banners').createIndex({ isActive: 1 });
      await _db.collection('posts').createIndex({ status: 1 });

      // Auth security indexes
      await _db.collection('auth_attempts').createIndex({ identifier: 1, ip: 1 }, { unique: true });
      await _db.collection('auth_attempts').createIndex({ lockUntil: 1 }, { expireAfterSeconds: 0 });
      await _db.collection('refresh_tokens').createIndex({ tokenHash: 1 }, { unique: true });
      await _db.collection('refresh_tokens').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
      await _db.collection('password_resets').createIndex({ tokenHash: 1 }, { unique: true });
      await _db.collection('password_resets').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
      await _db.collection('otps').createIndex({ phone: 1, purpose: 1 }, { unique: true });
      await _db.collection('otps').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

      console.log('✅ MongoDB indexes ensured');

      // Batch Sorting Migration
      try {
        console.log('Running sortingOrder migration...');
        const collections = ['courses', 'packages'];
        for (const collName of collections) {
          const records = await _db.collection(collName).find({}).toArray();
          for (const record of records) {
            let needsUpdate = false;
            const updateObj = {};
            if (!record.settings) {
              updateObj['settings'] = { sortingOrder: 9999 };
              needsUpdate = true;
            } else {
              const currentOrder = record.settings.sortingOrder;
              if (currentOrder === undefined || currentOrder === null || currentOrder === '') {
                updateObj['settings.sortingOrder'] = 9999;
                needsUpdate = true;
              } else if (typeof currentOrder === 'string') {
                updateObj['settings.sortingOrder'] = parseFloat(currentOrder) || 9999;
                needsUpdate = true;
              }
            }
            if (needsUpdate) {
              await _db.collection(collName).updateOne({ _id: record._id }, { $set: updateObj });
            }
          }
        }
        console.log('✅ SortingOrder migration completed');
      } catch (migErr) {
        console.error('Migration error (non-fatal):', migErr);
      }

    } catch (indexErr) {
      console.warn('Index creation warning (non-fatal):', indexErr.message);
    }

    // Handle disconnects after initial startup — retry silently
    mongoose.connection.on('disconnected', () => {
      console.warn('[DB] MongoDB disconnected. Attempting reconnect...');
      setTimeout(() => connectDB(false), 5000);
    });

  } catch (error) {
    if (isInitialConnect) {
      // On startup: propagate the error so startServer() can abort
      console.error('[DB] Fatal: MongoDB initial connection failed:', error.message || error);
      throw error;
    } else {
      // On reconnect: log and retry
      if (error.name === 'MongooseServerSelectionError') {
        console.warn('[DB] Still connecting to MongoDB Atlas...');
      } else {
        console.error('[DB] Reconnect error:', error.message || error);
      }
      console.log('[DB] Retrying in 5 seconds...');
      setTimeout(() => connectDB(false), 5000);
    }
  }
};
