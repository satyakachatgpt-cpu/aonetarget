import mongoose from 'mongoose';

const subcategorySchema = new mongoose.Schema({
    id: { type: String },
    title: { type: String, required: true },
    isActive: { type: Boolean, default: true }
}, { _id: false });

const categorySchema = new mongoose.Schema({
    id: { type: String },
    title: { type: String, required: true },
    subtitle: { type: String },
    description: { type: String },
    icon: { type: String },
    gradient: { type: String },
    tag: { type: String },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    imageUrl: { type: String },
    hierarchyMode: { type: String, enum: ['simple', 'exam-branch', 'board-class'], default: 'simple' },
    level1Label: { type: String },
    level2Label: { type: String },
    branchesL1: [{ label: String, slug: String }],
    branchesL2: [{ label: String, slug: String }],
    subcategories: [subcategorySchema],
    createdAt: { type: Date, default: Date.now }
});

const Category = mongoose.model('Category', categorySchema);
export default Category;
