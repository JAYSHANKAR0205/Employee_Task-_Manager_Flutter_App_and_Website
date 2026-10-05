/**
 * @file otpLockout.js
 * @description Centralized OTP Security Lockout Infrastructure.
 * 
 * WORK OF THIS FILE:
 * - Centralizes failed OTP attempt tracking and 10-minute security lockout logic across:
 *   1. Registration (send verification OTP, verify inline OTP, submit registration)
 *   2. Forgot Password (send reset OTP, verify reset OTP, reset password)
 *   3. Edit / Complete Profile (OTP verification for contact updates)
 * - Tracks 5 consecutive invalid OTP verification attempts for any email/phone.
 * - Stores backend lock expiration (`blockedUntil`) in MongoDB `OTP` collection under `purpose: 'otp_lockout'`.
 * - Returns structured HTTP 429 response with real-time remaining time in seconds and MM:SS formatted string.
 * - Automatically purges expired locks after 10 minutes (600s).
 */

const OTP = require('../models/OTP');
const User = require('../models/User');

const LOCK_DURATION_MS = 10 * 60 * 1000; // 10 minutes lock

/**
 * Normalizes identifier (email to lower case, phone to clean trimmed string)
 */
const normalizeIdentifier = (identifier) => {
  if (!identifier) return '';
  const str = String(identifier).trim();
  if (str.includes('@')) return str.toLowerCase();
  return str;
};

/**
 * Check if email or phone is currently locked out.
 * Returns lock response object if locked out, null if not locked.
 */
const checkLockout = async (identifier) => {
  if (!identifier) return null;
  const cleanId = normalizeIdentifier(identifier);
  if (!cleanId) return null;

  const now = Date.now();

  const query = cleanId.includes('@')
    ? { email: cleanId, purpose: 'otp_lockout' }
    : { phoneNumber: cleanId, purpose: 'otp_lockout' };

  const lockoutDoc = await OTP.findOne(query);

  if (!lockoutDoc || !lockoutDoc.blockedUntil) {
    return null;
  }

  const blockEndTime = new Date(lockoutDoc.blockedUntil).getTime();

  if (blockEndTime <= now) {
    // Lock has expired -> automatically remove lock and reset attempt counter
    await OTP.deleteMany(query);
    if (cleanId.includes('@')) {
      await User.updateOne(
        { email: cleanId },
        { $unset: { forgotPasswordBlockedUntil: 1 }, $set: { forgotPasswordAttempts: 0 } }
      );
    }
    return null;
  }

  const remainingSeconds = Math.max(1, Math.ceil((blockEndTime - now) / 1000));
  const remainingMinutes = Math.max(1, Math.ceil(remainingSeconds / 60));
  const isEmail = cleanId.includes('@');
  const entityLabel = isEmail ? 'email' : 'phone number';

  return {
    isBlocked: true,
    blockedUntil: blockEndTime,
    remainingTime: remainingSeconds,
    remainingMinutes,
    formattedTime: `${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`,
    error: `This ${entityLabel} is temporarily blocked. Please try again in ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}.`
  };
};

/**
 * Record a failed OTP attempt.
 * Increments attempt counter. After 5 consecutive invalid attempts:
 * - Triggers 10-minute lock.
 * - Sets backend source of truth `blockedUntil` in MongoDB.
 * - Returns structured 429 lockout payload.
 */
const recordFailedAttempt = async (identifier) => {
  if (!identifier) return { isBlocked: false, attempts: 0, remainingAttempts: 5 };
  const cleanId = normalizeIdentifier(identifier);
  if (!cleanId) return { isBlocked: false, attempts: 0, remainingAttempts: 5 };

  const now = Date.now();
  const isEmail = cleanId.includes('@');

  const query = isEmail
    ? { email: cleanId, purpose: 'otp_lockout' }
    : { phoneNumber: cleanId, purpose: 'otp_lockout' };

  let lockoutDoc = await OTP.findOne(query);

  if (!lockoutDoc) {
    lockoutDoc = new OTP({
      email: isEmail ? cleanId : undefined,
      phoneNumber: !isEmail ? cleanId : undefined,
      otp: 'LOCKED',
      purpose: 'otp_lockout',
      attempts: 0
    });
  }

  // Check if already locked
  if (lockoutDoc.blockedUntil && new Date(lockoutDoc.blockedUntil).getTime() > now) {
    const blockEndTime = new Date(lockoutDoc.blockedUntil).getTime();
    const remainingSeconds = Math.max(1, Math.ceil((blockEndTime - now) / 1000));
    const remainingMinutes = Math.max(1, Math.ceil(remainingSeconds / 60));
    const entityLabel = isEmail ? 'email' : 'phone number';
    return {
      isBlocked: true,
      blockedUntil: blockEndTime,
      remainingTime: remainingSeconds,
      remainingMinutes,
      formattedTime: `${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`,
      error: `This ${entityLabel} is temporarily blocked. Please try again in ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}.`
    };
  }

  lockoutDoc.attempts = (lockoutDoc.attempts || 0) + 1;

  if (lockoutDoc.attempts >= 5) {
    const blockTime = now + LOCK_DURATION_MS;
    lockoutDoc.blockedUntil = new Date(blockTime);
    await lockoutDoc.save();

    if (isEmail) {
      const user = await User.findOne({ email: cleanId });
      if (user) {
        await User.updateOne(
          { _id: user._id },
          { $set: { forgotPasswordBlockedUntil: new Date(blockTime), forgotPasswordAttempts: 5 } }
        );
        if (user.phoneNumber) {
          await OTP.updateOne(
            { phoneNumber: user.phoneNumber, purpose: 'otp_lockout' },
            { $set: { blockedUntil: new Date(blockTime), attempts: 5, otp: 'LOCKED' } },
            { upsert: true }
          );
        }
      }
    } else {
      const user = await User.findOne({ phoneNumber: cleanId });
      if (user && user.email) {
        await OTP.updateOne(
          { email: user.email, purpose: 'otp_lockout' },
          { $set: { blockedUntil: new Date(blockTime), attempts: 5, otp: 'LOCKED' } },
          { upsert: true }
        );
      }
    }

    const remainingMinutes = 10;
    const entityLabel = isEmail ? 'email' : 'phone number';

    return {
      isBlocked: true,
      newlyBlocked: true,
      blockedUntil: blockTime,
      remainingTime: 600,
      remainingMinutes,
      formattedTime: '10 minutes',
      error: `This ${entityLabel} is temporarily blocked. Please try again in 10 minutes.`
    };
  }

  await lockoutDoc.save();
  const remainingAttempts = 5 - lockoutDoc.attempts;
  return {
    isBlocked: false,
    attempts: lockoutDoc.attempts,
    remainingAttempts,
    error: `Invalid OTP. ${remainingAttempts} attempt(s) remaining.`
  };
};

/**
 * Reset failed attempts and lockout state upon successful OTP verification or expiry.
 */
const resetLockout = async (identifier) => {
  if (!identifier) return;
  const cleanId = normalizeIdentifier(identifier);
  if (!cleanId) return;

  try {
    const isEmail = cleanId.includes('@');
    const query = isEmail
      ? { email: cleanId, purpose: 'otp_lockout' }
      : { phoneNumber: cleanId, purpose: 'otp_lockout' };

    await OTP.deleteMany(query);

    if (isEmail) {
      const user = await User.findOne({ email: cleanId });
      if (user) {
        await User.updateOne(
          { _id: user._id },
          { $unset: { forgotPasswordBlockedUntil: 1 }, $set: { forgotPasswordAttempts: 0 } }
        );
        if (user.phoneNumber) {
          await OTP.deleteMany({ phoneNumber: user.phoneNumber, purpose: 'otp_lockout' });
        }
      }
    }
  } catch (e) {}
};

module.exports = {
  checkLockout,
  recordFailedAttempt,
  resetLockout
};
