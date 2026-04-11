const mongoose = require('mongoose');
const http = require('http');

const MONGODB_URI = 'mongodb+srv://AONETARGET:ANILSHARMA123@cluster0.yvihcjy.mongodb.net/aonetarget';
const API_BASE = 'http://localhost:5000/api';

async function fetchAPI(path) {
  return new Promise((resolve, reject) => {
    http.get(`${API_BASE}${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
          try {
              resolve(JSON.parse(data));
          } catch(e) {
              reject(new Error('Failed to parse JSON: ' + data.substring(0, 100)));
          }
      });
    }).on('error', reject);
  });
}

async function verify() {
  console.log('Connecting to MongoDB...');
  try {
    await mongoose.connect(MONGODB_URI, { dbName: 'aonetarget', serverSelectionTimeoutMS: 5000 });
    const db = mongoose.connection.db;
    console.log('Connected to Atlas.');

    const counts = {
      categories: await db.collection('categories').countDocuments(),
      subcategories: await db.collection('subcategories').countDocuments(),
      subjects: await db.collection('subjects').countDocuments(),
    };
    console.log('\n--- [1] DATABASE COUNTS ---');
    console.log(JSON.stringify(counts, null, 2));

    console.log('\n--- [1] CATEGORY-WISE LISTING ---');
    const sections = ['neet', 'iit-jee', '11th-12th', 'foundation', 'nursing-cet'];
    for (const section of sections) {
        const subs = await db.collection('subcategories').find({ categoryId: section }).toArray();
        console.log(`\nParent Category ID: ${section} (${subs.length} subcategories)`);
        subs.sort((a,b) => (a.order || 0) - (b.order || 0)).forEach(s => console.log(`  - ${s.title} (ID: ${s.id})`));
    }

    console.log('\n--- [2] API EVIDENCE ---');
    try {
        const cats = await fetchAPI('/categories');
        console.log('Sample Category API Response:', JSON.stringify(cats[0], null, 2));

        const subs = await fetchAPI('/subcategories');
        console.log('Sample Subcategory API Response:', JSON.stringify(subs[0], null, 2));

        const subjs = await fetchAPI('/subjects');
        console.log('Sample Subject API Response:', JSON.stringify(subjs[0], null, 2));

        console.log('\n--- [2] COMPLETE HIERARCHY CHAIN EXAMPLE ---');
        const chainCat = cats.find(c => c.id === 'neet');
        const chainSub = subs.find(s => s.categoryId === 'neet' && s.id === 'recorded_batch');
        const chainSubj = subjs.find(sj => sj.course === 'neet' && sj.id === 'biology');
        console.log(`Chain: ${chainCat.title} (${chainCat.id}) -> ${chainSub.title} (${chainSub.id}) -> Subject: ${chainSubj.name} (${chainSubj.id})`);
    } catch (e) {
        console.log('API Evidence could not be fetched:', e.message);
    }

    console.log('\n--- [3] DUPLICATE RECORDS CHECK ---');
    const allSubs = await db.collection('subcategories').find().toArray();
    
    // Check duplicate IDs under same category
    const subPairs = allSubs.map(s => `${s.categoryId}_${s.id}`);
    const dupSubPairs = subPairs.filter((item, index) => subPairs.indexOf(item) !== index);
    console.log('- Duplicate Subcategory IDs (Category_ID):', dupSubPairs.length ? dupSubPairs : 'None');

    // Check duplicate Slugs/IDs globally
    const subIds = allSubs.map(s => s.id);
    // Actually duplicates across categories are OK (e.g. 'recorded_batch' in neet and jee)
    
    const allSubjs = await db.collection('subjects').find().toArray();
    const subjPairs = allSubjs.map(s => `${s.course}_${s.id}`);
    const dupSubjPairs = subjPairs.filter((item, index) => subjPairs.indexOf(item) !== index);
    console.log('- Duplicate Subject Unique IDs (Course_ID):', dupSubjPairs.length ? dupSubjPairs : 'None');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

verify();
