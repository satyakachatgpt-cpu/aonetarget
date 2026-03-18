import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
    id: { type: String }, // Legacy ID support
    name: { type: String, required: true },
    title: { type: String },
    description: { type: String },
    instructor: { type: String },
    thumbnail: { type: String },
    price: { type: String },
    originalPrice: { type: String },
    category: { type: String },
    categoryId: { type: String },
    subcategoryId: { type: String },
    examType: { type: String },
    contentType: { type: String },
    subject: { type: String },
    boardType: { type: String },
    isActive: { type: Boolean, default: true },
    lessons: { type: Number, default: 0 },
    videoCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { strict: false }); // Using strict: false temporarily to handle dynamic fields from old data

const Course = mongoose.model('Course', courseSchema);
export default Course;
