const mongoose = require('mongoose');
require('dotenv').config();

const courseSchema = new mongoose.Schema({
    name: String,
    categoryId: String,
    subcategoryId: String,
    settings: {
        isFeatured: Boolean
    }
}, { strict: false });

const Course = mongoose.model('Course', courseSchema);

async function verifySync() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const featuredCourses = await Course.find({ 'settings.isFeatured': true });
        console.log(`Total Featured Courses: ${featuredCourses.length}`);
        
        featuredCourses.forEach(c => {
            console.log(`- ${c.name} (Cat: ${c.categoryId}, Sub: ${c.subcategoryId})`);
        });

        const catCounts = await Course.aggregate([
            { $group: { _id: { cat: "$categoryId", sub: "$subcategoryId" }, count: { $sum: 1 } } }
        ]);
        console.log('Hierarchy Mapping Counts:');
        catCounts.forEach(g => {
            console.log(`  ${g._id.cat} -> ${g._id.sub}: ${g.count}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    }
}

verifySync();
