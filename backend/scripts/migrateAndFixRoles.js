require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const atlasBaseUri = process.env.ATLAS_MONGODB_URI || process.env.MONGODB_URI;
const options = process.env.ATLAS_MONGODB_OPTIONS || "?ssl=true&replicaSet=atlas-bb6gqt-shard-0&authSource=admin&appName=Jayshankar";

if (!atlasBaseUri) {
  console.error("Error: Please set ATLAS_MONGODB_URI or MONGODB_URI in your .env file or environment variables.");
  process.exit(1);
}

async function run() {
  try {
    console.log("Connecting to MongoDB Atlas...");
    
    // Connect to test database
    const testConn = await mongoose.createConnection(`${atlasBaseUri}/test${options}`).asPromise();
    const testUsers = await testConn.db.collection('users').find({}).toArray();
    console.log(`Found ${testUsers.length} user(s) in 'test' database.`);

    // Connect to registration_db database
    const regConn = await mongoose.createConnection(`${atlasBaseUri}/registration_db${options}`).asPromise();
    const regUsersCol = regConn.db.collection('users');

    for (const u of testUsers) {
      if (!u.role) {
        u.role = 'Employee';
      }
      await regUsersCol.updateOne(
        { _id: u._id },
        { $set: u },
        { upsert: true }
      );
      console.log(`- Copying/Updating user ${u.email} -> Role: ${u.role}`);
    }

    // Ensure all documents in registration_db have explicit role field
    const res = await regUsersCol.updateMany(
      { role: { $exists: false } },
      { $set: { role: 'Employee' } }
    );
    console.log(`Set role='Employee' for ${res.modifiedCount} documents lacking explicit role field.`);

    console.log("\nMigration & Role sync completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Migration error:", err.message);
    process.exit(1);
  }
}

run();
