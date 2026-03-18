
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const { ObjectId } = mongoose.Types;

async function check() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'aonetarget' });
  const db = mongoose.connection.db;
  
  const targetId = '67d69a33b96692aa7d860d5b';
  const collections = ['courses', 'packages', 'testSeries', 'subcourses', 'lessons', 'batches'];
  
  for (const col of collections) {
    let item;
    try {
      item = await db.collection(col).findOne({ 
        $or: [
          { id: targetId },
          { _id: ObjectId.isValid(targetId) ? new ObjectId(targetId) : null }
        ]
      });
    } catch (e) {}

    if (item) {
      console.log(`Found item in ${col}: ${item.title || item.name} | ID: ${item.id} | _ID: ${item._id}`);
      process.exit(0);
    }
  }
  
  console.log('Item not found for ID', targetId);
  process.exit(0);
}

check();
