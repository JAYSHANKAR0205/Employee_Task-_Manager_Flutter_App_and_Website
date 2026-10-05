/**
 * @file cloudinary.js
 * @description Cloudinary v2 SDK Configuration Utility.
 * 
 * WORK OF THIS FILE:
 * - Initializes and configures the Cloudinary v2 SDK using environment variables (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`).
 * - Exports the configured Cloudinary instance for use by Multer storage engines and upload controllers.
 * 
 * WHY IS IT IN THE FILE STRUCTURE:
 * - Centralizes third-party Cloudinary API authentication and SDK initialization in a single utility module.
 */

const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

module.exports = cloudinary;
