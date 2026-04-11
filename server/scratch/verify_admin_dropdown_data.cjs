const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://satyakachatgpt:satya1234@cluster0.p0v7w.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function verifyMapping() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const Category = mongoose.model('Category', new mongoose.Schema({
            id: String,
            name: String,
            title: String
        }));

        const SubCategory = mongoose.model('SubCategory', new mongoose.Schema({
            id: String,
            categoryId: String,
            title: String
        }));

        const categories = await Category.find({});
        console.log('\n--- Categories ---');
        categories.forEach(cat => {
            console.log(`${cat.title || cat.name} (ID/Slug: ${cat.id}) [_id: ${cat._id}]`);
        });

        const subCategories = await SubCategory.find({});
        console.log('\n--- Sub-Categories Mapping ---');
        subCategories.forEach(sub => {
            const parent = categories.find(c => c.id === sub.categoryId);
            console.log(`${sub.title} (ID: ${sub.id}) -> Parent ID: ${sub.categoryId} (${parent ? parent.title || parent.name : 'NOT FOUND'})`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

verifyMapping();
