const { MongoClient, ObjectId } = require('mongodb');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const URI = 'mongodb+srv://AONETARGET:ANILSHARMA123@cluster0.yvihcjy.mongodb.net/aonetarget?retryWrites=true&w=majority';
const ID = '69a02a184854be0efb3732ca';

async function check() {
    const client = new MongoClient(URI);
    try {
        await client.connect();
        const db = client.db('aonetarget');
        const course = await db.collection('courses').findOne({ _id: new ObjectId(ID) });
        console.log('---START---');
        console.log(JSON.stringify(course, null, 2));
        console.log('----END----');
    } catch (e) {
        console.error('ERROR:', e.message);
    } finally {
        await client.close();
    }
}

check();
