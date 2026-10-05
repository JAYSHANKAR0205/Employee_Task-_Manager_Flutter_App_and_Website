/**
 * @file leaveController.js
 * @description Controllers for Leave Applications, Balances, Approvals & Rejections.
 */

const mongoose = require('mongoose');
const LeaveType = require('../models/LeaveType');
const EmployeeLeaveBalance = require('../models/EmployeeLeaveBalance');
const LeaveRequest = require('../models/LeaveRequest');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { calculateLeaveDays, checkOverlappingLeave, ensureEmployeeBalances } = require('../services/leaveService');

// -------------------------------------------------------------
// EMPLOYEE CONTROLLERS
// -------------------------------------------------------------

/**
 * GET /api/leaves/balance
 * Returns leave balances for the authenticated caller.
 */
exports.getMyBalances = async (req, res) => {
  try {
    if (req.user.role === 'Admin') {
      return res.status(400).json({ error: 'Admins do not have personal leave balances.' });
    }

    await ensureEmployeeBalances(req.user._id);
    const balances = await EmployeeLeaveBalance.find({ employee: req.user._id })
      .populate('leaveType', 'name description defaultAllocation isActive')
      .sort({ createdAt: 1 });

    const validBalances = balances.filter(b => b.leaveType && b.leaveType.isActive !== false);
    return res.status(200).json({ balances: validBalances });
  } catch (error) {
    console.error('Get Balances Error:', error);
    return res.status(500).json({ error: 'Error retrieving leave balances' });
  }
};

/**
 * GET /api/leaves/my-requests
 * Returns leave request history for the authenticated caller.
 */
exports.getMyRequests = async (req, res) => {
  try {
    if (req.user.role === 'Admin') {
      return res.status(200).json({
        requests: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 1, hasMore: false }
      });
    }

    const isAll = req.query.all === 'true';
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const { status } = req.query;
    const query = { employee: req.user._id };
    if (status && status !== 'All') query.status = status;

    if (isAll) {
      const requests = await LeaveRequest.find(query)
        .populate('leaveType', 'name')
        .populate('approvedBy', 'firstName lastName email')
        .populate('rejectedBy', 'firstName lastName email')
        .sort({ createdAt: -1 });

      return res.status(200).json({
        requests,
        pagination: {
          page: 1,
          limit: requests.length,
          total: requests.length,
          totalPages: 1,
          hasMore: false
        }
      });
    }

    const total = await LeaveRequest.countDocuments(query);
    const totalPages = Math.ceil(total / limit) || 1;
    const hasMore = page < totalPages;

    const requests = await LeaveRequest.find(query)
      .populate('leaveType', 'name')
      .populate('approvedBy', 'firstName lastName email')
      .populate('rejectedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore
      }
    });
  } catch (error) {
    console.error('Get My Requests Error:', error);
    return res.status(500).json({ error: 'Error retrieving leave requests' });
  }
};

/**
 * POST /api/leaves/apply
 * Submits a new leave request for the authenticated caller.
 */
exports.applyLeave = async (req, res) => {
  try {
    // Admins do NOT apply for leave
    if (req.user.role === 'Admin') {
      return res.status(403).json({ error: 'Admins cannot apply for leave. Only employees can submit leave requests.' });
    }

    const { leaveTypeId, startDate, endDate, reason } = req.body;
    const employeeId = req.user._id;

    // 1. Basic Field Validations
    if (!leaveTypeId || !startDate || !endDate || !reason) {
      return res.status(400).json({ error: 'Please provide Leave Type, Start Date, End Date, and Reason.' });
    }

    if (!mongoose.Types.ObjectId.isValid(leaveTypeId)) {
      return res.status(400).json({ error: 'Invalid Leave Type identifier.' });
    }

    const trimmedReason = reason.trim();
    if (trimmedReason.length === 0) {
      return res.status(400).json({ error: 'Reason cannot be empty or whitespace-only.' });
    }

    if (trimmedReason.length > 500) {
      return res.status(400).json({ error: 'Reason cannot exceed 500 characters.' });
    }

    // STRICT VALIDATION: Reason takes ONLY words or numbers and spaces (NO special characters!)
    const reasonPattern = /^[a-zA-Z0-9\s]+$/;
    if (!reasonPattern.test(trimmedReason)) {
      return res.status(400).json({ error: 'Reason can only contain letters, numbers, and spaces. Special characters are not allowed.' });
    }

    // 2. Validate Leave Type existence and active status
    const leaveType = await LeaveType.findById(leaveTypeId);
    if (!leaveType) {
      return res.status(404).json({ error: 'Selected Leave Type does not exist.' });
    }
    if (!leaveType.isActive) {
      return res.status(400).json({ error: `Leave Type '${leaveType.name}' is currently inactive.` });
    }

    // 3. Date Parsing & Validation
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date format provided.' });
    }

    const startUtc = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 0, 0, 0, 0));
    const endUtc = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), 23, 59, 59, 999));

    if (endUtc < startUtc) {
      return res.status(400).json({ error: 'End date must be greater than or equal to start date.' });
    }

    // Check past date
    const today = new Date();
    const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0));
    if (startUtc < todayUtc) {
      return res.status(400).json({ error: 'Cannot apply for leave starting in the past.' });
    }

    // 4. Calculate number of days
    const numberOfDays = calculateLeaveDays(startDate, endDate);
    if (numberOfDays <= 0) {
      return res.status(400).json({ error: 'Invalid leave duration calculated.' });
    }
    if (numberOfDays > 90) {
      return res.status(400).json({ error: 'Leave request exceeds maximum single duration limit of 90 days.' });
    }

    // 5. Overlap Check
    const overlapping = await checkOverlappingLeave(employeeId, startDate, endDate);
    if (overlapping) {
      const overlapStart = new Date(overlapping.startDate).toLocaleDateString();
      const overlapEnd = new Date(overlapping.endDate).toLocaleDateString();
      return res.status(409).json({
        error: `Overlapping leave request detected! You already have a ${overlapping.status} leave request (${overlapping.leaveType?.name || 'Leave'}) from ${overlapStart} to ${overlapEnd}.`
      });
    }

    // 6. Balance Check & Reservation Guidance
    await ensureEmployeeBalances(employeeId);
    let balance = await EmployeeLeaveBalance.findOne({ employee: employeeId, leaveType: leaveTypeId });
    if (!balance) {
      balance = await EmployeeLeaveBalance.create({
        employee: employeeId,
        leaveType: leaveTypeId,
        totalAllocated: leaveType.defaultAllocation,
        used: 0,
        remaining: leaveType.defaultAllocation
      });
    }

    let isInsufficient = false;
    let balanceMessage = '';
    if (numberOfDays > balance.remaining) {
      isInsufficient = true;
      balanceMessage = `Note: You requested ${numberOfDays} day(s), but only have ${balance.remaining} day(s) remaining for ${leaveType.name}. Request submitted as Pending for Admin review.`;
    }

    // 7. Create Leave Request
    const leaveRequest = await LeaveRequest.create({
      employee: employeeId,
      leaveType: leaveTypeId,
      startDate: startUtc,
      endDate: endUtc,
      numberOfDays,
      reason: trimmedReason,
      status: 'Pending'
    });

    // 8. Create Notification for Admin users
    const admins = await User.find({ role: 'Admin' }).select('_id');
    const notificationDocs = admins.map(admin => ({
      recipient: admin._id,
      sender: employeeId,
      title: 'New Leave Request',
      type: 'LEAVE_APPLIED',
      message: `New leave request submitted by ${req.user.firstName} ${req.user.lastName} for ${leaveType.name} (${numberOfDays} day(s)).`,
      link: '/admin/leaves'
    }));

    if (isInsufficient) {
      notificationDocs.push({
        recipient: employeeId,
        sender: employeeId,
        title: 'Insufficient Leave Balance Warning',
        type: 'INSUFFICIENT_BALANCE',
        message: `Your ${leaveType.name} request (${numberOfDays} days) exceeds available balance (${balance.remaining} days). Pending admin decision.`,
        link: '/leaves'
      });
    }

    if (notificationDocs.length > 0) {
      await Notification.insertMany(notificationDocs);
    }

    const populatedRequest = await LeaveRequest.findById(leaveRequest._id)
      .populate('leaveType', 'name')
      .populate('employee', 'firstName lastName email');

    return res.status(201).json({
      message: 'Leave request submitted successfully.',
      isInsufficient,
      balanceMessage,
      request: populatedRequest
    });

  } catch (error) {
    console.error('Apply Leave Error:', error);
    return res.status(500).json({ error: error.message || 'Server error while applying for leave' });
  }
};

/**
 * PATCH /api/leaves/:id/cancel
 * Allows an employee to cancel their own Pending request.
 */
exports.cancelLeave = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid leave request ID.' });
    }

    const leaveRequest = await LeaveRequest.findById(id);
    if (!leaveRequest) {
      return res.status(404).json({ error: 'Leave request not found.' });
    }

    if (leaveRequest.employee.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized. You can only cancel your own leave requests.' });
    }

    if (leaveRequest.status !== 'Pending') {
      return res.status(400).json({ error: `Cannot cancel a leave request with status '${leaveRequest.status}'.` });
    }

    leaveRequest.status = 'Cancelled';
    leaveRequest.cancelledAt = new Date();
    await leaveRequest.save();

    return res.status(200).json({
      message: 'Leave request cancelled successfully.',
      request: leaveRequest
    });
  } catch (error) {
    console.error('Cancel Leave Error:', error);
    return res.status(500).json({ error: 'Server error while cancelling leave request' });
  }
};

// -------------------------------------------------------------
// ADMIN CONTROLLERS
// -------------------------------------------------------------

/**
 * GET /api/admin/leaves
 * Retrieves all leave requests with optional filters.
 */
exports.getAllRequests = async (req, res) => {
  try {
    const isAll = req.query.all === 'true';
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const { status, employeeId, leaveTypeId } = req.query;
    const query = {};

    if (status && status !== 'All') query.status = status;
    if (employeeId && mongoose.Types.ObjectId.isValid(employeeId)) query.employee = employeeId;
    if (leaveTypeId && mongoose.Types.ObjectId.isValid(leaveTypeId)) query.leaveType = leaveTypeId;

    if (isAll) {
      const requests = await LeaveRequest.find(query)
        .populate('employee', 'firstName lastName email phoneNumber profilePicture')
        .populate('leaveType', 'name description')
        .populate('approvedBy', 'firstName lastName email')
        .populate('rejectedBy', 'firstName lastName email')
        .sort({ createdAt: -1 });

      return res.status(200).json({
        requests,
        pagination: {
          page: 1,
          limit: requests.length,
          total: requests.length,
          totalPages: 1,
          hasMore: false
        }
      });
    }

    const total = await LeaveRequest.countDocuments(query);
    const totalPages = Math.ceil(total / limit) || 1;
    const hasMore = page < totalPages;

    const requests = await LeaveRequest.find(query)
      .populate('employee', 'firstName lastName email phoneNumber profilePicture')
      .populate('leaveType', 'name description')
      .populate('approvedBy', 'firstName lastName email')
      .populate('rejectedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore
      }
    });
  } catch (error) {
    console.error('Get All Requests Error:', error);
    return res.status(500).json({ error: 'Error retrieving leave requests' });
  }
};

/**
 * GET /api/admin/leaves/pending
 * Retrieves all pending leave requests for admin review queue.
 */
exports.getPendingRequests = async (req, res) => {
  try {
    const requests = await LeaveRequest.find({ status: 'Pending' })
      .populate('employee', 'firstName lastName email phoneNumber profilePicture')
      .populate('leaveType', 'name description')
      .sort({ createdAt: 1 });

    return res.status(200).json({ requests });
  } catch (error) {
    console.error('Get Pending Requests Error:', error);
    return res.status(500).json({ error: 'Error retrieving pending leave requests' });
  }
};

/**
 * PATCH /api/admin/leaves/:id/approve
 * Approves a pending leave request, deducting used/remaining leave balance.
 */
exports.approveLeave = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid leave request ID.' });
    }

    const leaveRequest = await LeaveRequest.findById(id).populate('leaveType', 'name');
    if (!leaveRequest) {
      return res.status(404).json({ error: 'Leave request not found.' });
    }

    if (leaveRequest.status !== 'Pending') {
      return res.status(400).json({ error: `Cannot approve. Request is currently '${leaveRequest.status}'.` });
    }

    await ensureEmployeeBalances(leaveRequest.employee);
    const balance = await EmployeeLeaveBalance.findOne({
      employee: leaveRequest.employee,
      leaveType: leaveRequest.leaveType._id
    });

    if (!balance) {
      return res.status(404).json({ error: 'Employee leave balance record not found.' });
    }

    const newUsed = balance.used + leaveRequest.numberOfDays;
    const newRemaining = Math.max(0, balance.remaining - leaveRequest.numberOfDays);

    balance.used = newUsed;
    balance.remaining = newRemaining;
    await balance.save();

    leaveRequest.status = 'Approved';
    leaveRequest.approvedBy = req.user._id;
    leaveRequest.approvedAt = new Date();
    await leaveRequest.save();

    const startFmt = new Date(leaveRequest.startDate).toLocaleDateString();
    const endFmt = new Date(leaveRequest.endDate).toLocaleDateString();
    await Notification.create({
      recipient: leaveRequest.employee,
      sender: req.user._id,
      title: 'Leave Request Approved',
      type: 'LEAVE_APPROVED',
      message: `Your ${leaveRequest.leaveType?.name || 'Leave'} request from ${startFmt} to ${endFmt} (${leaveRequest.numberOfDays} day(s)) has been APPROVED.`,
      link: '/leaves'
    });

    const updatedRequest = await LeaveRequest.findById(id)
      .populate('employee', 'firstName lastName email')
      .populate('leaveType', 'name')
      .populate('approvedBy', 'firstName lastName email');

    return res.status(200).json({
      message: 'Leave request approved successfully.',
      request: updatedRequest,
      balance: {
        totalAllocated: balance.totalAllocated,
        used: balance.used,
        remaining: balance.remaining
      }
    });

  } catch (error) {
    console.error('Approve Leave Error:', error);
    return res.status(500).json({ error: error.message || 'Server error while approving leave request' });
  }
};

/**
 * PATCH /api/admin/leaves/:id/reject
 * Rejects a pending leave request with a mandatory rejection reason.
 */
exports.rejectLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid leave request ID.' });
    }

    if (!rejectionReason || typeof rejectionReason !== 'string' || rejectionReason.trim().length === 0) {
      return res.status(400).json({ error: 'A valid rejection reason is required when rejecting a request.' });
    }

    const leaveRequest = await LeaveRequest.findById(id).populate('leaveType', 'name');
    if (!leaveRequest) {
      return res.status(404).json({ error: 'Leave request not found.' });
    }

    if (leaveRequest.status !== 'Pending') {
      return res.status(400).json({ error: `Cannot reject. Request is currently '${leaveRequest.status}'.` });
    }

    leaveRequest.status = 'Rejected';
    leaveRequest.rejectedBy = req.user._id;
    leaveRequest.rejectedAt = new Date();
    leaveRequest.rejectionReason = rejectionReason.trim();
    await leaveRequest.save();

    await Notification.create({
      recipient: leaveRequest.employee,
      sender: req.user._id,
      title: 'Leave Request Rejected',
      type: 'LEAVE_REJECTED',
      message: `Your ${leaveRequest.leaveType?.name || 'Leave'} request has been REJECTED. Reason: ${rejectionReason.trim()}`,
      link: '/leaves'
    });

    const updatedRequest = await LeaveRequest.findById(id)
      .populate('employee', 'firstName lastName email')
      .populate('leaveType', 'name')
      .populate('rejectedBy', 'firstName lastName email');

    return res.status(200).json({
      message: 'Leave request rejected successfully.',
      request: updatedRequest
    });

  } catch (error) {
    console.error('Reject Leave Error:', error);
    return res.status(500).json({ error: error.message || 'Server error while rejecting leave request' });
  }
};

/**
 * GET /api/admin/leave-balances
 * Returns all employee leave balances.
 */
exports.getEmployeeBalances = async (req, res) => {
  try {
    const employees = await User.find({ role: 'Employee' }).select('_id firstName lastName email');
    for (const emp of employees) {
      await ensureEmployeeBalances(emp._id);
    }

    const balances = await EmployeeLeaveBalance.find()
      .populate('employee', 'firstName lastName email profilePicture')
      .populate('leaveType', 'name defaultAllocation isActive')
      .sort({ 'employee.firstName': 1 });

    const validBalances = balances.filter(b => b.employee && b.leaveType);
    return res.status(200).json({ balances: validBalances });
  } catch (error) {
    console.error('Get Employee Balances Error:', error);
    return res.status(500).json({ error: 'Error fetching employee balances' });
  }
};

/**
 * POST /api/admin/leave-types
 * Creates a new Leave Type and auto-allocates default balances to active employees.
 */
exports.createLeaveType = async (req, res) => {
  try {
    const { name, description, defaultAllocation } = req.body;

    if (!name || defaultAllocation === undefined) {
      return res.status(400).json({ error: 'Please provide leave type Name and Default Allocation.' });
    }

    const allocNum = Number(defaultAllocation);
    if (isNaN(allocNum) || allocNum < 0) {
      return res.status(400).json({ error: 'Default allocation must be a non-negative number.' });
    }

    const existing = await LeaveType.findOne({ name: name.trim() });
    if (existing) {
      return res.status(409).json({ error: `Leave type '${name.trim()}' already exists.` });
    }

    const leaveType = await LeaveType.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      defaultAllocation: allocNum,
      isActive: true
    });

    const users = await User.find({ role: 'Employee' });
    for (const u of users) {
      await EmployeeLeaveBalance.create({
        employee: u._id,
        leaveType: leaveType._id,
        totalAllocated: allocNum,
        used: 0,
        remaining: allocNum
      });
    }

    return res.status(201).json({
      message: 'Leave type created successfully.',
      leaveType
    });
  } catch (error) {
    console.error('Create Leave Type Error:', error);
    return res.status(500).json({ error: 'Error creating leave type' });
  }
};

/**
 * PATCH /api/admin/leave-types/:id
 * Updates leave type properties.
 */
exports.updateLeaveType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, defaultAllocation, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid leave type ID.' });
    }

    const leaveType = await LeaveType.findById(id);
    if (!leaveType) {
      return res.status(404).json({ error: 'Leave type not found.' });
    }

    if (name) leaveType.name = name.trim();
    if (description !== undefined) leaveType.description = description.trim();
    if (isActive !== undefined) leaveType.isActive = Boolean(isActive);
    if (defaultAllocation !== undefined) {
      const allocNum = Number(defaultAllocation);
      if (isNaN(allocNum) || allocNum < 0) {
        return res.status(400).json({ error: 'Default allocation must be a non-negative number.' });
      }
      leaveType.defaultAllocation = allocNum;
    }

    await leaveType.save();

    return res.status(200).json({
      message: 'Leave type updated successfully.',
      leaveType
    });
  } catch (error) {
    console.error('Update Leave Type Error:', error);
    return res.status(500).json({ error: 'Error updating leave type' });
  }
};

/**
 * GET /api/admin/leave-types
 * Retrieves all leave types.
 */
exports.getLeaveTypes = async (req, res) => {
  try {
    const leaveTypes = await LeaveType.find().sort({ createdAt: 1 });
    return res.status(200).json({ leaveTypes });
  } catch (error) {
    console.error('Get Leave Types Error:', error);
    return res.status(500).json({ error: 'Error retrieving leave types' });
  }
};
