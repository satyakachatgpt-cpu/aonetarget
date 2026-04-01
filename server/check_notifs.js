const { MongoClient } = require('mongodb');

async function run() {
  const uri = 'mongodb+srv://AONETARGET:ANILSHARMA123@cluster0.yvihcjy.mongodb.net/aonetarget?retryWrites=true&w=majority';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('aonetarget');
    
    console.log("Connected correctly to server");
    
    // Check recent notifications
    const recentNotifs = await db.collection('notifications')
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();
      
    console.log("Recent notifications:\n", JSON.stringify(recentNotifs.map(n => ({
      _id: n._id,
      userId: n.userId,
      batchId: n.batchId,
      message: n.message,
      createdAt: n.createdAt
    })), null, 2));

  } catch (err) {
    console.log(err.stack);
  } finally {
    await client.close();
  }
}

run();
