
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'aonetarget' });
  const db = mongoose.connection.db;
  
  const course = await db.collection('courses').findOne({ 
    $or: [
      { name: /Physics Foundation/i },
      { title: /Physics Foundation/i }
    ]
  });
  
  if (!course) {
    console.log('Course not found');
    process.exit(1);
  }
  
  console.log('Found Course:', course.title || course.name, 'ID:', course.id || course._id);
  
  const courseId = course.id || course._id.toString();
  const videos = await db.collection('videos').find({ 
    $or: [
      { courseId: String(courseId) },
      { courseId: String(course._id) }
    ]
  }).toArray();
  
  console.log('Total Videos:', videos.length);
  videos.forEach((v, i) => {
    console.log(`${i+1}. ${v.title} (Folder: ${v.folderId || 'None'})`);
  });

  const folders = await db.collection('folders').find({
    courseId: { $in: [String(courseId), String(course._id)] }
  }).toArray();
  console.log('Total Folders:', folders.length);
  folders.forEach((f, i) => {
    console.log(`${i+1}. ${f.name || f.title} (Parent: ${f.parentId || 'None'}) ID: ${f.id || f._id}`);
  });

  process.exit(0);
}

check();
