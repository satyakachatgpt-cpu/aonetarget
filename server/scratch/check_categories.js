import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

const checkDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI, {
            dbName: 'aonetarget',
        });
        console.log('Connected to DB');

        const db = mongoose.connection.db;

        const categories = await db.collection('categories').find({}).toArray();
        console.log(`Categories found: ${categories.length}`);
        categories.forEach(c => {
            console.log(`- ${c.title} (${c.id})`);
            if (c.subcategories && c.subcategories.length > 0) {
                console.log(`  Embedded Subcategories: ${c.subcategories.length}`);
                c.subcategories.forEach(s => console.log(`    * ${s.title} (${s.id})`));
            }
        });

        const subcategories = await db.collection('subcategories').find({}).toArray();
        console.log(`\nSeparate Subcategories collection: ${subcategories.length} records`);
        subcategories.forEach(s => console.log(`- ${s.title} (Parent Category: ${s.categoryId})`));

        const subjects = await db.collection('subjects').find({}).toArray();
        console.log(`\nSubjects found: ${subjects.length}`);
        subjects.forEach(s => console.log(`- ${s.name} (Course: ${s.course})`));

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
};

checkDB();
