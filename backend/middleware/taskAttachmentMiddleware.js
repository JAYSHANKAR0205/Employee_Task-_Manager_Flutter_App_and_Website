/**
 * @file taskAttachmentMiddleware.js
 * @description Multer + Cloudinary Storage Middleware for Task Attachments.
 * 
 * WORK OF THIS FILE:
 * - Intercepts multipart/form-data uploads under the field name 'files' (or 'attachments').
 * - Streams images (jpg, jpeg, png, webp) and documents (pdf, doc, docx, xls, xlsx, ppt, pptx, txt) to Cloudinary.
 * - Enforces file size limits (10MB per file) and max file count (20 files per upload).
 * - Sanitizes filenames to prevent path traversal or injection.
 * - Formats multer errors into clear, friendly JSON HTTP 400 responses.
 */

const path = require('path');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../utils/cloudinary');

const ALLOWED_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'webp',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'
];

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const isImage = ['jpg', 'jpeg', 'png', 'webp'].includes(ext);
    const baseName = path.basename(file.originalname, path.extname(file.originalname))
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 50);

    return {
      folder: 'employee_task_manager_attachments',
      resource_type: isImage ? 'image' : 'raw',
      public_id: `${Date.now()}_${baseName}`,
      format: isImage ? undefined : ext // Keep raw extensions for documents
    };
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  if (ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type .${ext} is not supported. Allowed formats: ${ALLOWED_EXTENSIONS.join(', ')}`), false);
  }
};

const uploadTaskFiles = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 20 // Max 20 files per upload batch
  },
  fileFilter: fileFilter
});

const handleTaskUpload = (req, res, next) => {
  uploadTaskFiles.array('files', 20)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds maximum limit of 10MB per file.' });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ error: 'Cannot upload more than 20 files at once.' });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message || 'File upload failed.' });
    }
    next();
  });
};

module.exports = {
  handleTaskUpload,
  ALLOWED_EXTENSIONS
};
