import mongoose from 'mongoose';

const subcategorySchema = new mongoose.Schema({
    id: { type: String },
    title: { type: String, required: true },
    isActive: { type: Boolean, default: true }
}, { _id: false });

const categorySchema = new mongoose.Schema({
    id: { type: String },
    title: { type: String, required: true },
    icon: { type: String },
    isActive: { type: Boolean, default: true },
    subcategories: [subcategorySchema],
    createdAt: { type: Date, default: Date.now }
});

const Category = mongoose.model('Category', categorySchema);
export default Category;
