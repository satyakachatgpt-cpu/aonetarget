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
    district: { type: String },
    state: { type: String },
    dob: { type: String },
    gender: { type: String },
    whatsAppNumber: { type: String },
    alternateWhatsAppNumber: { type: String },
    alternateNumber: { type: String },
    course: { type: String },
    class: { type: String },
    target: { type: String, trim: true },
    address: { type: String },
    notes: { type: String },
    paymentStatus: { type: String, default: 'pending' },
    enrolledBatch: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    enrolledCourses: [{ type: String }],

    // ACTIVE DEVICE
    activeDeviceId: { type: String, default: null },
    activeDeviceName: { type: String, default: null },
    activeDeviceType: { type: String, default: null },
    activeDeviceIP: { type: String, default: null },
    activeDeviceUserAgent: { type: String, default: null },
    activeDeviceRegisteredAt: { type: Date, default: null },
    activeDeviceLastLoginAt: { type: Date, default: null },

    // PENDING DEVICE
    pendingDeviceId: { type: String, default: null },
    pendingDeviceName: { type: String, default: null },
    pendingDeviceType: { type: String, default: null },
    pendingDeviceIP: { type: String, default: null },
    pendingDeviceUserAgent: { type: String, default: null },
    pendingDeviceRequestedAt: { type: Date, default: null },
    pendingDeviceStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', null],
      default: null
    },

    deviceId: { type: String, default: null }, // Legacy support
    deviceLocked: { type: Boolean, default: true },
    sessionToken: { type: String, default: null },
    activeSessions: [{ type: mongoose.Schema.Types.Mixed }],
    
    isBanned: { type: Boolean, default: false },
    banReason: { type: String, default: null },
    isReviewer: { type: Boolean, default: false },

    // Referral & Coin System
    referredBy: { type: String, default: null },
    coins: { type: Number, default: 0 },
    welcomeBonus: { type: Number, default: 0 },
    usedCoins: { type: Number, default: 0 },
    availableCoins: { type: Number, default: 0 },
    pendingCoins: { type: Number, default: 0 },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Student = mongoose.model('Student', studentSchema);
export default Student;
