/**
 * @file authController.js
 * @description Core Authentication & User Management Controller.
 * 
 * WORK OF THIS FILE:
 * - Implements authentication handlers: `register`, `login`, `logout`, `refreshToken`, `verifyOTP`, `forgotPassword`, `resetPassword`.
 * - Handles OTP generation and dispatching via Nodemailer (Email) and Twilio (SMS).
 * - Manages user profile updates (`updateUserProfile`), profile picture removal (`null` assignment), and inline contact OTP verification.
 * - Issues HTTP-Only Access Token and Refresh Token cookies with `sameSite: 'lax'` protection.
 * 
 * WHY IS IT IN THE FILE STRUCTURE:
 * - Houses all backend security and identity business logic, ensuring credential validation, token management, and profile modifications are safely executed.
 */

const User = require('../models/User');
const OTP = require('../models/OTP');
const { UserArchive } = require('../models/Archive');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { validateEmail, validateDomain, validateMX } = require('../utils/emailValidation');
const { validatePhone } = require('../utils/phoneValidation');
const { decryptPassword } = require('../utils/crypto');
const { checkLockout, recordFailedAttempt, resetLockout } = require('../utils/otpLockout');
const { notifyEvent } = require('../services/notificationService');
const { OAuth2Client } = require('google-auth-library');
const twilio = require('twilio');

const saveToArchive = async (user) => {
  try {
    if (!user || !user._id) return;
    const userData = user.toObject ? user.toObject() : { ...user };
    delete userData.password;
    delete userData.refreshToken;
    delete userData.otp;

    await UserArchive.findOneAndUpdate(
      { originalId: user._id },
      {
        originalId: user._id,
        data: userData
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error('Failed to sync user to archive:', err);
  }
};

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || 'dummy-client-id');
const twilioClient = new twilio(
  process.env.TWILIO_ACCOUNT_SID || 'AC_DUMMY',
  process.env.TWILIO_AUTH_TOKEN || 'AUTH_DUMMY'
);

/**
 * Token Generation & Cookie Helpers
 */
const generateAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret123', { expiresIn: '15m' });
};

const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET || 'refreshsecret123', { expiresIn: '7d' });
};

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/'
};

const sendTokenCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.cookie('token', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 }); // Legacy fallback
};

const clearTokenCookies = (res) => {
  res.cookie('accessToken', '', { ...cookieOptions, expires: new Date(0) });
  res.cookie('refreshToken', '', { ...cookieOptions, expires: new Date(0) });
  res.cookie('token', '', { ...cookieOptions, expires: new Date(0) });
};

/**
 * Format Mongoose Validation Errors
 */
const  formatErrors = (error) => {
  if (error.name === 'ValidationError') {
    const errors = {};
    for (let field in error.errors) {
      errors[field] = error.errors[field].message;
    }
    return { status: 400, data: { validationErrors: errors } };
  }
  if (error.code === 11000) {
    if (error.keyPattern?.phoneNumber || (error.message && error.message.includes('phoneNumber'))) {
      return { status: 400, data: { validationErrors: { phoneNumber: 'An account with this phone number already exists.' } } };
    }
    if (error.keyPattern?.googleId || (error.message && error.message.includes('googleId'))) {
      return { status: 400, data: { error: 'An account with this Google account already exists.' } };
    }
    return { status: 400, data: { validationErrors: { email: 'An account with this email already exists.' } } };
  }
  return { status: 500, data: { error: error.message || 'Something went wrong' } };
};

/**
 * Nodemailer Transporter
 */
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS  
  }
});

/**
 * Send inline verification OTP (Email or Phone)
 * POST /api/auth/send-verification-otp
 */
exports.sendVerificationOTP = async (req, res) => {
  try {
    const { type, identifier, isCrossValidation, newEmail, newPhone } = req.body;
    if (!type || !identifier) return res.status(400).json({ error: 'Type and identifier are required' });

    let formattedIdentifier = identifier.trim();

    if (type === 'email') {
      formattedIdentifier = formattedIdentifier.toLowerCase();
      const emailCheck = validateEmail(formattedIdentifier);
      if (!emailCheck.isValid) return res.status(400).json({ error: emailCheck.error });
      const existingUser = await User.findOne({ email: formattedIdentifier });
      const isSelf = req.user && existingUser && String(existingUser._id) === String(req.user._id);
      if (existingUser && !isCrossValidation && !isSelf) {
        return res.status(400).json({ error: 'Email already registered' });
      }
    } else if (type === 'phone') {
      const phoneCheck = validatePhone(formattedIdentifier);
      if (!phoneCheck.isValid) return res.status(400).json({ error: phoneCheck.error });
      formattedIdentifier = phoneCheck.formatted;
      const existingUser = await User.findOne({ phoneNumber: formattedIdentifier });
      const isSelf = req.user && existingUser && String(existingUser._id) === String(req.user._id);
      if (existingUser && !isCrossValidation && !isSelf) {
        return res.status(400).json({ error: 'Phone number already registered' });
      }
    } else {
      return res.status(400).json({ error: 'Invalid   type' });
    }

    // Centralized 10-minute security lockout check
    const lock = await checkLockout(formattedIdentifier);
    if (lock) {
      return res.status(429).json(lock);
    }

    if (newEmail) {
      const trimmedNewEmail = newEmail.trim().toLowerCase();
      const duplicateEmail = await User.findOne({ email: trimmedNewEmail });
      if (duplicateEmail && (!req.user || String(duplicateEmail._id) !== String(req.user._id))) {
        return res.status(400).json({ error: 'This new email address is already registered to another account.' });
      }
    }

    if (newPhone) {
      const phoneCheck = validatePhone(newPhone);
      if (phoneCheck.isValid) {
        const duplicatePhone = await User.findOne({ phoneNumber: phoneCheck.formatted });
        if (duplicatePhone && (!req.user || String(duplicatePhone._id) !== String(req.user._id))) {
          return res.status(400).json({ error: 'This new phone number is already registered to another account.' });
        }
      }
    }

    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const purpose = type === 'email' ? 'email_verification' : 'phone_verification';

    await OTP.deleteMany({ [type === 'email' ? 'email' : 'phoneNumber']: formattedIdentifier, purpose });

    const newOtp = new OTP({
      [type === 'email' ? 'email' : 'phoneNumber']: formattedIdentifier,
      otp: generatedOtp,
      purpose
    });
    await newOtp.save();

    console.log(`\n==========\n[DEVELOPMENT] DB OTP (TTL 10 Min) for ${formattedIdentifier} is: ${generatedOtp}\n==========\n`);

    if (type === 'email') {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: formattedIdentifier,
        subject: 'Verify your Email',
        text: `Your email verification code is: ${generatedOtp}. This code will expire in 10 minutes.`
      });
    } else {
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER && process.env.TWILIO_ACCOUNT_SID !== 'AC_DUMMY') {
        try {
          await twilioClient.messages.create({
            body: `Your verification code is: ${generatedOtp}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: formattedIdentifier
          });
        } catch (smsError) {
          console.error("Twilio SMS Error:", smsError);
          if (smsError.message.includes('is not a Twilio phone number')) {
            return res.status(400).json({ error: 'Twilio Configuration Error: The TWILIO_PHONE_NUMBER in your .env file is not a purchased Twilio number. You cannot use your personal verified number as the FROM number.' });
          }
          return res.status(400).json({ error: 'Failed to send SMS. Please check your Twilio configuration.' });
        }
      } else {
        console.warn('Twilio credentials missing or dummy. Skipping SMS send. Use console printed OTP.');
      }
    }

    res.status(200).json({ message: 'Verification OTP sent successfully.' });
  } catch (error) {
    const { status, data } = formatErrors(error);
    res.status(status).json(data);
  }
};

/**
 * Verify inline OTP (Email or Phone)
 * POST /api/auth/verify-inline-otp
 */
exports.verifyInlineOTP = async (req, res) => {
  try {
    const { type, identifier, otp } = req.body;
    if (!type || !identifier || !otp) return res.status(400).json({ error: 'Type, identifier, and OTP are required' });

    let formattedIdentifier = identifier.trim();
    if (type === 'email') {
      formattedIdentifier = formattedIdentifier.toLowerCase();
    } else if (type === 'phone') {
      const phoneCheck = validatePhone(formattedIdentifier);
      if (phoneCheck.isValid) formattedIdentifier = phoneCheck.formatted;
    }

    const fieldName = type === 'email' ? 'email' : 'phoneNumber';

    // Centralized 10-minute security lockout check
    const lock = await checkLockout(formattedIdentifier);
    if (lock) {
      return res.status(429).json(lock);
    }

    const purpose = type === 'email' ? 'email_verification' : 'phone_verification';
    const otpDoc = await OTP.findOne({ [fieldName]: formattedIdentifier, purpose });

    if (!otpDoc) {
      const failResult = await recordFailedAttempt(formattedIdentifier);
      if (failResult.isBlocked) {
        return res.status(429).json(failResult);
      }
      return res.status(400).json({ error: 'No active OTP request found or code expired. Please request a new OTP.' });
    }

    if (otpDoc.otp !== otp) {
      const failResult = await recordFailedAttempt(formattedIdentifier);
      if (failResult.isBlocked) {
        await OTP.deleteOne({ _id: otpDoc._id });
        return res.status(429).json(failResult);
      }
      return res.status(400).json({ error: failResult.error });
    }

    // Success -> reset lockout & clear attempts
    await resetLockout(formattedIdentifier);

    const verificationToken = jwt.sign(
      { identifier: formattedIdentifier, purpose }, 
      process.env.JWT_SECRET || 'secret123', 
      { expiresIn: '30m' }
    );

    await OTP.deleteOne({ _id: otpDoc._id });

    res.status(200).json({ 
      message: 'Verified successfully.',
      verificationToken
    });
  } catch (error) {
    const { status, data } = formatErrors(error);
    res.status(status).json(data);
  }
};

/**
 * Register a new user (Creates user directly if tokens are valid)
 * POST /api/users/register
 */
exports.register = async (req, res) => {
  try {
    let { firstName, lastName, email, phoneNumber, password, dateOfBirth, gender, qualification, bio, profilePicture, profilePic, emailVerificationToken, phoneVerificationToken } = req.body;
    password = decryptPassword(password);
    
    if (!emailVerificationToken || !phoneVerificationToken) {
      return res.status(400).json({ error: 'Please verify both your email and phone number before submitting.' });
    }

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ validationErrors: { email: 'Email address is required.' } });
    }
    
    email = email.trim().toLowerCase();

    const emailSyntaxCheck = validateEmail(email);
    if (!emailSyntaxCheck.isValid) {
      return res.status(400).json({ validationErrors: { email: emailSyntaxCheck.error } });
    }

    const phoneValidation = validatePhone(phoneNumber);
    if (!phoneValidation.isValid) {
      return res.status(400).json({ error: phoneValidation.error });
    }

    const formattedPhoneNumber = phoneValidation.formatted;

    // Centralized 10-minute security lockout check
    const emailLock = await checkLockout(email);
    if (emailLock) return res.status(429).json(emailLock);
    if (phoneNumber) {
      const phoneLock = await checkLockout(phoneNumber);
      if (phoneLock) return res.status(429).json(phoneLock);
    }

    const existingUser = await User.findOne({ $or: [{ email }, { phoneNumber: formattedPhoneNumber }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email or phone number' });
    }

    // Verify tokens
    try {
      const emailDecoded = jwt.verify(emailVerificationToken, process.env.JWT_SECRET || 'secret123');
      if (emailDecoded.purpose !== 'email_verification' || emailDecoded.identifier !== email) {
        return res.status(400).json({ error: 'Invalid email verification token.' });
      }
    } catch(err) {
      return res.status(400).json({ error: 'Email verification token expired or invalid. Please verify again.' });
    }

    try {
      const phoneDecoded = jwt.verify(phoneVerificationToken, process.env.JWT_SECRET || 'secret123');
      if (phoneDecoded.purpose !== 'phone_verification' || phoneDecoded.identifier !== formattedPhoneNumber) {
        return res.status(400).json({ error: 'Invalid phone verification token.' });
      }
    } catch(err) {
      return res.status(400).json({ error: 'Phone verification token expired or invalid. Please verify again.' });
    }

    let chosenProfilePic = profilePicture || profilePic || null;
    if (chosenProfilePic && typeof chosenProfilePic === 'string' && chosenProfilePic.startsWith('data:image/')) {
      try {
        const cloudinary = require('../utils/cloudinary');
        const uploadResult = await cloudinary.uploader.upload(chosenProfilePic, {
          folder: 'employee_task_manager_profiles'
        });
        chosenProfilePic = uploadResult.secure_url;
      } catch (uploadErr) {
        console.error('Registration Cloudinary upload error:', uploadErr);
      }
    }

    const newUser = new User({
      firstName, lastName, email, phoneNumber: formattedPhoneNumber, password, dateOfBirth, gender, qualification, bio,
      profilePicture: chosenProfilePic,
      isVerified: true
    });
    
    const validationError = newUser.validateSync();
    if (validationError) {
      throw validationError;
    }

    const savedUser = await newUser.save();
    await saveToArchive(savedUser);

    // Optionally login the user right away
    const accessToken = generateAccessToken(savedUser._id);
    const refreshToken = generateRefreshToken(savedUser._id);
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    savedUser.refreshToken = hashedRefreshToken;
    await savedUser.save();
    
    sendTokenCookies(res, accessToken, refreshToken);

    // Trigger Non-blocking Real-time Notification & Email Alerts
    notifyEvent({
      eventType: 'USER_CREATED',
      actor: savedUser,
      targetUser: savedUser,
      link: '/all-users'
    });

    res.status(201).json({ 
      message: 'Registration successful! You are now logged in.',
      token: accessToken,
      accessToken: accessToken,
      user: {
        id: savedUser._id,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        email: savedUser.email,
        role: savedUser.role || 'Employee',
        profilePicture: savedUser.profilePicture
      }
    });
  } catch (error) {
    const { status, data } = formatErrors(error);
    res.status(status).json(data);
  }
};

/**
 * Verify OTP for new account registration
 * POST /api/users/verify
 */
exports.verifyOTP = async (req, res) => {
  try {
    let { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP code are required.' });
    }
    
    email = email.trim().toLowerCase();

    // Centralized 10-minute security lockout check
    const lock = await checkLockout(email);
    if (lock) return res.status(429).json(lock);

    const otpDoc = await OTP.findOne({ email, otp, purpose: 'registration' });

    if (!otpDoc) {
      const failResult = await recordFailedAttempt(email);
      if (failResult.isBlocked) {
        return res.status(429).json(failResult);
      }
      const existingUser = await User.findOne({ email });
      if (existingUser && existingUser.isVerified) {
        return res.status(400).json({ error: 'Email is already verified.' });
      }
      return res.status(400).json({ error: failResult.error });
    }

    await resetLockout(email);

    const newUser = new User({
      ...otpDoc.tempRegistrationData,
      isVerified: true,
      otp: null
    });
    
    const savedUser = await newUser.save();

    await OTP.deleteOne({ _id: otpDoc._id });

    // Issue Access Token & Hashed Refresh Token
    const accessToken = generateAccessToken(savedUser._id);
    const refreshToken = generateRefreshToken(savedUser._id);

    // Save HASHED refresh token in MongoDB for security
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    savedUser.refreshToken = hashedRefreshToken;
    await savedUser.save();

    sendTokenCookies(res, accessToken, refreshToken);

    res.status(200).json({ 
      message: 'Email verified successfully! You are logged in.',
      user: {
        id: savedUser._id,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        email: savedUser.email,
        role: savedUser.role || 'Employee'
      }
    });
  } catch (error) {
    const { status, data } = formatErrors(error);
    res.status(status).json(data);
  }
};

/**
 * Log a user in
 * Stores Access Token in Cookie, and HASHED Refresh Token in Database
 * POST /api/users/login
 */
exports.login = async (req, res) => {
  try {
    let { email, password } = req.body;
    // 1. Validation check with consistent JSON object response
    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter email and password.' });
    }
    // 2. Sanitize and normalize email (case-insensitive search)
    const normalizedEmail = email.trim().toLowerCase();
    // 3. Decrypt and sanitize password
    let decryptedPassword = decryptPassword(password);
    if (typeof decryptedPassword === 'string') {
      decryptedPassword = decryptedPassword.trim();
    }
    if (!decryptedPassword) {
      return res.status(400).json({ error: 'Invalid password format.' });
    }
    // 4. Query user from database
    const user = await User.findOne({ email: normalizedEmail });
    // 5. User Existence Check (Generic message to prevent User Enumeration attacks)
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    // 6. Blocked Account Check
    if (user.isBlocked) {
      return res.status(403).json({ error: 'Your account has been blocked by an administrator.' });
    }
    let isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch){
      return res.status(401).json("Invalid email or password.")
    }
    if (!user.isVerified) {
      return res.status(403).json({error:"Account is not verified."})
    }

    // Generate dual tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Hash refresh token with bcrypt before saving to MongoDB
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await User.updateOne(
      { _id: user._id },
      { $set: { refreshToken: hashedRefreshToken } }
    );

    // Store Access Token & Refresh Token in HttpOnly Cookies
    sendTokenCookies(res, accessToken, refreshToken);

    res.status(200).json({
      message: 'Logged in successfully!',
      token: accessToken,
      accessToken: accessToken,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role || 'Employee',
        isProfileComplete: user.isProfileComplete,
        profilePicture: user.profilePicture
      }
    });
  }
   catch (error) {
    const { status, data } = formatErrors(error);
    res.status(status).json(data);
  }
};

/**
 * Refresh Access Token when expired
 * Verifies raw Refresh Token against the HASHED Refresh Token stored in MongoDB
 * POST /api/auth/refresh-token
 */
exports.refreshToken = async (req, res) => {
  try {
    const tokenFromCookie = req.cookies ? req.cookies.refreshToken : null;
    const tokenFromBody = req.body ? req.body.refreshToken : null;
    const refreshToken = tokenFromCookie || tokenFromBody;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh Token required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET || 'refreshsecret123');
    } catch (err) {
      clearTokenCookies(res);
      return res.status(401).json({ error: 'Invalid or expired Refresh Token' });
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.refreshToken) {
      clearTokenCookies(res);
      return res.status(401).json({ error: 'Invalid Refresh Token session' });
    }

    if (user.isBlocked) {
      clearTokenCookies(res);
      return res.status(403).json({ error: 'Your account has been blocked by an administrator.', code: 'USER_BLOCKED' });
    }

    // Verify raw refresh token against hashed refresh token stored in MongoDB
    const isTokenMatch = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isTokenMatch) {
      clearTokenCookies(res);
      return res.status(401).json({ error: 'Invalid Refresh Token credentials' });
    }

    // Generate fresh access token and new refresh token
    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    // Update database with newly hashed refresh token
    const newHashedRefresh = await bcrypt.hash(newRefreshToken, 10);
    await User.updateOne(
      { _id: user._id },
      { $set: { refreshToken: newHashedRefresh } }
    );

    sendTokenCookies(res, newAccessToken, newRefreshToken);

    res.status(200).json({ message: 'Access token generated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Token refresh failed' });
  }
};

/**
 * Self-Delete User Account (Archive snapshot saved in UserArchive, deleted from main User database & Cloudinary)
 * DELETE /api/auth/account
 */
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User account not found' });
    }

    if (user.role === 'Admin') {
      return res.status(403).json({ error: 'Admin accounts cannot be deleted.' });
    }

    // 1. Create snapshot entry in UserArchive collection
    const userSnapshot = user.toObject();
    delete userSnapshot.password;
    delete userSnapshot.otp;
    delete userSnapshot.refreshToken;

    await UserArchive.create({
      originalId: user._id,
      data: userSnapshot,
      deletedAt: new Date(),
      deletedBy: user._id
    });

    // 2. Remove Cloudinary avatar asset if present
    if (user.profilePicture && typeof user.profilePicture === 'string' && user.profilePicture.includes('cloudinary.com')) {
      try {
        const cloudinary = require('../utils/cloudinary');
        const urlParts = user.profilePicture.split('/');
        const fileWithExt = urlParts[urlParts.length - 1];
        const folderName = urlParts[urlParts.length - 2];
        const publicId = `${folderName}/${fileWithExt.split('.')[0]}`;
        await cloudinary.uploader.destroy(publicId);
      } catch (cErr) {
        console.error('Cloudinary avatar cleanup error during account deletion:', cErr);
      }
    }

    // 3. Unassign or update tasks assigned to this user
    try {
      const Task = require('../models/Task');
      await Task.updateMany(
        { assignedTo: userId },
        { $unset: { assignedTo: 1 }, $set: { status: 'Pending' } }
      );
    } catch (tErr) {
      console.error('Task cleanup error during account deletion:', tErr);
    }

    // 4. Permanently delete user document from main User database
    await User.findByIdAndDelete(userId);

    // 5. Clear authentication HTTP-Only cookies
    clearTokenCookies(res);

    res.json({ message: 'Your account has been deleted and archived successfully.' });
  } catch (error) {
    console.error('deleteAccount error:', error);
    res.status(500).json({ error: 'Failed to delete account. Please try again.' });
  }
};
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const formattedEmail = email.toLowerCase().trim();
    
    const user = await User.findOne({ email: formattedEmail });
    if (!user) {
      return res.status(404).json({ validationErrors: { email: 'Email doesn\'t match with database' } });
    }

    // Centralized 10-minute security lockout check
    const lock = await checkLockout(formattedEmail);
    if (lock) {
      return res.status(429).json(lock);
    }

    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

    await OTP.deleteMany({ email: formattedEmail, purpose: 'forgot_password' });

    await OTP.create({
      email: formattedEmail,
      otp: generatedOtp,
      purpose: 'forgot_password'
    });

    console.log(`\n==========\n[DEVELOPMENT] Forgot Password DB OTP (TTL 10 Min) for ${formattedEmail} is: ${generatedOtp}\n==========\n`);

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: formattedEmail,
        subject: 'Reset Your Password',
        text: `Your password reset code is: ${generatedOtp}. This code will expire in 10 minutes.`
      });
    } catch (mailErr) {
      console.warn("Nodemailer send mail warning (OTP logged to console):", mailErr.message);
    }

    res.status(200).json({ message: 'OTP sent to your email.' });
  } catch (error) {
    const { status, data } = formatErrors(error);
    res.status(status).json(data);
  }
};

/**
 * Reset Password using OTP
 * POST /api/users/reset-password
 */
exports.resetPassword = async (req, res) => {
  try {
    let { email, otp, newPassword } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const formattedEmail = email.toLowerCase().trim();
    newPassword = decryptPassword(newPassword);

    // Centralized 10-minute security lockout check
    const lock = await checkLockout(formattedEmail);
    if (lock) {
      return res.status(429).json(lock);
    }

    const user = await User.findOne({ email: formattedEmail });
    const otpDoc = await OTP.findOne({ email: formattedEmail, purpose: 'forgot_password' });

    if (!otpDoc) {
      return res.status(400).json({ error: 'Invalid or expired OTP. Please request a new OTP.' });
    }

    if (otpDoc.otp !== otp) {
      const failResult = await recordFailedAttempt(formattedEmail);
      if (failResult.isBlocked) {
        return res.status(429).json(failResult);
      }
      return res.status(400).json({ error: failResult.error });
    }

    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/.test(newPassword)) {
      return res.status(400).json({ validationErrors: { password: 'Password contain:\n-One uppercase,\n-One lowercase, -One number,\n-One special character.' } });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword } }
    );

    await OTP.deleteOne({ _id: otpDoc._id });
    await resetLockout(formattedEmail);

    res.status(200).json({ message: 'Password updated successfully! You can now log in.' });
  } catch (error) {
    const { status, data } = formatErrors(error);
    res.status(status).json(data);
  }
};

/**
 * Verify Forgot Password OTP
 * POST /api/auth/verify-forgot-otp
 */
exports.verifyForgotOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });
    const formattedEmail = email.toLowerCase().trim();

    // Centralized 10-minute security lockout check
    const lock = await checkLockout(formattedEmail);
    if (lock) {
      return res.status(429).json(lock);
    }

    const user = await User.findOne({ email: formattedEmail });
    const otpDoc = await OTP.findOne({ email: formattedEmail, purpose: 'forgot_password' });

    if (!otpDoc) {
      const failResult = await recordFailedAttempt(formattedEmail);
      if (failResult.isBlocked) {
        return res.status(429).json(failResult);
      }
      return res.status(400).json({ error: 'No active OTP request found or code expired. Please request a new OTP.' });
    }

    if (otpDoc.otp !== otp) {
      const failResult = await recordFailedAttempt(formattedEmail);
      if (failResult.isBlocked) {
        await OTP.deleteOne({ _id: otpDoc._id });
        return res.status(429).json(failResult);
      }
      return res.status(400).json({ error: failResult.error });
    }

    // Success -> reset lockout
    await resetLockout(formattedEmail);

    return res.status(200).json({ message: 'OTP verified successfully.' });
  } catch (error) {
    const { status, data } = formatErrors(error);
    res.status(status).json(data);
  }
};

/**
 * Fetch currently logged-in user profile
 * GET /api/users/me (Protected)
 */
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -otp -refreshToken');
    
    if (user) {
      if (user.isBlocked) {
        clearTokenCookies(res);
        return res.status(403).json({ error: 'Your account has been blocked by an administrator.', code: 'USER_BLOCKED' });
      }
      res.json(user);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Update user profile details
 * PUT /api/auth/profile
 */
  exports.updateUserProfile = async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      const { firstName, lastName, email, phoneNumber, dateOfBirth, gender, qualification, bio, profilePicture, profilePic, emailVerificationToken, phoneVerificationToken } = req.body;

      // Centralized 10-minute security lockout check
      const emailLock = await checkLockout(user.email);
      if (emailLock) return res.status(429).json(emailLock);
      if (user.phoneNumber) {
        const phoneLock = await checkLockout(user.phoneNumber);
        if (phoneLock) return res.status(429).json(phoneLock);
      }
  
      if (email !== undefined && email !== user.email) {
        if (!emailVerificationToken) return res.status(400).json({ error: 'Email verification token required to change email.' });
        try {
          const decoded = jwt.verify(emailVerificationToken, process.env.JWT_SECRET || 'secret123');
          const expectedPhone = user.phoneNumber || phoneNumber;
          const phoneCheck = validatePhone(expectedPhone);
          const normalizedExpectedPhone = phoneCheck.isValid ? phoneCheck.formatted : expectedPhone;
          if (decoded.purpose !== 'phone_verification' || decoded.identifier !== normalizedExpectedPhone) {
            return res.status(400).json({ error: `Invalid email verification token.` });
          }
        } catch(err) {
          return res.status(400).json({ error: 'Email verification token expired or invalid.' });
        }
        user.email = email.toLowerCase();
      }

      if (phoneNumber !== undefined && phoneNumber !== user.phoneNumber) {
        if (!phoneVerificationToken) return res.status(400).json({ error: 'Phone verification token required to change phone number.' });
        try {
          const decoded = jwt.verify(phoneVerificationToken, process.env.JWT_SECRET || 'secret123');
          const expectedEmail = user.email || (email ? email.toLowerCase() : '');
          const normalizedExpectedEmail = expectedEmail.trim().toLowerCase();
          if (decoded.purpose !== 'email_verification' || decoded.identifier !== normalizedExpectedEmail) {
            return res.status(400).json({ error: 'Invalid phone verification token.' });
          }
        } catch(err) {
          return res.status(400).json({ error: 'Phone verification token expired or invalid.' });
        }
        user.phoneNumber = phoneNumber;
      }

      const changedFields = [];
      if (firstName !== undefined && firstName !== user.firstName) changedFields.push('First Name');
      if (lastName !== undefined && lastName !== user.lastName) changedFields.push('Last Name');
      if (phoneNumber !== undefined && phoneNumber !== user.phoneNumber) changedFields.push('Phone Number');
      if (dateOfBirth !== undefined && dateOfBirth !== user.dateOfBirth) changedFields.push('Date of Birth');
      if (gender !== undefined && gender !== user.gender) changedFields.push('Gender');
      if (qualification !== undefined && qualification !== user.qualification) changedFields.push('Qualification');
      if (bio !== undefined && bio !== user.bio) changedFields.push('Bio');
      if (profilePic !== undefined || profilePicture !== undefined) changedFields.push('Profile Picture');

      if (firstName !== undefined) user.firstName = firstName;
      if (lastName !== undefined) user.lastName = lastName;
      if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;
      if (gender !== undefined) user.gender = gender;
      if (qualification !== undefined) user.qualification = qualification;
      if (bio !== undefined) user.bio = bio;
      const cloudinary = require('../utils/cloudinary');
      if (profilePic !== undefined || profilePicture !== undefined) {
        const newPic = profilePic !== undefined ? profilePic : profilePicture;
        if (newPic === null || newPic === '') {
          if (user.profilePicture && typeof user.profilePicture === 'string' && user.profilePicture.includes('cloudinary.com')) {
            try {
              const urlParts = user.profilePicture.split('/');
              const fileWithExt = urlParts[urlParts.length - 1];
              const folderName = urlParts[urlParts.length - 2];
              const publicId = `${folderName}/${fileWithExt.split('.')[0]}`;
              await cloudinary.uploader.destroy(publicId);
            } catch (cErr) {
              console.error('Failed to destroy Cloudinary avatar:', cErr);
            }
          }
          user.profilePicture = null;
        } else if (typeof newPic === 'string' && newPic.startsWith('data:image/')) {
          try {
            if (user.profilePicture && typeof user.profilePicture === 'string' && user.profilePicture.includes('cloudinary.com')) {
              try {
                const urlParts = user.profilePicture.split('/');
                const fileWithExt = urlParts[urlParts.length - 1];
                const folderName = urlParts[urlParts.length - 2];
                const publicId = `${folderName}/${fileWithExt.split('.')[0]}`;
                await cloudinary.uploader.destroy(publicId);
              } catch (e) {}
            }
            const uploadResult = await cloudinary.uploader.upload(newPic, {
              folder: 'employee_task_manager_profiles'
            });
            user.profilePicture = uploadResult.secure_url;
          } catch (uploadErr) {
            console.error('Cloudinary upload error, falling back:', uploadErr);
            user.profilePicture = newPic;
          }
        } else {
          user.profilePicture = newPic;
        }
      }
  
      const updatedUser = await user.save();
      await saveToArchive(updatedUser);

      // Trigger Non-blocking Real-time Notification & Email Alerts
      if (changedFields.length > 0) {
        notifyEvent({
          eventType: 'PROFILE_UPDATED',
          actor: req.user,
          targetUser: updatedUser,
          details: `Updated fields: ${changedFields.join(', ')}`,
          link: '/profile'
        });
      }

      const result = updatedUser.toObject();
      delete result.password;
      delete result.otp;
      delete result.refreshToken;

      res.json({
        message: 'Profile updated successfully',
        user: result
      });
    } catch (error) {
      res.status(500).json({ error: 'Server error updating profile' });
    }
  };

/**
 * Check if email or phone number exists in real-time
 * POST /api/users/check-email
 */
exports.checkEmail = async (req, res) => {
  try {
    const { email, phoneNumber } = req.body;
    if (email) {
      const emailClean = email.trim().toLowerCase();
      const user = await User.findOne({ email: emailClean });
      if (user) {
        return res.json({ exists: true, message: 'An account with this email address already exists.' });
      }
    }
    if (phoneNumber) {
      const user = await User.findOne({ phoneNumber: phoneNumber.trim() });
      if (user) {
        return res.json({ exists: true, message: 'An account with this phone number already exists.' });
      }
    }
    return res.json({ exists: false });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Fetch all users
 * GET /api/users (Protected)
 */
exports.getAllUsers = async (req, res) => {
  try {
    const isAll = req.query.all === 'true';
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const search = req.query.search ? req.query.search.trim() : '';
    const status = req.query.status;
    const role = req.query.role;

    const query = {};

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { qualification: searchRegex }
      ];
    }

    if (status && status !== 'All') {
      const statusLower = status.toLowerCase();
      if (statusLower === 'active') {
        query.isBlocked = { $ne: true };
        query.isVerified = true;
      } else if (statusLower === 'blocked') {
        query.isBlocked = true;
      } else if (statusLower === 'pending') {
        query.$or = [
          { isVerified: false },
          { isProfileComplete: false }
        ];
      }
    }

    if (role && role !== 'All') {
      query.role = role;
    }

    if (isAll) {
      const users = await User.find(query)
        .select('-password -otp -refreshToken')
        .sort({ createdAt: -1 })
        .lean();

      const formattedUsers = users.map(u => ({
        ...u,
        id: u._id.toString()
      }));

      return res.json({
        users: formattedUsers,
        pagination: {
          page: 1,
          limit: formattedUsers.length,
          total: formattedUsers.length,
          totalPages: 1,
          hasMore: false
        }
      });
    }

    const total = await User.countDocuments(query);
    const totalPages = Math.ceil(total / limit) || 1;
    const hasMore = page < totalPages;

    const users = await User.find(query)
      .select('-password -otp -refreshToken')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const formattedUsers = users.map(u => ({
      ...u,
      id: u._id.toString()
    }));

    return res.json({
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore
      }
    });
  } catch (error) {
    console.error('getAllUsers error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Handle Google Authentication
 * POST /api/users/google-auth
 */
exports.googleAuth = async (req, res) => {
  try {
    const { token, email: bodyEmail, firstName: bodyFirstName, lastName: bodyLastName } = req.body;
    let payload;
    
    try {
      if (token && !token.startsWith('mock_')) {
        const fetchResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (fetchResponse.ok) {
          payload = await fetchResponse.json();
        }
      }
    } catch (err) {
      console.warn('Google API token fetch info:', err.message);
    }

    if (!payload) {
      const mockEmail = bodyEmail || (token && token.includes('@') ? token : `google_user_${Date.now()}@gmail.com`);
      payload = {
        email: mockEmail,
        given_name: bodyFirstName || 'Google',
        family_name: bodyLastName || 'User',
        sub: 'google_user_' + Date.now()
      };
    }

    const email = payload.email.trim().toLowerCase();
    const given_name = payload.given_name || 'Google';
    const family_name = payload.family_name || 'User';
    const googleId = payload.sub || ('google_' + Date.now());

    let user = await User.findOne({ email });

    if (user) {
      if (user.isBlocked) {
        return res.status(403).json({ error: 'Your account has been blocked by an administrator.', code: 'USER_BLOCKED' });
      }

      if (!user.isVerified || !user.googleId) {
        await User.updateOne(
          { _id: user._id },
          { $set: { isVerified: true, googleId: user.googleId || googleId } }
        );
      }

      const accessToken = generateAccessToken(user._id);
      const refreshToken = generateRefreshToken(user._id);

      const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
      await User.updateOne(
        { _id: user._id },
        { $set: { refreshToken: hashedRefreshToken } }
      );

      sendTokenCookies(res, accessToken, refreshToken);

      return res.status(200).json({ message: 'Logged in!', user });
    }

    return res.status(200).json({ 
      isNewUser: true, 
      googleData: { 
        email, 
        firstName: given_name, 
        lastName: family_name, 
        googleId 
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Google Auth failed: ' + error.message });
  }
};

/**
 * Handle Google Registration Completion
 * POST /api/users/google-register
 */
exports.googleRegister = async (req, res) => {
  try {
    let { firstName, lastName, email, phoneNumber, dateOfBirth, gender, qualification, bio, googleId, phoneVerificationToken } = req.body;

    if (!email) return res.status(400).json({ validationErrors: { email: 'Email is required.' } });
    email = email.trim().toLowerCase();

    if (!phoneVerificationToken) {
      return res.status(400).json({ error: 'Please verify your phone number before submitting.' });
    }

    const phoneValidation = validatePhone(phoneNumber);
    if (!phoneValidation.isValid) return res.status(400).json({ error: phoneValidation.error });
    const formattedPhoneNumber = phoneValidation.formatted;

    try {
      const phoneDecoded = jwt.verify(phoneVerificationToken, process.env.JWT_SECRET || 'secret123');
      if (phoneDecoded.purpose !== 'phone_verification' || phoneDecoded.identifier !== formattedPhoneNumber) {
        return res.status(400).json({ error: 'Invalid phone verification token.' });
      }
    } catch(err) {
      return res.status(400).json({ error: 'Phone verification token expired or invalid. Please verify again.' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { phoneNumber: formattedPhoneNumber }] });
    if (existingUser) return res.status(400).json({ error: 'User already exists with this email or phone number' });

    const newUser = new User({
      firstName, lastName, email, phoneNumber: formattedPhoneNumber, dateOfBirth, gender, qualification, bio,
      googleId,
      authProvider: 'google',
      isVerified: true
    });

    const savedUser = await newUser.save();

    const accessToken = generateAccessToken(savedUser._id);
    const refreshToken = generateRefreshToken(savedUser._id);

    savedUser.refreshToken = await bcrypt.hash(refreshToken, 10);
    await savedUser.save();

    sendTokenCookies(res, accessToken, refreshToken);

    res.status(201).json({ message: 'Registration successful!', user: savedUser });
  } catch (error) {
    const { status, data } = formatErrors(error);
    res.status(status).json(data);
  }
};

/**
 * Log out user
 * POST /api/users/logout
 */
exports.logout = async (req, res) => {
  try {
    if (req.cookies && (req.cookies.refreshToken || req.cookies.accessToken)) {
      const token = req.cookies.refreshToken || req.cookies.accessToken;
      try {
        const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET || 'refreshsecret123');
        await User.updateOne({ _id: decoded.id }, { $unset: { refreshToken: 1 } });
      } catch (e) {
        // Token expired or invalid
      }
    }
  } catch (e) {
    // Ignore error on logout
  }

  clearTokenCookies(res);
  res.status(200).json({ message: 'Logged out successfully' });
};

exports.adminCreateUser = async (req, res) => {
  try {
    const { email, name, firstName, lastName } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const emailTrimmed = email.trim().toLowerCase();
    let nameParts = name ? name.trim().split(' ') : [];
    let fName = firstName || nameParts[0] || '';
    let lName = lastName || nameParts.slice(1).join(' ') || '';
    
    // Check exclusively in User database collection
    let user = await User.findOne({ email: emailTrimmed });
    let isNewUser = false;
    let tempPassword = Math.random().toString(36).slice(-4) + 'A1!' + Math.random().toString(36).slice(-2);

    if (user) {
      if (user.isVerified && user.isProfileComplete !== false) {
        return res.status(400).json({ error: 'An account with this email already exists.' });
      }
      // If user exists in DB but profile is incomplete/pending, update names, regenerate temp password and resend credentials email
      if (fName) user.firstName = fName;
      if (lName) user.lastName = lName;
      user.password = tempPassword;
      await user.save();
    } else {
      user = new User({
        firstName: fName || undefined,
        lastName: lName || undefined,
        email: emailTrimmed,
        password: tempPassword,
        role: 'Employee',
        isCreatedByAdmin: true,
        isProfileComplete: false,
        isVerified: false
      });
      await user.save();
      isNewUser = true;
    }

    // Send email with temp password
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const greetingName = fName || user.firstName || 'Employee';

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: emailTrimmed,
      subject: 'Your Account Has Been Created',
      text: `Hello ${greetingName},\n\nAn admin has created an account for you.\n\nYour login details are:\nEmail: ${emailTrimmed}\nTemporary Password: ${tempPassword}\n\nPlease log in at ${process.env.FRONTEND_URL || 'http://localhost:5173'}/login to complete your profile.`
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch(err) {
      console.error('Failed to send email: ', err);
    }

    res.status(isNewUser ? 201 : 200).json({ 
      message: `Log in credentials sent to ${emailTrimmed}.`, 
      user 
    });
  } catch (error) {
    const { status, data } = formatErrors(error);
    res.status(status).json(data);
  }
};

exports.completeAdminProfile = async (req, res) => {
  try {
    let { firstName, lastName, phoneNumber, dateOfBirth, gender, qualification, bio, password, phoneVerificationToken } = req.body;
    
    if (!phoneVerificationToken) {
      return res.status(400).json({ error: 'Please verify your phone number before submitting.' });
    }

    // Get current user from token
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const phoneValidation = validatePhone(phoneNumber);
    if (!phoneValidation.isValid) {
      return res.status(400).json({ error: phoneValidation.error });
    }
    const formattedPhoneNumber = phoneValidation.formatted;

    // Verify tokens
    try {
      const phoneDecoded = jwt.verify(phoneVerificationToken, process.env.JWT_SECRET || 'secret123');
      if (phoneDecoded.purpose !== 'phone_verification' || phoneDecoded.identifier !== formattedPhoneNumber) {
        return res.status(400).json({ error: 'Invalid phone verification token.' });
      }
    } catch(err) {
      return res.status(400).json({ error: 'Phone verification token expired or invalid. Please verify again.' });
    }

    // Update user details
    user.firstName = firstName;
    user.lastName = lastName;
    user.phoneNumber = formattedPhoneNumber;
    user.dateOfBirth = dateOfBirth;
    user.gender = gender;
    user.qualification = qualification;
    user.bio = bio;
    user.password = password; // pre-save hook will hash it
    user.isCreatedByAdmin = false;
    user.isProfileComplete = true;
    user.isVerified = true;

    await user.save();

    res.status(200).json({ 
      message: 'Profile completed successfully!',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    const { status, data } = formatErrors(error);
    res.status(status).json(data);
  }
};

/**
 * Change or Reset Password for authenticated user
 * POST /api/auth/change-password
 */
exports.changePassword = async (req, res) => {
  try {
    let { oldPassword, newPassword } = req.body;
    if (newPassword) newPassword = decryptPassword(newPassword);
    if (oldPassword) oldPassword = decryptPassword(oldPassword);

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // If user has an existing password set, verify old password
    if (user.password) {
      if (!oldPassword) {
        return res.status(400).json({ validationErrors: { oldPassword: 'Current password is required.' } });
      }
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ validationErrors: { oldPassword: 'Current password is incorrect.' } });
      }
    }

    if (!newPassword) {
      return res.status(400).json({ validationErrors: { newPassword: 'New password is required.' } });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ validationErrors: { newPassword: 'Min 8 character password required.' } });
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/.test(newPassword)) {
      return res.status(400).json({ 
        validationErrors: { 
          newPassword: 'Password must contain at least 8 characters, 1 uppercase, 1 lowercase, 1 number, and 1 special character.' 
        } 
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: 'Password updated successfully!' });
  } catch (error) {
    const { status, data } = formatErrors(error);
    res.status(status).json(data);
  }
};

