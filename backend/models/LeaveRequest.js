/**
 * @file LeaveRequest.js
 * @description Mongoose LeaveRequest Schema & Data Model.
 */

const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  leaveType: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveType', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  numberOfDays: { type: Number, required: true, min: 1 },
  reason: { 
    type: String, 
    required: [true, 'Reason is required.'], 
    trim: true,
    maxLength: [500, 'Reason cannot exceed 500 characters.'],
    validate: [
      {
        validator: function(v) {
          if (!v) return false;
          return /^[a-zA-Z0-9\s]+$/.test(v);
        },
        message: 'Reason can only contain letters, numbers, and spaces. Special characters are not allowed.'
      }
    ]
  },
  status: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'], 
    default: 'Pending' 
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectedAt: { type: Date },
  rejectionReason: { type: String },
  cancelledAt: { type: Date }
}, { timestamps: true });

leaveRequestSchema.index({ employee: 1, status: 1 });
leaveRequestSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
