/**
 * @file adminLeaveRoutes.js
 * @description API Routes for Admin Leave Management & Configuration.
 */

const express = require('express');
const router = express.Router();
const { 
  getAllRequests, 
  getPendingRequests, 
  approveLeave, 
  rejectLeave, 
  getEmployeeBalances, 
  getLeaveTypes,
  createLeaveType, 
  updateLeaveType 
} = require('../controllers/leaveController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.use(protect);
router.use(adminOnly);

router.get('/leaves', getAllRequests);
router.get('/leaves/pending', getPendingRequests);
router.patch('/leaves/:id/approve', approveLeave);
router.patch('/leaves/:id/reject', rejectLeave);

router.get('/leave-balances', getEmployeeBalances);

router.get('/leave-types', getLeaveTypes);
router.post('/leave-types', createLeaveType);
router.patch('/leave-types/:id', updateLeaveType);

module.exports = router;
