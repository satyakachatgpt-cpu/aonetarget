import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
    id: { type: String, unique: true }, // Legacy ID support
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String, required: true, unique: true },
    alternateNumber: { type: String, required: false },
    whatsAppNumber: { type: String, required: false },
    class: { type: String },
    target: { type: String, default: 'NEET' },
    address: { type: String },
    state: { type: String },
    district: { type: String },
    gender: { type: String },
    dob: { type: String },
    referralCode: { type: String },
    enrolledCourses: [{ type: String }], // Array of course IDs
    status: { type: String, default: 'active' },
    sessionToken: { type: String },
    sessionCreatedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Student = mongoose.model('Student', studentSchema);
export default Student;
