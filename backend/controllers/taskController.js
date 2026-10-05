/**
 * @file taskController.js
 * @description Task CRUD Operations & Task Management Controller.
 * 
 * WORK OF THIS FILE:
 * - Implements task handlers: `getTasks`, `createTask`, `updateTask`, `updateTaskStatus`, `deleteTask`.
 * - Restricts non-admin employees to viewing and updating tasks assigned specifically to them.
 * 
 * WHY IS IT IN THE FILE STRUCTURE:
 * - Houses business logic for task tracking, assignment, and status updates across the employee dashboard.
 */

const path = require('path');
const axios = require('axios');
const archiverPkg = require('archiver');
const Task = require('../models/Task');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { TaskArchive } = require('../models/Archive');
const { notifyEvent } = require('../services/notificationService');

const formatUploadedFiles = (files) => {
  if (!files || !Array.isArray(files)) return [];
  return files.map(f => {
    const ext = path.extname(f.originalname).toLowerCase().replace('.', '');
    const isImage = ['jpg', 'jpeg', 'png', 'webp'].includes(ext);
    return {
      fileName: f.originalname,
      fileUrl: f.path || f.secure_url || f.url,
      fileType: isImage ? 'image' : 'document',
      mimeType: f.mimetype,
      fileSize: f.size,
      publicId: f.filename,
      uploadedAt: new Date()
    };
  });
};

/**
 * Fetch tasks from MongoDB
 * GET /api/tasks
 * Admins see all tasks. Employees see only their assigned tasks.
 */
exports.getTasks = async (req, res) => {
  try {
    const isAll = req.query.all === 'true';
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const status = req.query.status;
    const priority = req.query.priority;
    const search = req.query.search ? req.query.search.trim() : '';

    let query = {};
    if (req.user.role === 'Employee') {
      query.assignedTo = req.user._id;
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    if (priority && priority !== 'All') {
      query.priority = priority;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      const matchingUsers = await User.find({
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { email: searchRegex }
        ]
      }).select('_id').lean();
      const matchingUserIds = matchingUsers.map(u => u._id);

      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        ...(matchingUserIds.length > 0 ? [{ assignedTo: { $in: matchingUserIds } }] : [])
      ];
    }

    if (isAll) {
      const tasks = await Task.find(query)
        .sort({ createdAt: -1 })
        .populate('assignedTo', 'firstName lastName email')
        .populate('history.updatedBy', 'firstName lastName')
        .lean();

      const formattedTasks = await Promise.all(tasks.map(async task => {
        const idStr = task._id.toString();
        const priorCount = await Task.countDocuments({ createdAt: { $lt: task.createdAt } });
        return {
          ...task,
          id: idStr,
          taskId: 5001 + priorCount
        };
      }));

      return res.json({
        tasks: formattedTasks,
        pagination: {
          page: 1,
          limit: formattedTasks.length,
          total: formattedTasks.length,
          totalPages: 1,
          hasMore: false
        }
      });
    }

    const total = await Task.countDocuments(query);
    const totalPages = Math.ceil(total / limit) || 1;
    const hasMore = page < totalPages;

    const tasks = await Task.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('assignedTo', 'firstName lastName email')
      .populate('history.updatedBy', 'firstName lastName')
      .lean();

    const formattedTasks = await Promise.all(tasks.map(async task => {
      const idStr = task._id.toString();
      const priorCount = await Task.countDocuments({ createdAt: { $lt: task.createdAt } });
      return {
        ...task,
        id: idStr,
        taskId: 5001 + priorCount
      };
    }));

    return res.json({
      tasks: formattedTasks,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore
      }
    });
  } catch (error) {
    console.error('getTasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks from database' });
  }
};

/**
 * Fetch task summary counts
 * GET /api/tasks/summary
 */
exports.getTaskSummary = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'Employee') {
      query.assignedTo = req.user._id;
    }

    const [total, completed, inProgress, pending] = await Promise.all([
      Task.countDocuments(query),
      Task.countDocuments({ ...query, status: 'Completed' }),
      Task.countDocuments({ ...query, status: 'In Progress' }),
      Task.countDocuments({ ...query, status: 'Pending' })
    ]);

    return res.json({
      total,
      completed,
      inProgress,
      pending
    });
  } catch (error) {
    console.error('getTaskSummary error:', error);
    res.status(500).json({ error: 'Failed to fetch task summary' });
  }
};

/**
 * Create a new task in MongoDB
 * POST /api/tasks
 */
exports.createTask = async (req, res) => {
  try {
    const { title, description, assignedTo, status, priority, dueDate, attachments } = req.body;

    if (!title || !description || !assignedTo || !dueDate) {
      return res.status(400).json({ error: 'Title, description, assignee, and due date are required.' });
    }

    const targetUser = await User.findById(assignedTo);
    if (!targetUser || !targetUser.isVerified || targetUser.isProfileComplete === false) {
      return res.status(400).json({ error: 'Tasks can only be assigned to fully verified users.' });
    }
    if (targetUser.isBlocked) {
      return res.status(400).json({ error: 'This user is blocked and cannot be assigned tasks.' });
    }
    if (targetUser.role !== 'Employee') {
      return res.status(400).json({ error: 'Tasks can only be assigned to employees. Admin users cannot be assigned tasks.' });
    }
    if (req.user && targetUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'Admins cannot assign tasks to themselves.' });
    }

    let parsedAttachments = [];
    if (attachments) {
      try {
        parsedAttachments = typeof attachments === 'string' ? JSON.parse(attachments) : attachments;
        if (!Array.isArray(parsedAttachments)) parsedAttachments = [];
      } catch (e) {
        parsedAttachments = [];
      }
    }
    const uploadedAttachments = formatUploadedFiles(req.files);
    const finalAttachments = [...parsedAttachments, ...uploadedAttachments];

    const newTask = new Task({
      title,
      description,
      assignedTo,
      status: 'Pending',
      priority: priority || 'Medium',
      dueDate: new Date(dueDate),
      attachments: finalAttachments,
      user: req.user ? req.user._id : null
    });

    const savedTask = await newTask.save();
    const count = await Task.countDocuments();
    const taskObj = savedTask.toObject();
    taskObj.id = savedTask._id.toString();
    taskObj.taskId = 5000 + count;

    // Trigger Non-blocking Real-time Notification & Email Alerts
    notifyEvent({
      eventType: 'TASK_ASSIGNED',
      actor: req.user,
      targetUser,
      task: savedTask,
      link: '/tasks'
    });

    res.status(201).json(taskObj);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to create task in database' });
  }
};

/**
 * Update an existing task in MongoDB
 * PUT /api/tasks/:id
 */
exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, assignedTo, status, priority, dueDate, attachments } = req.body;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found in database' });
    }

    if (req.user.role === 'Employee') {
      // Allow the update if the employee is only changing the status, or if the other fields match the existing task.
      const isTryingToChangeOtherFields = (title !== undefined && title !== task.title) || 
                                          (description !== undefined && description !== task.description) || 
                                          (assignedTo !== undefined && assignedTo.toString() !== task.assignedTo.toString()) || 
                                          (priority !== undefined && priority !== task.priority) || 
                                          (dueDate !== undefined && new Date(dueDate).getTime() !== new Date(task.dueDate).getTime());
      
      if (isTryingToChangeOtherFields) {
        return res.status(403).json({ error: 'Employees can only update the task status.' });
      }
      if (status && !['In Progress', 'Completed'].includes(status)) {
        return res.status(400).json({ error: 'Employees can only set status to In Progress or Completed.' });
      }
    }

    // Admin status is fixed to 'Pending'
    const targetStatus = req.user.role === 'Admin' ? 'Pending' : (status || task.status);

    // If status is being changed, record the current status in history before updating
    if (targetStatus !== task.status) {
      task.history.push({
        status: task.status,
        updatedBy: req.user._id
      });
      task.status = targetStatus;
    }

    if (req.user.role === 'Admin') {
      if (assignedTo !== undefined) {
        const targetUser = await User.findById(assignedTo);
        if (!targetUser || !targetUser.isVerified || targetUser.isProfileComplete === false) {
          return res.status(400).json({ error: 'Tasks can only be assigned to fully verified users.' });
        }
        if (targetUser.isBlocked) {
          return res.status(400).json({ error: 'This user is blocked and cannot be assigned tasks.' });
        }
        if (targetUser.role !== 'Employee') {
          return res.status(400).json({ error: 'Tasks can only be assigned to employees. Admin users cannot be assigned tasks.' });
        }
        if (req.user && targetUser._id.toString() === req.user._id.toString()) {
          return res.status(400).json({ error: 'Admins cannot assign tasks to themselves.' });
        }
        task.assignedTo = assignedTo;
      }
      if (title !== undefined) task.title = title;
      if (description !== undefined) task.description = description;
      if (priority !== undefined) task.priority = priority;
      if (dueDate !== undefined) task.dueDate = new Date(dueDate);

      // Handle attachments update
      let updatedAttachments = task.attachments ? [...task.attachments] : [];
      if (attachments !== undefined) {
        try {
          const parsed = typeof attachments === 'string' ? JSON.parse(attachments) : attachments;
          if (Array.isArray(parsed)) {
            updatedAttachments = parsed;
          }
        } catch (e) {}
      } else if (req.body.retainedAttachmentIds !== undefined) {
        let retainedIds = [];
        try {
          retainedIds = typeof req.body.retainedAttachmentIds === 'string'
            ? JSON.parse(req.body.retainedAttachmentIds)
            : req.body.retainedAttachmentIds;
        } catch (e) {}
        if (Array.isArray(retainedIds)) {
          const idSet = new Set(retainedIds.map(id => id ? id.toString() : ''));
          updatedAttachments = updatedAttachments.filter(a => idSet.has(a._id ? a._id.toString() : (a.id || '')));
        }
      }

      if (req.files && req.files.length > 0) {
        const newUploaded = formatUploadedFiles(req.files);
        updatedAttachments = [...updatedAttachments, ...newUploaded];
      }
      task.attachments = updatedAttachments;
    }

    const updatedTask = await task.save();
    
    // Populate to return full object
    await updatedTask.populate('assignedTo', 'firstName lastName email');
    await updatedTask.populate('history.updatedBy', 'firstName lastName');

    // Trigger Non-blocking Real-time Notification & Email Alerts
    const isCompleted = targetStatus === 'Completed';
    notifyEvent({
      eventType: isCompleted ? 'TASK_COMPLETED' : 'TASK_UPDATED',
      actor: req.user,
      targetUser: updatedTask.assignedTo,
      task: updatedTask,
      link: '/tasks'
    });

    const taskObj = updatedTask.toObject();
    taskObj.id = updatedTask._id.toString();

    res.json(taskObj);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to update task in database' });
  }
};

/**
 * Delete a task from MongoDB (Hard Delete + Archive)
 * DELETE /api/tasks/:id
 */
exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id).populate('assignedTo', 'firstName lastName email');
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found in database' });
    }

    // Archive the task before hard deleting (DP-DP rule)
    await TaskArchive.create({
      originalId: task._id,
      data: task.toObject(),
      deletedBy: req.user._id
    });

    await Task.findByIdAndDelete(id);

    // Trigger Non-blocking Real-time Notification & Email Alerts
    notifyEvent({
      eventType: 'TASK_DELETED',
      actor: req.user,
      targetUser: task.assignedTo,
      task,
      link: '/tasks'
    });
    
    res.json({ message: 'Task archived and deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task from database' });
  }
};

/**
 * Download a single attachment from a task
 * GET /api/tasks/:id/attachments/:attachmentId/download
 */
exports.downloadAttachment = async (req, res) => {
  try {
    const { id, attachmentId } = req.params;
    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Permission check: Admins can view/download any task, Employees can only view/download their assigned tasks
    if (req.user.role === 'Employee' && task.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You are not authorized to access attachments for this task' });
    }

    const attachment = (task.attachments || []).find(
      a => (a._id && a._id.toString() === attachmentId) || (a.id && a.id.toString() === attachmentId)
    );

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found on this task' });
    }

    if (!attachment.fileUrl) {
      return res.status(404).json({ error: 'Attachment file URL is missing or corrupted' });
    }

    // Sanitize filename for header
    const safeFilename = (attachment.fileName || 'attachment').replace(/["\r\n]/g, '_');

    // Stream file from Cloudinary CDN to client
    const response = await axios({
      method: 'get',
      url: attachment.fileUrl,
      responseType: 'stream'
    });

    res.setHeader('Content-Type', attachment.mimeType || response.headers['content-type'] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeFilename)}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`);
    if (attachment.fileSize) {
      res.setHeader('Content-Length', attachment.fileSize);
    }

    response.data.pipe(res);
  } catch (error) {
    console.error('downloadAttachment error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download attachment' });
    }
  }
};

/**
 * Download all attachments from a task as a ZIP archive
 * GET /api/tasks/:id/attachments/download-all
 */
exports.downloadAllAttachments = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Permission check: Admins can view/download any task, Employees can only view/download their assigned tasks
    if (req.user.role === 'Employee' && task.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You are not authorized to access attachments for this task' });
    }

    if (!task.attachments || task.attachments.length === 0) {
      return res.status(400).json({ error: 'No attachments available for this task' });
    }

    const zipFilename = `Task-${task.taskId || task._id}-Attachments.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

    const archive = archiverPkg.ZipArchive ? new archiverPkg.ZipArchive({ zlib: { level: 6 } }) : archiverPkg('zip', { zlib: { level: 6 } });

    archive.on('error', (err) => {
      console.error('ZIP archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to create attachment archive' });
      }
    });

    archive.pipe(res);

    const usedNames = new Map();

    for (let i = 0; i < task.attachments.length; i++) {
      const att = task.attachments[i];
      if (!att.fileUrl) continue;

      let baseName = att.fileName || `file_${i + 1}`;
      const ext = path.extname(baseName);
      const nameWithoutExt = path.basename(baseName, ext);

      // Prevent duplicate names inside the ZIP
      let finalName = baseName;
      let count = usedNames.get(baseName) || 0;
      if (count > 0) {
        finalName = `${nameWithoutExt}_(${count})${ext}`;
      }
      usedNames.set(baseName, count + 1);

      try {
        const fileResponse = await axios({
          method: 'get',
          url: att.fileUrl,
          responseType: 'stream',
          timeout: 15000
        });
        archive.append(fileResponse.data, { name: finalName });
      } catch (fetchErr) {
        console.error(`Failed to fetch attachment ${att.fileUrl}:`, fetchErr.message);
        archive.append(`Failed to download attachment: ${att.fileName}\nReason: ${fetchErr.message}`, {
          name: `${finalName}.error.txt`
        });
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error('downloadAllAttachments error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate attachments ZIP archive' });
    }
  }
};

