import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
    id: { type: String, unique: true }, // Legacy ID support
    name: { type: String, required: true },
    email: { type: String, unique: true, sparse: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String }, // Hashed password
    userId: { type: String, unique: true, sparse: true }, // Custom Legacy ID/Username
    username: { type: String, unique: true, sparse: true }, // New searchable username
    highQualification: { type: String },
    status: { type: String, default: 'active' },
    admission: {
        fatherName: { type: String },
        motherName: { type: String },
        gender: { type: String },
        alternatePhone: { type: String },
        fullAddress: { type: String },
        batchTiming: { type: String },
        admissionDate: { type: Date, default: Date.now },
    },
    fees: {
        totalFees: { type: Number, default: 0 },
        paidAmount: { type: Number, default: 0 },
        remainingAmount: { type: Number, default: 0 },
    },
    academic: {
        previousClass: { type: String },
        schoolName: { type: String },
        marksPercentage: { type: String },
        passingYear: { type: String },
    },
    documents: {
        aadharCard: { type: String },
        marksheet: { type: String },
        photo: { type: String },
        profilePhoto: { type: String },
    },

    registrationType: { type: String, default: 'regular' },
    registrationDate: { type: String },
    city: { type: String },
    state: { type: String },
    dob: { type: String },
    course: { type: String },
    notes: { type: String },
    paymentStatus: { type: String, default: 'pending' },
    enrolledBatch: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },

    deviceId: { type: String, default: null },
    pendingDeviceId: { type: String, default: null },
    deviceLocked: { type: Boolean, default: true },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Student = mongoose.model('Student', studentSchema);
export default Student;
