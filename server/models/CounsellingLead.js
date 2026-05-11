import mongoose from 'mongoose';

const counsellingLeadSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true, 
        trim: true,
        maxlength: 80
    },
    phone: { 
        type: String, 
        required: true, 
        trim: true,
        maxlength: 15
    },
    email: { 
        type: String, 
        trim: true, 
        lowercase: true,
        maxlength: 120
    },
    interestedCategory: { 
        type: String,
        trim: true
    },
    message: { 
        type: String, 
        trim: true,
        maxlength: 500
    },
    studentId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Student' 
    },
    source: { 
        type: String, 
        default: 'student_explore_cta' 
    },
    status: { 
        type: String, 
        enum: ['new', 'contacted', 'resolved'], 
        default: 'new' 
    }
}, {
    timestamps: true
});

const CounsellingLead = mongoose.model('CounsellingLead', counsellingLeadSchema);
export default CounsellingLead;
