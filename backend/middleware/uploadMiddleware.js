/**
 * @file uploadMiddleware.js
 * @description Multer Storage Middleware for Cloudinary Avatar Uploads.
 * 
 * WORK OF THIS FILE:
 * - Configures `multer-storage-cloudinary` to intercept incoming image files from `multipart/form-data` requests.
 * - Streams uploaded images directly to the Cloudinary cloud storage folder `employee_task_manager_profiles`.
 * - Restricts uploads to permitted image formats (`jpg`, `jpeg`, `png`, `webp`).
 * 
 * WHY IS IT IN THE FILE STRUCTURE:
 * - Acts as an Express middleware for file uploads, decoupling file binary parsing and Cloudinary API streaming from route controllers.
 */

const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../utils/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'employee_task_manager_profiles', // Cloudinary folder name
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});

const upload = multer({ storage: storage });

module.exports = upload;
