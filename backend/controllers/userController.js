/**
 * @file userController.js
 * @description Administrative User Operations & Cloudinary Avatar Controller.
 * 
 * WORK OF THIS FILE:
 * - Provides administrative operations: `getEmployees`, `toggleBlockUser`, `updateUserRole`, `deleteEmployee`.
 * - Handles file upload completion (`uploadProfilePicture`), saving the Cloudinary CDN image URL to the user document.
 * 
 * WHY IS IT IN THE FILE STRUCTURE:
 * - Separates admin-level user management and avatar file upload handlers from general authentication logic.
 */

const User = require('../models/User');
const { UserArchive } = require('../models/Archive');
const upload = require('../middleware/uploadMiddleware');
const { notifyEvent } = require('../services/notificationService');

// Get all employees (Admins only)
exports.getEmployees = async (req, res) => {
  try {
    const employees = await User.find({ role: 'Employee' }).select('-password -otp -refreshToken');
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
};

// Toggle block status (Admins only)
exports.toggleBlockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'Admin') {
      return res.status(403).json({ error: 'Cannot block an Admin' });
    }

    const willBeBlocked = !user.isBlocked;
    const updateObj = willBeBlocked 
      ? { $set: { isBlocked: true }, $unset: { refreshToken: 1 } }
      : { $set: { isBlocked: false } };

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateObj,
      { new: true }
    );

    // Trigger Non-blocking Real-time Notification & Email Alerts
    notifyEvent({
      eventType: updatedUser.isBlocked ? 'USER_BLOCKED' : 'USER_UNBLOCKED',
      actor: req.user,
      targetUser: updatedUser,
      link: '/profile'
    });

    res.json({ 
      message: `User has been ${updatedUser.isBlocked ? 'blocked' : 'unblocked'}`, 
      user: { id: updatedUser._id, isBlocked: updatedUser.isBlocked } 
    });
  } catch (error) {
    console.error('toggleBlockUser error:', error);
    res.status(500).json({ error: error.message || 'Failed to toggle block status' });
  }
};

// Change user role (Admins only)
exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['Admin', 'Employee'].includes(role)) {
      return res.status(400).json({ error: 'Role must be either Admin or Employee' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: { role } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: `User role updated to ${role}`, user: { id: updatedUser._id, role: updatedUser.role } });
  } catch (error) {
    console.error('updateUserRole error:', error);
    res.status(500).json({ error: error.message || 'Failed to update user role' });
  }
};

// Delete employee with archive (Admins only)
exports.deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'Admin') {
      return res.status(403).json({ error: 'Admins cannot be deleted' });
    }

    // Archive the user data
    await UserArchive.create({
      originalId: user._id,
      data: user.toObject(),
      deletedBy: req.user._id
    });

    // Hard delete
    await User.findByIdAndDelete(id);

    // Trigger Non-blocking Real-time Notification & Email Alerts
    notifyEvent({
      eventType: 'USER_DELETED',
      actor: req.user,
      targetUser: user,
      link: '/profile'
    });

    res.json({ message: 'Employee archived and deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete employee' });
  }
};

// Upload profile picture (Any authenticated user)
exports.uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const user = await User.findById(req.user._id);
    user.profilePicture = req.file.path; // Cloudinary URL
    await user.save();

    // Trigger Non-blocking Real-time Notification & Email Alerts
    notifyEvent({
      eventType: 'PROFILE_PICTURE_UPDATED',
      actor: user,
      link: '/profile'
    });

    res.json({ message: 'Profile picture updated', profilePicture: user.profilePicture });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
};

// Update employee personal details (Admins only)
exports.updateEmployeeByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, phoneNumber, dateOfBirth, gender, qualification, bio, profilePic, profilePicture } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (email && email.toLowerCase() !== user.email.toLowerCase()) {
      const emailExists = await User.findOne({ email: email.toLowerCase(), _id: { $ne: id } });
      if (emailExists) return res.status(400).json({ error: 'Email address already exists for another user.' });
      user.email = email.toLowerCase();
    }

    if (phoneNumber && phoneNumber !== user.phoneNumber) {
      const phoneExists = await User.findOne({ phoneNumber, _id: { $ne: id } });
      if (phoneExists) return res.status(400).json({ error: 'Phone number already exists for another user.' });
      user.phoneNumber = phoneNumber;
    }

    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;
    if (gender !== undefined) user.gender = gender;
    if (qualification !== undefined) user.qualification = qualification;
    if (bio !== undefined) user.bio = bio;
    const cloudinary = require('../utils/cloudinary');
    if (profilePic !== undefined || profilePicture !== undefined) {
      const newPic = profilePic !== undefined ? profilePic : profilePicture;
      if (newPic === null || newPic === '') {
        if (user.profilePicture && typeof user.profilePicture === 'string' && user.profilePicture.includes('cloudinary.com')) {
          try {
            const urlParts = user.profilePicture.split('/');
            const fileWithExt = urlParts[urlParts.length - 1];
            const folderName = urlParts[urlParts.length - 2];
            const publicId = `${folderName}/${fileWithExt.split('.')[0]}`;
            await cloudinary.uploader.destroy(publicId);
          } catch (cErr) {
            console.error('Failed to destroy Cloudinary avatar:', cErr);
          }
        }
        user.profilePicture = null;
      } else if (typeof newPic === 'string' && newPic.startsWith('data:image/')) {
        try {
          if (user.profilePicture && typeof user.profilePicture === 'string' && user.profilePicture.includes('cloudinary.com')) {
            try {
              const urlParts = user.profilePicture.split('/');
              const fileWithExt = urlParts[urlParts.length - 1];
              const folderName = urlParts[urlParts.length - 2];
              const publicId = `${folderName}/${fileWithExt.split('.')[0]}`;
              await cloudinary.uploader.destroy(publicId);
            } catch (e) {}
          }
          const uploadResult = await cloudinary.uploader.upload(newPic, {
            folder: 'employee_task_manager_profiles'
          });
          user.profilePicture = uploadResult.secure_url;
        } catch (uploadErr) {
          console.error('Cloudinary upload error, falling back:', uploadErr);
          user.profilePicture = newPic;
        }
      } else {
        user.profilePicture = newPic;
      }
    }

    const updatedUser = await user.save();
    
    // Save snapshot to archive
    try {
      await UserArchive.create({
        originalId: updatedUser._id,
        data: updatedUser.toObject(),
        deletedBy: req.user._id
      });
    } catch(e) {}

    // Trigger Non-blocking Real-time Notification & Email Alerts
    notifyEvent({
      eventType: 'PROFILE_UPDATED_BY_ADMIN',
      actor: req.user,
      targetUser: updatedUser,
      link: '/profile'
    });

    const result = updatedUser.toObject();
    delete result.password;
    delete result.otp;
    delete result.refreshToken;

    res.json({ message: 'Employee profile updated successfully by Admin', user: result });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to update employee profile' });
  }
};

