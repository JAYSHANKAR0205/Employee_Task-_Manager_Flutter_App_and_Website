require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const email = process.argv[2] || process.env.ADMIN_EMAIL;
const password = process.argv[3] || process.env.ADMIN_PASSWORD;
const firstName = process.argv[4] || process.env.ADMIN_FIRST_NAME || 'Admin';
const lastName = process.argv[5] || process.env.ADMIN_LAST_NAME || 'User';

if (!email || !password) {
  console.log('\nUsage: node scripts/createAdmin.js <email> <password> [firstName] [lastName]');
  console.log('Or set ADMIN_EMAIL and ADMIN_PASSWORD in your .env file.\n');
  process.exit(1);
}

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/registration_db';

mongoose.connect(mongoUri)
  .then(async () => {
    const formattedEmail = email.trim().toLowerCase();
    let user = await User.findOne({ email: formattedEmail });
    
    if (user) {
      user.role = 'Admin';
      user.isVerified = true;
      user.password = password; // Will be hashed by pre-save hook
      await user.save();
      console.log(`\nSuccess! Updated existing user "${formattedEmail}" to Admin role.\n`);
    } else {
      user = new User({
        firstName,
        lastName,
        email: formattedEmail,
        password,
        role: 'Admin',
        isVerified: true,
        isProfileComplete: true
      });
      await user.save();
      console.log(`\nSuccess! Created new Admin account for "${formattedEmail}".\n`);
    }
    process.exit(0);
  })
  .catch(err => {
    console.error('Error creating/updating admin:', err.message);
    process.exit(1);
  });
