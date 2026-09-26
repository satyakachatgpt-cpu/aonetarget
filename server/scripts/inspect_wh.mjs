import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const { connectDB, getDb } = await import('../config/db.js');

async function main() {
  await connectDB();
  const db = getDb();
  const st = await db.collection('students').findOne({ phone: /8168269901/ });
  console.log('STUDENT HARSH:', st ? { _id: st._id, id: st.id, name: st.name, phone: st.phone } : 'not found');
  if (st) {
    const sId = String(st._id);
    const wh = await db.collection('watchHistory').find({ $or: [{ studentId: sId }, { studentId: st.id }] }).toArray();
    const vp = await db.collection('videoProgress').find({ $or: [{ userId: sId }, { userId: st.id }] }).toArray();
    console.log('WATCH_HISTORY count for Harsh:', wh.length);
    console.log('VIDEO_PROGRESS count for Harsh:', vp.length);
    if (wh.length > 0) console.log('WH sample:', JSON.stringify(wh[0], null, 2));
    if (vp.length > 0) console.log('VP sample:', JSON.stringify(vp[0], null, 2));
  }
  const allWhCount = await db.collection('watchHistory').countDocuments();
  const allVpCount = await db.collection('videoProgress').countDocuments();
  console.log('ALL watchHistory count:', allWhCount, 'ALL videoProgress count:', allVpCount);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
