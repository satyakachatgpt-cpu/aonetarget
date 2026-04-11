import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

const subcategories = [
  // NEET Subcategories
  { categoryId: 'neet', id: 'recorded_batch', title: 'Recorded Batch', icon: 'play_circle', color: 'from-[#303F9F] to-[#1A237E]', order: 1, isActive: true },
  { categoryId: 'neet', id: 'live_classroom', title: 'Live Classroom', icon: 'cast_for_education', color: 'from-[#D32F2F] to-[#B71C1C]', order: 2, isActive: true },
  { categoryId: 'neet', id: 'crash_course', title: 'Crash Course', icon: 'bolt', color: 'from-[#E65100] to-[#BF360C]', order: 3, isActive: true },
  { categoryId: 'neet', id: 'mock_test', title: 'Mock Test', icon: 'quiz', color: 'from-[#2E7D32] to-[#1B5E20]', order: 4, isActive: true },

  // IIT-JEE Subcategories
  { categoryId: 'iit-jee', id: 'recorded_batch', title: 'Recorded Batch', icon: 'play_circle', color: 'from-[#303F9F] to-[#1A237E]', order: 1, isActive: true },
  { categoryId: 'iit-jee', id: 'live_classroom', title: 'Live Classroom', icon: 'cast_for_education', color: 'from-[#D32F2F] to-[#B71C1C]', order: 2, isActive: true },
  { categoryId: 'iit-jee', id: 'crash_course', title: 'Crash Course', icon: 'bolt', color: 'from-[#E65100] to-[#BF360C]', order: 3, isActive: true },
  { categoryId: 'iit-jee', id: 'mock_test', title: 'Mock Test', icon: 'quiz', color: 'from-[#2E7D32] to-[#1B5E20]', order: 4, isActive: true },

  // 11th-12th Subcategories
  { categoryId: '11th-12th', id: 'recorded_batch', title: 'Recorded Batch', icon: 'play_circle', color: 'from-[#303F9F] to-[#1A237E]', order: 1, isActive: true },
  { categoryId: '11th-12th', id: 'live_classroom', title: 'Live Classroom', icon: 'cast_for_education', color: 'from-[#D32F2F] to-[#B71C1C]', order: 2, isActive: true },
  { categoryId: '11th-12th', id: 'crash_course', title: 'Crash Course', icon: 'bolt', color: 'from-[#E65100] to-[#BF360C]', order: 3, isActive: true },
  { categoryId: '11th-12th', id: 'mock_test', title: 'Mock Test', icon: 'quiz', color: 'from-[#2E7D32] to-[#1B5E20]', order: 4, isActive: true },

  // 9th-10th (foundation) Subcategories
  { categoryId: 'foundation', id: 'class-9th', title: 'Class 9th', icon: 'school', color: 'from-indigo-600 to-violet-700', order: 1, isActive: true },
  { categoryId: 'foundation', id: 'class-10th', title: 'Class 10th', icon: 'school', color: 'from-purple-600 to-fuchsia-700', order: 2, isActive: true },

  // Nursing CET Subcategories
  { categoryId: 'nursing-cet', id: 'bsc-cet-entrance', title: 'BSc CET Entrance', icon: 'local_hospital', color: 'from-teal-500 to-teal-600', order: 1, isActive: true },
  { categoryId: 'nursing-cet', id: 'nursing-officer', title: 'Nursing Officer', icon: 'medical_services', color: 'from-emerald-500 to-emerald-600', order: 2, isActive: true },
  { categoryId: 'nursing-cet', id: 'anm-mphw', title: 'ANM / MPHW', icon: 'emergency', color: 'from-teal-600 to-teal-700', order: 3, isActive: true },
  { categoryId: 'nursing-cet', id: 'gnm', title: 'GNM', icon: 'school', color: 'from-emerald-600 to-emerald-700', order: 4, isActive: true },
  { categoryId: 'nursing-cet', id: 'ebooks', title: 'E-Book', icon: 'menu_book', color: 'from-cyan-600 to-cyan-700', order: 5, isActive: true },
  { categoryId: 'nursing-cet', id: 'bsc-nursing', title: 'BSc Nursing', icon: 'diversity_1', color: 'from-teal-700 to-teal-800', order: 6, isActive: true },
  { categoryId: 'nursing-cet', id: 'mock-tests', title: 'Mock Test', icon: 'quiz', color: 'from-emerald-700 to-emerald-800', order: 7, isActive: true },
];

const subjects = [
  // NEET Subjects
  { id: 'biology', name: 'Biology', course: 'neet', icon: 'biotech', status: 'active' },
  { id: 'chemistry', name: 'Chemistry', course: 'neet', icon: 'science', status: 'active' },
  { id: 'physics', name: 'Physics', course: 'neet', icon: 'electric_bolt', status: 'active' },

  // IIT-JEE Subjects
  { id: 'chemistry', name: 'Chemistry', course: 'iit-jee', icon: 'science', status: 'active' },
  { id: 'physics', name: 'Physics', course: 'iit-jee', icon: 'electric_bolt', status: 'active' },
  { id: 'maths', name: 'Mathematics', course: 'iit-jee', icon: 'calculate', status: 'active' },

  // Foundation Subjects
  { id: 'english', name: 'English', course: 'foundation', icon: 'menu_book', status: 'active' },
  { id: 'hindi', name: 'Hindi', course: 'foundation', icon: 'language', status: 'active' },
  { id: 'social_studies', name: 'Social Studies', course: 'foundation', icon: 'public', status: 'active' },
  { id: 'science', name: 'Science', course: 'foundation', icon: 'science', status: 'active' },
  { id: 'maths', name: 'Mathematics', course: 'foundation', icon: 'calculate', status: 'active' },
];

const seed = async () => {
  try {
    await mongoose.connect(MONGODB_URI, { dbName: 'aonetarget' });
    console.log('Connected to DB');

    const db = mongoose.connection.db;

    // Seed Subcategories
    for (const sub of subcategories) {
      await db.collection('subcategories').updateOne(
        { id: sub.id, categoryId: sub.categoryId },
        { $set: sub },
        { upsert: true }
      );
      console.log(`Seeded subcategory: ${sub.title} for ${sub.categoryId}`);
    }

    // Seed Subjects
    for (const subj of subjects) {
      await db.collection('subjects').updateOne(
        { id: subj.id, course: subj.course },
        { $set: subj },
        { upsert: true }
      );
      console.log(`Seeded subject: ${subj.name} for ${subj.course}`);
    }

    console.log('Seeding completed successfully');
    await mongoose.disconnect();
  } catch (error) {
    console.error('Seeding error:', error);
  }
};

seed();
