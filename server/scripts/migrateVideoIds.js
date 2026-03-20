import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Video from '../models/Video.js';
import { encryptVideoId } from '../services/tokenService.js';
import logger from '../services/logger.js';

dotenv.config({ path: '../.env' }); // Adjust if needed

const MONGODB_URI = process.env.MONGODB_URI;

async function migrate() {
  try {
    await mongoose.connect(MONGODB_URI, { dbName: 'aonetarget' });
    console.log('Connected to MongoDB');

    const videos = await Video.find({ youtubeVideoIdEncrypted: { $exists: false } });
    console.log(`Found ${videos.length} videos to migrate.`);

    for (const video of videos) {
      try {
        // Find YouTube ID from URL or existing field
        let ytId = video.youtubeVideoId || '';
        if (!ytId && video.url) {
            // Simple regex for YT ID
            const match = video.url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
            if (match) ytId = match[1];
            else ytId = video.url; // Use raw URL if it doesn't match
        }

        if (ytId) {
            const encrypted = encryptVideoId(ytId);
            video.youtubeVideoIdEncrypted = encrypted;
            await video.save();
            console.log(`Migrated video: ${video.title}`);
        }
      } catch (err) {
        console.error(`Failed to migrate video ${video._id}:`, err);
      }
    }

    console.log('Migration completed.');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();
