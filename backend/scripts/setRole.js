require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const email = process.argv[2];
const role = process.argv[3] || 'Admin';

if (!email) {
  console.log('\nUsage: node scripts/setRole.js <user_email> [Admin|Employee]\nExample: node scripts/setRole.js admin@gmail.com Admin\n');
  process.exit(1);
}

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/registration_db';

mongoose.connect(mongoUri)
  .then(async () => {
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      console.error(`User with email "${email}" not found in database.`);
      process.exit(1);
    }
    user.role = role;
    if (role === 'Admin') {
      user.isVerified = true;
    }
    await user.save();
    console.log(`\nSuccess! Updated user ${user.email} (${user.firstName} ${user.lastName}) role to "${role}".\n`);
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
