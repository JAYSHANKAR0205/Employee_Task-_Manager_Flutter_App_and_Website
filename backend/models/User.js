/**
 * @file User.js
 * @description Mongoose User Schema & Data Model.
 * 
 * WORK OF THIS FILE:
 * - Defines user document schema (firstName, lastName, email, phoneNumber, password, dateOfBirth, gender, qualification, bio, role, profilePicture).
 * - Enforces strict server-side validation rules (regex, length, email domain formatting, phone standards).
 * - Implements pre-save hooks to automatically hash user passwords via bcrypt before persisting to MongoDB.
 * 
 * WHY IS IT IN THE FILE STRUCTURE:
 * - Establishes the authoritative database schema and data integrity constraints for all user accounts across the platform.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

/**
 * Define the User Schema
 * Contains all fields and their specific validation logic (mirroring the frontend rules).
 */
const userSchema = new mongoose.Schema({
  // First Name Configuration
  firstName: { 
    type: String,
    required: function() { return this.isProfileComplete !== false; }, 
    minLength: [2, 'First Name must contain at least 2 characters.'], 
    maxLength: [50, 'First Name cannot exceed 30 characters.'],
    validate: [
      { validator: function(v) { return !/\s/.test(v); }, message: 'Spaces are not allowed in First Name.' },
      { validator: function(v) { return /^[A-Za-z\-\']+$/.test(v); }, message: "Only letters, hyphens (-), and apostrophes (') are allowed." },
      { validator: function(v) { return !/--|''|'-|-'/.test(v); }, message: 'First Name cannot contain consecutive special characters.' },
      { validator: function(v) { return !/^[\-\']|[\-\']$/.test(v); }, message: 'First Name cannot start or end with a hyphen or apostrophe.' }
    ]
  },
  // Last Name Configuration
  lastName: { 
    type: String,
    required: function() { return this.isProfileComplete !== false; }, 
    minLength: [2, 'Last Name must contain at least 2 characters.'], 
    maxLength: [50, 'Last Name cannot exceed 30 characters.'],
    validate: [
      { validator: function(v) { return !/^\s|\s$/.test(v); }, message: 'Leading or trailing spaces are not allowed.' },
      { validator: function(v) { return !/\s{2,}/.test(v); }, message: 'Multiple spaces are not allowed.' },
      { validator: function(v) { return /^[A-Za-z\s\-\']+$/.test(v); }, message: "Only letters, single spaces, hyphens (-), and apostrophes (') are allowed." },
      { validator: function(v) { return !/--|''|'-|-'/.test(v); }, message: 'Last Name cannot contain consecutive special characters.' },
      { validator: function(v) { return !/^[\-\']|[\-\']$/.test(v); }, message: 'Last Name cannot start or end with a hyphen or apostrophe.' }
    ]
  },
  // Email Configuration (Strict Format Rules)
  email: { 
    type: String, 
    required: true, 
    unique: true, // Prevents duplicate emails in the database
    lowercase: true, // Automatically converts to lowercase
    trim: true,
    maxLength: [254, 'Enter a valid email address.'], // RFC standard max length
    validate: [
      {
        validator: function(v) {
          if (!v) return false;
          
          // Reject spaces anywhere
          if (/\s/.test(v)) return false;

          // Reject Emojis / Unicode / SQL / HTML
          const securityPattern = /[\x00-\x1F<>'";=]|OR\b|AND\b/i;
          const nonAsciiPattern = /[^\x00-\x7F]/;
          if (securityPattern.test(v) || nonAsciiPattern.test(v)) return false;

          const parts = v.split('@');
          if (parts.length !== 2) return false;

          const localPart = parts[0];
          const domainPart = parts[1];

          if (localPart.length === 0 || localPart.length > 64) return false;
          if (domainPart.length === 0 || domainPart.length > 253) return false;

          // Local part strict characters
          if (!/^[a-zA-Z0-9._\-+]+$/.test(localPart)) return false;

          // Reject consecutive or leading/trailing dots
          if (localPart.includes('..') || domainPart.includes('..')) return false;
          if (localPart.startsWith('.') || localPart.endsWith('.')) return false;

          if (!domainPart.includes('.')) return false;

          const domainLabels = domainPart.split('.');
          for (const label of domainLabels) {
            if (label.length === 0 || label.startsWith('-') || label.endsWith('-')) return false;
          }

          const parsedDomain = require('tldts').parse(domainPart);
          if (!parsedDomain.isIcann) return false;

          // Strict check for major providers to prevent typos like gmail.ashish.mc
          const domainPartLower = domainPart.toLowerCase();
          
          if (domainPartLower.includes('gmail')) {
            if (domainPartLower !== 'gmail.com') return false;
          }
          
          if (domainPartLower.includes('yahoo')) {
            const validYahoo = ['yahoo.com', 'yahoo.co.uk', 'yahoo.co.in', 'ymail.com'];
            if (!validYahoo.includes(domainPartLower)) return false;
          }

          if (domainPartLower.includes('outlook') || domainPartLower.includes('hotmail')) {
            const validMicrosoft = ['outlook.com', 'hotmail.com', 'live.com', 'msn.com'];
            if (!validMicrosoft.includes(domainPartLower)) return false;
          }

          return true;
        },
        message: 'Enter a valid email address.'
      }
    ]
  },
  // Phone Number Configuration (E.164 strict standard)
  phoneNumber: { 
    type: String, 
    required: function() { return this.isProfileComplete !== false; }, 
    unique: true,
    sparse: true,
    validate: [
      {
        validator: function(v) {
          if (!v) return true;
          
          // Reject HTML, JavaScript, SQL Injection
          const securityPattern = /[\x00-\x1F<>'";=]|OR\b|AND\b/i;
          if (securityPattern.test(v)) return false;

          try {
            const { parsePhoneNumberWithError } = require('libphonenumber-js/mobile');
            const phoneNumber = parsePhoneNumberWithError(v);
            return phoneNumber.isValid();
          } catch (error) {
            return false;
          }
        },
        message: 'Enter a valid phone number.'
      }
    ]
  },
  // Account status tracks if the user has successfully verified their OTP
  isVerified: { type: Boolean, default: false },
  // Google Auth tracking
  googleId: { type: String, sparse: true, unique: true },
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  // Refresh Token storage for active dual-token sessions
  refreshToken: { type: String },
  // Temporary storage for OTP tokens
  otp: { type: String },
  // Role based access
  role: { type: String, enum: ['Admin', 'Employee'], default: 'Employee' },
  // Admin control to block user
  isBlocked: { type: Boolean, default: false },
  // Tracks if the user profile is fully complete (false for Admin-created users until they finish setup)
  isProfileComplete: { type: Boolean, default: true },
  // Tracks if the user was created by an admin
  isCreatedByAdmin: { type: Boolean, default: false },
  // Cloudinary profile picture URL
  profilePicture: { type: String },
  // Forgot Password OTP lockout tracking
  forgotPasswordAttempts: { type: Number, default: 0 },
  forgotPasswordBlockedUntil: { type: Date, default: null },
  // Password Configuration (Complexity Rules)
  password: { 
    type: String, 
    required: function() { return this.authProvider === 'local'; }, 
    validate: [
      { 
        validator: function(v) { 
          if (!v) return true;
          // Skip complexity check if already hashed by bcrypt
          if (v.startsWith('$2b$') || v.startsWith('$2a$')) return true;
          return /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/.test(v); 
        }, 
        message: 'Password contain:\n-One uppercase,\n-One lowercase, -One number,\n-One special character.' 
      }
    ]
  },
  // Date of Birth (Ensures no future dates)
  dateOfBirth: { 
    type: Date, 
    required: function() { return this.isProfileComplete !== false; }, 
    validate: {
      validator: function(value) { if (!value) return true; return value <= new Date(); }, 
      message: 'Please enter valid date.' 
    }
  },
  // Gender
  gender: { type: String, required: function() { return this.isProfileComplete !== false; }, enum: ['Male', 'Female', 'Other'] },
  // Qualification
  qualification: { type: String, required: function() { return this.isProfileComplete !== false; }, enum: ['10th', '12th', 'Graduation', 'Post Graduation', 'PhD', 'Other', "Bachelor's", "Master's"] },
  // Bio (Optional)
  bio: { 
    type: String, 
    maxLength: [500, 'Bio cannot exceed 500 characters'],
    validate: [
      {
        validator: function(v) { if (!v) return true; return !/\s{2,}/.test(v); },
        message: 'Bio cannot contain continuous spaces.'
      },
      {
        validator: function(v) { if (!v) return true; return /^[a-zA-Z0-9\s,.\-()]*$/.test(v); },
        message: 'Only letters, numbers, spaces, commas, hyphens (-), brackets (), and full stops (.) are allowed in Bio.'
      }
    ]
  }
}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields

/**
 * Pre-save Middleware hook
 * This runs automatically right before any user document is saved to MongoDB.
 * It hashes the password for security if the password field has been modified or is new.
 */
userSchema.pre('save', async function() {
  if (!this.phoneNumber) {
    this.phoneNumber = undefined;
  }
  if (!this.googleId) {
    this.googleId = undefined;
  }
  if (this.isModified('password') && this.password) {
    // Hash password with a salt round of 10
    this.password = await bcrypt.hash(this.password, 10);
  }
});

module.exports = mongoose.model('User', userSchema);
