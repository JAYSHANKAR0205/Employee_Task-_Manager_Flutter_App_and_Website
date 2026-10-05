/**
 * @file leaveService.js
 * @description Business Logic Helper for Leave Date Calculations & Overlap Detection.
 */

const LeaveType = require('../models/LeaveType');
const EmployeeLeaveBalance = require('../models/EmployeeLeaveBalance');
const LeaveRequest = require('../models/LeaveRequest');

/**
 * Calculates inclusive calendar days between startDate and endDate in UTC.
 */
const calculateLeaveDays = (startDateInput, endDateInput) => {
  const start = new Date(startDateInput);
  const end = new Date(endDateInput);

  const startUtc = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());

  const diffTime = endUtc - startUtc;
  if (diffTime < 0) return 0;
  
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

/**
 * Checks if the specified employee has an active (Pending or Approved) leave request overlapping with [startDate, endDate].
 */
const checkOverlappingLeave = async (employeeId, startDateInput, endDateInput, excludeRequestId = null) => {
  const start = new Date(startDateInput);
  const end = new Date(endDateInput);

  const startUtc = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 0, 0, 0, 0));
  const endUtc = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), 23, 59, 59, 999));

  const query = {
    employee: employeeId,
    status: { $in: ['Pending', 'Approved'] },
    startDate: { $lte: endUtc },
    endDate: { $gte: startUtc }
  };

  if (excludeRequestId) {
    query._id = { $ne: excludeRequestId };
  }

  const existing = await LeaveRequest.findOne(query).populate('leaveType', 'name');
  return existing;
};

/**
 * Ensures an employee has balance records for all active leave types.
 */
const ensureEmployeeBalances = async (employeeId) => {
  const activeLeaveTypes = await LeaveType.find({ isActive: true });
  for (const lt of activeLeaveTypes) {
    const existing = await EmployeeLeaveBalance.findOne({
      employee: employeeId,
      leaveType: lt._id
    });

    if (!existing) {
      await EmployeeLeaveBalance.create({
        employee: employeeId,
        leaveType: lt._id,
        totalAllocated: lt.defaultAllocation,
        used: 0,
        remaining: lt.defaultAllocation
      });
    }
  }
};

module.exports = {
  calculateLeaveDays,
  checkOverlappingLeave,
  ensureEmployeeBalances
};
