/**
 * @file taskRoutes.js
 * @description Express Task Management Route Definitions.
 * 
 * WORK OF THIS FILE:
 * - Maps HTTP endpoints under `/api/tasks` (`GET /`, `POST /`, `PUT /:id`, `DELETE /:id`) to controller handlers in `taskController.js`.
 * - Applies `protect` middleware to ensure all task operations require an active authenticated session.
 * 
 * WHY IS IT IN THE FILE STRUCTURE:
 * - Serves as the dedicated router module for task creation, retrieval, and status tracking.
 */

const express = require('express');
const router = express.Router();
const { 
  getTasks, 
  createTask, 
  updateTask, 
  deleteTask, 
  getTaskSummary,
  downloadAttachment,
  downloadAllAttachments 
} = require('../controllers/taskController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { handleTaskUpload } = require('../middleware/taskAttachmentMiddleware');

router.get('/summary', protect, getTaskSummary);
router.get('/:id/attachments/download-all', protect, downloadAllAttachments);
router.get('/:id/attachments/:attachmentId/download', protect, downloadAttachment);
router.get('/', protect, getTasks);
router.post('/', protect, adminOnly, handleTaskUpload, createTask); // Only admins create tasks
router.put('/:id', protect, handleTaskUpload, updateTask); // Admin and employees can update
router.delete('/:id', protect, adminOnly, deleteTask); // Only admins delete

module.exports = router;
