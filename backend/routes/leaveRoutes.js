/**
 * @file leaveRoutes.js
 * @description API Routes for Employee Leave Management.
 */

const express = require('express');
const router = express.Router();
const { getMyBalances, getMyRequests, applyLeave, cancelLeave } = require('../controllers/leaveController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/balance', getMyBalances);
router.get('/my-requests', getMyRequests);
router.post('/apply', applyLeave);
router.patch('/:id/cancel', cancelLeave);

module.exports = router;
