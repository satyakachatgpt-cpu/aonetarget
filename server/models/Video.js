import mongoose from 'mongoose';

const videoSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    url: { type: String, required: true },
    thumbnail: { type: String },
    courseId: { type: String, required: true },
    duration: { type: String },
    isFree: { type: Boolean, default: false },
    allowDownload: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
}, { strict: false });

const Video = mongoose.model('Video', videoSchema);
export default Video;
