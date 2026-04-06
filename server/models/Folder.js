import mongoose from 'mongoose';

const folderSchema = new mongoose.Schema({
    id: { type: String },
    title: { type: String, required: true },
    description: { type: String },
    thumbnail: { type: String },
    courseId: { type: String, required: true },
    parentId: { type: String, default: null },
    isFree: { type: Boolean, default: false },
    thumbnailPublicId: { type: String },
    cloudinaryPublicId: { type: String },
    status: { type: String, default: 'active' },
    order: { type: Number, default: 0 },
    sortingOrder: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { strict: false });

const Folder = mongoose.model('Folder', folderSchema);
export default Folder;
