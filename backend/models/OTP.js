/**
 * @file OTP.js
 * @description Mongoose OTP Schema & TTL Index Model.
 * 
 * WORK OF THIS FILE:
 * - Defines temporary OTP documents holding 6-digit codes, verification purpose (`registration`, `forgot_password`, etc.), and draft registration data.
 * - Configures a MongoDB Time-To-Live (TTL) index (`expires: 600`) that automatically deletes OTP documents after 10 minutes (600 seconds).
 * 
 * WHY IS IT IN THE FILE STRUCTURE:
 * - Provides secure temporary database storage for two-factor verification codes, ensuring stale OTPs automatically purge without manual background cron jobs.
 */

const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    lowercase: true,
    trim: true,
    index: true,
  },
  phoneNumber: {
    type: String,
    trim: true,
    index: true,
  },
  otp: {
    type: String,
    required: true,
  },
  purpose: {
    type: String,
    enum: ['registration', 'forgot_password', 'email_verification', 'phone_verification', 'otp_lockout'],
    required: true,
  },
  // Holds pending registration details prior to OTP verification
  tempRegistrationData: {
    type: Object,
    default: null,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  blockedUntil: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600, // Automatic MongoDB TTL index: expires document after 10 minutes (600s)
  },
});

module.exports = mongoose.model('OTP', otpSchema);
