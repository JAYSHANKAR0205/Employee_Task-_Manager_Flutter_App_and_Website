/**
 * @file userRoutes.js
 * @description Express User Management & Avatar Upload Route Definitions.
 * 
 * WORK OF THIS FILE:
 * - Maps HTTP endpoints under `/api/users` (`/employees`, `/:id/block`, `/:id/role`, `/:id`, `/profile-picture`).
 * - Applies `protect` and `adminOnly` middleware to enforce role-based access control on employee management routes.
 * - Integrates Multer upload middleware on `/profile-picture` to handle Cloudinary avatar uploads.
 * 
 * WHY IS IT IN THE FILE STRUCTURE:
 * - Defines dedicated API routes for employee administration and avatar uploads separate from main authentication flows.
 */

const express = require('express');
const router = express.Router();
const { getEmployees, toggleBlockUser, updateUserRole, deleteEmployee, uploadProfilePicture, updateEmployeeByAdmin } = require('../controllers/userController');
const { forgotPassword, resetPassword, login, register, getUserProfile } = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Public auth aliases under /api/users
router.post('/login', login);
router.post('/register', register);
router.get('/me', protect, getUserProfile);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Admin routes
router.get('/employees', protect, adminOnly, getEmployees);
router.put('/:id/block', protect, adminOnly, toggleBlockUser);
router.put('/:id/role', protect, adminOnly, updateUserRole);
router.put('/:id', protect, adminOnly, updateEmployeeByAdmin);
router.delete('/:id', protect, adminOnly, deleteEmployee);

// User routes
router.post('/profile-picture', protect, upload.single('image'), uploadProfilePicture);

module.exports = router;
