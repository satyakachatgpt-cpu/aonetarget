const { MongoClient } = require('mongodb');

async function check() {
  const client = new MongoClient('mongodb+srv://AONETARGET:SACHIN123@cluster0.yvihcjy.mongodb.net/aonetarget?retryWrites=true&w=majority');
  await client.connect();
  const db = client.db();
  
  const batchId = 'req.body.batchId'; // We don't have exactly the ID, we'll just check what's in the DB.
  const students = await db.collection('students').find({}).toArray();
  const notifications = await db.collection('notifications').find({}).sort({_id:-1}).limit(10).toArray();

  console.log(`Total active students in DB: ${students.length}`);
  
  if (notifications.length > 0) {
    console.log("Latest notification inserted:");
    console.log(JSON.stringify(notifications[0], null, 2));
    
    // Check how many students have that batchId in enrolledCourses
    const bId = notifications[0].batchId || notifications[0].targetCourseId;
    if (bId) {
        const enrolled = students.filter(s => (s.enrolledCourses || []).includes(bId));
        console.log(`Students enrolled in batchId ${bId} (exact match): ${enrolled.length}`);
        
        let relatedMatches = 0;
        console.log("Let's look for partial matches...");
        // This is generic, just to see what their arrays look like
        console.log("Enrolled arrays of all students:");
        students.forEach(s => {
           console.log(s.email || s.phone, s.enrolledCourses); 
        });
    }
  }

  process.exit(0);
}

check().catch(console.error);
