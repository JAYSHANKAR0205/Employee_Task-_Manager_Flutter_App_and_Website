/**
 * @file notificationService.js
 * @description Centralized Enterprise Notification & Email Dispatch Service.
 * 
 * WORK OF THIS FILE:
 * - Provides non-blocking, real-time in-app notification creation and email alerts.
 * - Triggers real-time Admin in-app notifications for important user activities.
 * - Sends automated user email notifications for Admin-triggered actions.
 * - Sends Admin email audit trail notifications.
 * - Executes asynchronously off the main thread (`setImmediate`) to deliver zero API latency impact.
 */

const Notification = require('../models/Notification');
const User = require('../models/User');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Send email asynchronously in background
 */
const sendEmailAsync = async ({ to, subject, html, text }) => {
  if (!to) return;
  try {
    const from = process.env.EMAIL_USER || 'no-reply@employeetaskmanager.com';
    await transporter.sendMail({
      from: `"Employee Task Manager" <${from}>`,
      to,
      subject,
      text: text || html.replace(/<[^>]+>/g, ''),
      html
    });
  } catch (err) {
    console.warn(`[NOTIFICATION SERVICE] Warning: Email dispatch to ${to} failed:`, err.message);
  }
};

/**
 * Helper to fetch all Admin users
 */
const getAdminUsers = async () => {
  try {
    return await User.find({ role: 'Admin' }).select('_id email firstName lastName').lean();
  } catch (e) {
    return [];
  }
};

/**
 * Centralized Notification Dispatcher
 *
 * @param {Object} params
 * @param {string} params.eventType
 * @param {Object} params.actor
 * @param {Object} [params.targetUser]
 * @param {Object} [params.task]
 * @param {string} [params.details]
 * @param {string} [params.link]
 */
const notifyEvent = ({ eventType, actor, targetUser, task, details, link }) => {
  // Execute non-blocking in background thread for millisecond API response
  setImmediate(async () => {
    try {
      const nowStr = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
      const actorName = actor ? `${actor.firstName || ''} ${actor.lastName || ''}`.trim() || actor.email : 'System';
      const admins = await getAdminUsers();

      // 1. In-App Notification & Email for Target User (if action by someone else affects user)
      if (targetUser && String(targetUser._id) !== String(actor?._id)) {
        let userTitle = 'System Notification';
        let userMsg = details || `Action performed by ${actorName}`;

        if (eventType === 'TASK_ASSIGNED') {
          userTitle = 'New Task Assigned';
          userMsg = `You have been assigned a new task: "${task?.title || 'Untitled'}" by ${actorName}.`;
        } else if (eventType === 'TASK_UPDATED') {
          userTitle = 'Task Updated';
          userMsg = `Your task "${task?.title || 'Untitled'}" was updated by ${actorName}.`;
        } else if (eventType === 'TASK_DELETED') {
          userTitle = 'Task Removed';
          userMsg = `Task "${task?.title || 'Untitled'}" was deleted by ${actorName}.`;
        } else if (eventType === 'USER_BLOCKED' || eventType === 'USER_UNBLOCKED') {
          userTitle = 'Account Status Update';
          userMsg = `Your account was ${eventType === 'USER_BLOCKED' ? 'blocked' : 'unblocked'} by ${actorName}.`;
        } else if (eventType === 'PROFILE_UPDATED_BY_ADMIN') {
          userTitle = 'Profile Updated by Admin';
          userMsg = `Your profile details were updated by ${actorName}.`;
        } else if (eventType === 'PASSWORD_RESET_BY_ADMIN') {
          userTitle = 'Password Reset by Admin';
          userMsg = `Your account password was reset by ${actorName}.`;
        }

        await Notification.create({
          recipient: targetUser._id,
          sender: actor ? actor._id : null,
          title: userTitle,
          message: userMsg,
          type: eventType.startsWith('TASK') ? 'TASK_UPDATED' : 'SYSTEM',
          link: link || (eventType.startsWith('TASK') ? '/tasks' : '/profile')
        });

        if (targetUser.email) {
          const emailSubject = `[Employee Task Manager] ${userTitle}`;
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #ea4c89; margin-top: 0;">${userTitle}</h2>
              <p style="font-size: 15px; color: #334155;">Hello <strong>${targetUser.firstName || 'User'}</strong>,</p>
              <p style="font-size: 15px; color: #334155;">${userMsg}</p>
              <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 4px 0; font-size: 13px; color: #64748b;"><strong>Action Performed By:</strong> ${actorName}</p>
                <p style="margin: 4px 0; font-size: 13px; color: #64748b;"><strong>Date & Time:</strong> ${nowStr}</p>
                ${task ? `<p style="margin: 4px 0; font-size: 13px; color: #64748b;"><strong>Task:</strong> ${task.title}</p>` : ''}
              </div>
              <p style="font-size: 13px; color: #94a3b8;">This is an automated notification from Employee Task Manager.</p>
            </div>
          `;
          await sendEmailAsync({ to: targetUser.email, subject: emailSubject, html: emailHtml });
        }
      }

      // 2. Real-Time Admin In-App Notifications & Admin Audit Email
      const isActorAdmin = actor && actor.role === 'Admin';
      let adminTitle = 'System Event';
      let adminMsg = `${actorName} performed action: ${eventType}`;

      switch (eventType) {
        case 'PROFILE_UPDATED':
          adminTitle = 'User Profile Updated';
          adminMsg = `${actorName} updated their profile.`;
          break;
        case 'PROFILE_PICTURE_UPDATED':
          adminTitle = 'Profile Picture Changed';
          adminMsg = `${actorName} changed their profile picture.`;
          break;
        case 'PROFILE_COMPLETED':
          adminTitle = 'Profile Setup Completed';
          adminMsg = `${actorName} completed their profile setup.`;
          break;
        case 'PASSWORD_CHANGED':
          adminTitle = 'Password Changed';
          adminMsg = `${actorName} updated their password.`;
          break;
        case 'TASK_CREATED':
          adminTitle = 'New Task Created';
          adminMsg = `${actorName} created task "${task?.title || ''}".`;
          break;
        case 'TASK_COMPLETED':
          adminTitle = 'Task Completed';
          adminMsg = `${actorName} completed task "${task?.title || ''}".`;
          break;
        case 'TASK_STATUS_UPDATED':
          adminTitle = 'Task Status Changed';
          adminMsg = `${actorName} updated status of task "${task?.title || ''}" to ${task?.status || ''}.`;
          break;
        case 'TASK_DELETED':
          adminTitle = 'Task Deleted';
          adminMsg = `${actorName} deleted task "${task?.title || ''}".`;
          break;
        case 'USER_CREATED':
          adminTitle = 'New User Account Created';
          adminMsg = `${actorName} created account for ${targetUser ? targetUser.email : ''}.`;
          break;
        case 'USER_BLOCKED':
        case 'USER_UNBLOCKED':
          adminTitle = `User ${eventType === 'USER_BLOCKED' ? 'Blocked' : 'Unblocked'}`;
          adminMsg = `${actorName} ${eventType === 'USER_BLOCKED' ? 'blocked' : 'unblocked'} user ${targetUser ? targetUser.email : ''}.`;
          break;
        case 'DOCUMENT_UPLOADED':
          adminTitle = 'Document Uploaded';
          adminMsg = `${actorName} uploaded document(s).`;
          break;
        case 'DOCUMENT_DELETED':
          adminTitle = 'Document Deleted';
          adminMsg = `${actorName} deleted a document.`;
          break;
      }

      for (const admin of admins) {
        // Send in-app notification to Admins
        if (!isActorAdmin || String(admin._id) !== String(actor?._id)) {
          await Notification.create({
            recipient: admin._id,
            sender: actor ? actor._id : null,
            title: adminTitle,
            message: adminMsg,
            type: 'SYSTEM',
            link: link || (task ? '/tasks' : '/profile')
          });
        }

        // Send Email Audit Alert to Admins
        if (admin.email) {
          const adminEmailSubject = `[Admin Audit Log] ${adminTitle}`;
          const adminEmailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h3 style="color: #a855f7; margin-top: 0;">${adminTitle}</h3>
              <p style="font-size: 14px; color: #334155;">${adminMsg}</p>
              <div style="background-color: #f8fafc; padding: 12px; border-radius: 8px; margin: 15px 0;">
                <p style="margin: 4px 0; font-size: 12px; color: #64748b;"><strong>Actor:</strong> ${actorName} (${actor?.email || 'N/A'})</p>
                ${targetUser ? `<p style="margin: 4px 0; font-size: 12px; color: #64748b;"><strong>Target User:</strong> ${targetUser.firstName || ''} ${targetUser.lastName || ''} (${targetUser.email})</p>` : ''}
                ${task ? `<p style="margin: 4px 0; font-size: 12px; color: #64748b;"><strong>Task:</strong> ${task.title}</p>` : ''}
                <p style="margin: 4px 0; font-size: 12px; color: #64748b;"><strong>Timestamp:</strong> ${nowStr}</p>
              </div>
            </div>
          `;
          await sendEmailAsync({ to: admin.email, subject: adminEmailSubject, html: adminEmailHtml });
        }
      }
    } catch (err) {
      console.error('[NOTIFICATION SERVICE] Async dispatch error:', err);
    }
  });
};

module.exports = {
  notifyEvent,
  sendEmailAsync
};
