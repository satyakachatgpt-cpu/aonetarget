import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import Student from '../models/Student.js';

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Dummy user details
    const dummyPhone = '9999999999';
    const dummyEmail = 'googleplaytest@aonetarget.com';
    const dummyPassword = 'Test@1234';
    const dummyUserId = 'googleplaytest';

    // 1. Fetch all available courses, packages, test series
    const collectionsToSearch = ['courses', 'packages', 'testSeries', 'subcourses'];
    let allContentIds = [];

    for (const col of collectionsToSearch) {
      try {
        const items = await db.collection(col).find({}, { projection: { _id: 1, id: 1 } }).toArray();
        items.forEach(item => {
          if (item.id) allContentIds.push(String(item.id));
          if (item._id) allContentIds.push(String(item._id));
        });
      } catch (e) {
        console.error(`Error reading ${col}`, e.message);
      }
    }
    
    // Deduplicate IDs
    allContentIds = [...new Set(allContentIds)];
    console.log(`Found ${allContentIds.length} unique items to grant access to.`);

    // 2. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(dummyPassword, salt);

    // 3. Upsert dummy user
    const existingStudent = await Student.findOne({ phone: dummyPhone });

    if (existingStudent) {
      console.log('Dummy user already exists. Updating courses and bypassing device lock...');
      existingStudent.isReviewer = true;
      existingStudent.password = hashedPassword;
      existingStudent.enrolledCourses = allContentIds;
      await existingStudent.save();
    } else {
      console.log('Creating new dummy user...');
      const student = new Student({
        id: dummyUserId,
        userId: dummyUserId,
        username: dummyUserId,
        name: 'Play Store Reviewer',
        email: dummyEmail,
        phone: dummyPhone,
        password: hashedPassword,
        isReviewer: true,
        status: 'active',
        enrolledCourses: allContentIds
      });
      await student.save();
    }

    console.log('Dummy account setup successfully:');
    console.log(`Email / Login ID: ${dummyEmail} OR ${dummyPhone}`);
    console.log(`Password: ${dummyPassword}`);
    console.log(`Enrolled in ${allContentIds.length} items.`);

  } catch (error) {
    console.error('Error in script:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

main();
