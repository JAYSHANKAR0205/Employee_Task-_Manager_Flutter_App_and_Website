/**
 * Archive.js
 * Mongoose Schemas and Models for archiving deleted Users and Tasks.
 * This satisfies the DP-DP rule for hard deletes.
 */

const mongoose = require('mongoose');

// We use Schema.Types.Mixed to store the exact JSON payload of the deleted document
const userArchiveSchema = new mongoose.Schema({
  originalId: { type: mongoose.Schema.Types.ObjectId, required: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  deletedAt: { type: Date, default: Date.now },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // Admin who deleted
});

const taskArchiveSchema = new mongoose.Schema({
  originalId: { type: mongoose.Schema.Types.ObjectId, required: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  deletedAt: { type: Date, default: Date.now },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // Admin who deleted
});

const UserArchive = mongoose.model('UserArchive', userArchiveSchema);
const TaskArchive = mongoose.model('TaskArchive', taskArchiveSchema);

module.exports = { UserArchive, TaskArchive };
