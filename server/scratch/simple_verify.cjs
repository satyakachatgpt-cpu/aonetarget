const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017';

async function verify() {
  console.log('Connecting to MongoDB...');
  try {
    await mongoose.connect(MONGODB_URI, { dbName: 'aonetarget', serverSelectionTimeoutMS: 5000 });
    const db = mongoose.connection.db;
    console.log('Connected.');

    const counts = {
      categories: await db.collection('categories').countDocuments(),
      subcategories: await db.collection('subcategories').countDocuments(),
      subjects: await db.collection('subjects').countDocuments(),
    };
    console.log('--- COUNTS ---');
    console.log(JSON.stringify(counts, null, 2));

    const cats = await db.collection('categories').find().toArray();
    console.log('--- CATEGORY-WISE SUB-LISTING ---');
    const sections = ['neet', '11th-12th', 'foundation', 'nursing-cet'];
    for (const section of sections) {
        const subs = await db.collection('subcategories').find({ categoryId: section }).toArray();
        console.log(`Category: ${section} -> ${subs.length} Subcategories`);
        subs.forEach(s => console.log(`  - ${s.title} (${s.id})`));
    }

    // Duplicate Check
    const allSubs = await db.collection('subcategories').find().toArray();
    const subIds = allSubs.map(s => s.id);
    const dupIds = subIds.filter((item, index) => subIds.indexOf(item) !== index);
    console.log('--- DUPLICATE CHECK ---');
    console.log('Duplicate IDs:', dupIds);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

verify();
