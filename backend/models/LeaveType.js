/**
 * @file LeaveType.js
 * @description Mongoose LeaveType Schema & Data Model.
 */

const mongoose = require('mongoose');

const leaveTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '' },
  defaultAllocation: { type: Number, required: true, default: 0, min: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('LeaveType', leaveTypeSchema);
