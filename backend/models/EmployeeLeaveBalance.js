/**
 * @file EmployeeLeaveBalance.js
 * @description Mongoose EmployeeLeaveBalance Schema & Data Model.
 */

const mongoose = require('mongoose');

const employeeLeaveBalanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  leaveType: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveType', required: true },
  totalAllocated: { type: Number, required: true, default: 0, min: 0 },
  used: { type: Number, required: true, default: 0, min: 0 },
  remaining: { type: Number, required: true, default: 0, min: 0 }
}, { timestamps: true });

employeeLeaveBalanceSchema.index({ employee: 1, leaveType: 1 }, { unique: true });

module.exports = mongoose.model('EmployeeLeaveBalance', employeeLeaveBalanceSchema);
