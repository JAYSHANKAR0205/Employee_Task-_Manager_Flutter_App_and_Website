/**
 * @file Notification.js
 * @description Mongoose Schema & Model for User System Notifications.
 */

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  title: { 
    type: String, 
    required: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  type: { 
    type: String, 
    enum: [
      'TASK_ASSIGNED', 'TASK_UPDATED', 'TASK_DELETED', 'SYSTEM', 'PROFILE_UPDATED',
      'LEAVE_APPLIED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_CANCELLED', 'INSUFFICIENT_BALANCE'
    ], 
    default: 'SYSTEM' 
  },
  link: { 
    type: String, 
    default: '/leaves' 
  },
  isRead: { 
    type: Boolean, 
    default: false 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
