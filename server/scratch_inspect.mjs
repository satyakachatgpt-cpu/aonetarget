import 'dotenv/config';
import { connectDB, db } from './config/db.js';

async function main() {
  await connectDB();
  const videos = await db.collection('videos').find({ title: { $regex: 'jai baba ki', $options: 'i' } }).toArray();
  const liveVideos = await db.collection('liveVideos').find({ title: { $regex: 'jai baba ki', $options: 'i' } }).toArray();
  const liveClasses = await db.collection('liveClasses').find({ title: { $regex: 'jai baba ki', $options: 'i' } }).toArray();
  
  console.log('VIDEOS:');
  console.log(JSON.stringify(videos, null, 2));
  console.log('LIVE VIDEOS:');
  console.log(JSON.stringify(liveVideos, null, 2));
  console.log('LIVE CLASSES:');
  console.log(JSON.stringify(liveClasses, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
