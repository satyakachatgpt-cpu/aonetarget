
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();
    const tests = db.collection('tests');
    
    const allTests = await tests.find({ sortBy: { $exists: true } }).toArray();
    console.log(`Found ${allTests.length} tests with sortBy field.`);
    
    let migratedCount = 0;
    for (const t of allTests) {
      if (typeof t.sortBy === 'string') {
        const numeric = parseFloat(t.sortBy);
        if (!isNaN(numeric)) {
          await tests.updateOne({ _id: t._id }, { $set: { sortBy: numeric } });
          migratedCount++;
        }
      }
    }
    console.log(`Successfully migrated ${migratedCount} tests to numerical sortBy.`);
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.close();
  }
}

run();
