const mongoose = require('mongoose');

const users = ['AONETARGET', 'aonetarget'];
const passes = ['SACHIN123', 'Sachin123', 'sachin123', 'SACHIN%40123', 'Sachin%40123', 'SACHIN_123', 'ANILSHARMA123', 'AnilSharma123', 'anilsharma123', 'ANIL%40123', 'Anil%40123', 'ANIL_123'];

async function test() {
  for (const u of users) {
    for (const p of passes) {
      const uri = `mongodb://${u}:${p}@ac-a73wuln-shard-00-00.yvihcjy.mongodb.net:27017,ac-a73wuln-shard-00-01.yvihcjy.mongodb.net:27017,ac-a73wuln-shard-00-02.yvihcjy.mongodb.net:27017/aonetarget?authSource=admin&replicaSet=atlas-u28wzo-shard-0&tls=true`;
      try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
        console.log(`SUCCESS with user: ${u}, pass: ${p}`);
        process.exit(0);
      } catch (err) {}
    }
  }
  console.log('ALL FAILED');
  process.exit(1);
}

test();
