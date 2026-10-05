/**
 * @file Task.js
 * @description Mongoose Task Schema & Data Model.
 * 
 * WORK OF THIS FILE:
 * - Defines task document structure (`title`, `description`, `assignedTo`, `status`, `dueDate`, `priority`).
 * - Establishes relational reference (`ref: 'User'`) connecting assigned tasks to specific employee accounts.
 * 
 * WHY IS IT IN THE FILE STRUCTURE:
 * - Defines the MongoDB database schema for task management and assignment across employee and admin views.
 */

const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    validate: [
      {
        validator: function(v) { return v ? v.trim().length <= 100 : false; },
        message: 'Task title cannot exceed 100 characters'
      },
      {
        validator: function(v) { return !/\s{2,}/.test(v); },
        message: 'Task title cannot contain continuous spaces'
      },
      {
        validator: function(v) { return /^[a-zA-Z\s]*$/.test(v); },
        message: 'Task title cannot contain numbers or special characters'
      }
    ]
  },
  description: {
    type: String,
    required: [true, 'Task description is required'],
    trim: true,
    validate: [
      {
        validator: function(v) { return v ? v.trim().length <= 300 : false; },
        message: 'Task description cannot exceed 300 characters'
      },
      {
        validator: function(v) { return !/\s{2,}/.test(v); },
        message: 'Task description cannot contain continuous spaces'
      },
      {
        validator: function(v) { return /^[a-zA-Z0-9\s.,\-]*$/.test(v); },
        message: 'Task description cannot contain special characters other than commas, hyphens, and full stops'
      }
    ]
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Assignee is required'],
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Completed'],
    default: 'Pending',
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium',
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required'],
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  history: [{
    status: String,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now }
  }],
  attachments: [{
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileType: { type: String, enum: ['image', 'document'], default: 'document' },
    mimeType: { type: String },
    fileSize: { type: Number },
    publicId: { type: String },
    uploadedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

taskSchema.index({ assignedTo: 1, createdAt: -1 });
taskSchema.index({ status: 1, createdAt: -1 });
taskSchema.index({ priority: 1, createdAt: -1 });

// Transform _id to id for seamless frontend mapping
taskSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    if (Array.isArray(ret.attachments)) {
      ret.attachments = ret.attachments.map(att => {
        if (att && typeof att === 'object') {
          return {
            ...att,
            id: att._id ? att._id.toString() : (att.id || '')
          };
        }
        return att;
      });
    }
    return ret;
  }
});

module.exports = mongoose.model('Task', taskSchema);
