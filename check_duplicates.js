
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb://localhost:27017/aonetarget');
  const db = mongoose.connection.db;
  
  const query = { $or: [{ name: /Organic Chemistry/i }, { title: /Organic Chemistry/i }] };
  
  const courses = await db.collection('courses').find(query).toArray();
  const packages = await db.collection('packages').find(query).toArray();
  
  console.log('--- COURSES ---');
  courses.forEach(c => console.log(`ID: ${c.id || c._id}, Name: ${c.name || c.title}, Price: ${c.price}, MRP: ${c.mrp || c.originalPrice}`));
  
  console.log('--- PACKAGES ---');
  packages.forEach(p => console.log(`ID: ${p.id || p._id}, Name: ${p.name || p.title}, Price: ${p.price}, MRP: ${p.mrp || p.originalPrice}`));
  
  process.exit(0);
}

check();
