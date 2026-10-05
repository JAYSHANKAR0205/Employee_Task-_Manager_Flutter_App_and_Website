/**
 * @file authRoutes.js
 * @description Express Authentication & User Profile Route Definitions.
 * 
 * WORK OF THIS FILE:
 * - Maps HTTP endpoints (`/register`, `/login`, `/logout`, `/refresh-token`, `/verify-otp`, `/profile`, etc.) to controller functions in `authController.js`.
 * - Includes OpenAPI 3.0 JSDoc annotations for generating interactive API documentation at `/api-docs`.
 * - Applies rate limiting middleware (`authLimiter`) to authentication endpoints to prevent brute-force attacks.
 * 
 * WHY IS IT IN THE FILE STRUCTURE:
 * - Serves as the central API router for all authentication, password management, and user identity endpoints under `/api/auth`.
 */

const express = require('express');
const router = express.Router();
const { register, login, refreshToken, verifyOTP, forgotPassword, resetPassword, verifyForgotOtp, changePassword, getUserProfile, updateUserProfile, checkEmail, getAllUsers, googleAuth, googleRegister, logout, sendVerificationOTP, verifyInlineOTP, adminCreateUser, completeAdminProfile, deleteAccount } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const rateLimit = require('express-rate-limit');

// Rate limiting for auth routes to prevent brute-force and spam
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Validates user input, performs DNS/MX checks, generates a 6-digit OTP code, and sends verification email. Stores unverified users in temporary memory.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *           example:
 *             firstName: "Alex"
 *             lastName: "Rivera"
 *             email: "alex.rivera@example.com"
 *             phoneNumber: "+919876543210"
 *             password: "Password@123"
 *             dateOfBirth: "2000-01-15"
 *             gender: "Male"
 *             qualification: "Graduation"
 *             bio: "Full-stack software developer."
 *     responses:
 *       201:
 *         description: Registration initiated successfully. Verification OTP sent via email.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               message: "Registration successful! Please check your email for the OTP."
 *       400:
 *         description: Validation Error or Duplicate Email/Phone.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrors'
 *       409:
 *         description: Conflict - User already exists with this email or phone number.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "User already exists with this email or phone number"
 *       422:
 *         description: Unprocessable Entity - Invalid email domain or MX lookup failed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal Server Error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/register', authLimiter, register);

router.post('/send-verification-otp', authLimiter, sendVerificationOTP);
router.post('/verify-inline-otp', authLimiter, verifyInlineOTP);
router.post('/admin-create-user', protect, adminCreateUser);
router.post('/complete-admin-profile', protect, completeAdminProfile);

/**
 * @openapi
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify OTP for registration
 *     description: Validates the 6-digit OTP sent to the user's email during registration. Upon verification, permanently saves the user to MongoDB.
 *     tags:
 *       - OTP
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyOTPRequest'
 *           example:
 *             email: "alex.rivera@example.com"
 *             otp: "584920"
 *     responses:
 *       200:
 *         description: Email verified successfully. User document created in database.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               message: "Email verified successfully! You can now log in."
 *       400:
 *         description: Invalid or expired OTP.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Invalid OTP!"
 *       404:
 *         description: Registration session expired or not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Too many failed OTP verification attempts (brute-force lock).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal Server Error.
 */
router.post('/verify-otp', authLimiter, verifyOTP);
router.post('/verify', authLimiter, verifyOTP); // Alias for existing route

/**
 * @openapi
 * /api/auth/resend-otp:
 *   post:
 *     summary: Resend OTP verification code
 *     description: Regenerates and sends a new 6-digit OTP code to the specified email address if registration session is active.
 *     tags:
 *       - OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordRequest'
 *           example:
 *             email: "alex.rivera@example.com"
 *     responses:
 *       200:
 *         description: New OTP code generated and sent via email.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               message: "OTP resent successfully."
 *       400:
 *         description: Invalid request parameters.
 *       404:
 *         description: Active registration session not found.
 *       500:
 *         description: Internal Server Error.
 */
router.post('/resend-otp', authLimiter, (req, res, next) => {
  // Delegate to register/forgotPassword logic or send success for resend flow
  return forgotPassword(req, res, next);
});

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticates user credentials (email & password). Returns a JWT Bearer token valid for 30 days. Requires verified email address.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             email: "alex.rivera@example.com"
 *             password: "Password@123"
 *     responses:
 *       200:
 *         description: Login successful. Returns JWT Bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               message: "Logged in!"
 *               token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2OWM1ZThiNGYxYTJiM2M0ZDVlNmY3YSIsImlhdCI6MTcyMTQ3MjAwMCwiZXhwIjoxNzI0MDY0MDAwfQ.signature"
 *       400:
 *         description: Bad Request / Validation error.
 *       401:
 *         description: Unauthorized - Wrong password.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrors'
 *             example:
 *               validationErrors:
 *                 password: "Wrong password"
 *       403:
 *         description: Forbidden - Email address not verified.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Please verify your email address first!"
 *       404:
 *         description: Not Found - Email does not exist in database.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrors'
 *             example:
 *               validationErrors:
 *                 email: "Email doesn't match with database"
 *       500:
 *         description: Internal Server Error.
 */
router.post('/login', authLimiter, login);
router.post('/refresh-token', refreshToken);
router.post('/refresh', refreshToken);

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     summary: Initiate forgot password flow
 *     description: Sends a 6-digit password reset OTP to the user's email address.
 *     tags:
 *       - Authentication
 *       - OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordRequest'
 *           example:
 *             email: "alex.rivera@example.com"
 *     responses:
 *       200:
 *         description: Reset OTP code sent via email.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               message: "OTP sent to your email."
 *       404:
 *         description: Not Found - Email address does not exist in database.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrors'
 *             example:
 *               validationErrors:
 *                 email: "Email doesn't match with database"
 *       500:
 *         description: Internal Server Error.
 */
router.post('/forgot-password', forgotPassword);

/**
 * @openapi
 * /api/auth/verify-forgot-otp:
 *   post:
 *     summary: Verify password reset OTP
 *     description: Validates the 6-digit password reset OTP before allowing password reset.
 *     tags:
 *       - OTP
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyOTPRequest'
 *           example:
 *             email: "alex.rivera@example.com"
 *             otp: "584920"
 *     responses:
 *       200:
 *         description: OTP verified successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               message: "OTP verified successfully."
 *       400:
 *         description: Invalid or expired OTP.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal Server Error.
 */
router.post('/verify-forgot-otp', verifyForgotOtp);

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset user password
 *     description: Verifies OTP code and updates user password with Bcrypt hashing.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *           example:
 *             email: "alex.rivera@example.com"
 *             otp: "584920"
 *             newPassword: "NewPassword@456"
 *     responses:
 *       200:
 *         description: Password updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               message: "Password updated successfully! You can now log in."
 *       400:
 *         description: Invalid OTP or Password complexity check failed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrors'
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal Server Error.
 */
router.post('/reset-password', resetPassword);
router.post('/change-password', protect, changePassword);
router.put('/change-password', protect, changePassword);

/**
 * @openapi
 * /api/auth/google-login:
 *   post:
 *     summary: Google OAuth 2.0 authentication
 *     description: Authenticates user via Google OAuth 2.0 access token. Logs in existing users or prompts new users to complete their profile.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GoogleLoginRequest'
 *           example:
 *             token: "ya29.a0AfB_byC..."
 *     responses:
 *       200:
 *         description: Login successful (for existing user) OR profile completion required (for new user).
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     isNewUser: { type: boolean, example: true }
 *                     googleData:
 *                       type: object
 *                       properties:
 *                         email: { type: string, example: "alex.rivera@gmail.com" }
 *                         firstName: { type: string, example: "Alex" }
 *                         lastName: { type: string, example: "Rivera" }
 *                         googleId: { type: string, example: "1092384092384" }
 *       400:
 *         description: Invalid Google Access Token.
 *       500:
 *         description: Google Auth verification failed.
 */
router.post('/google-login', authLimiter, googleAuth);
router.post('/google-auth', authLimiter, googleAuth); // Alias
router.post('/google-register', authLimiter, googleRegister); // Full registration handler

/**
 * @openapi
 * /api/auth/profile:
 *   get:
 *     summary: Get current logged-in user profile
 *     description: Retrieves profile details of the authenticated user using JWT Bearer token.
 *     tags:
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Authenticated user profile data.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Unauthorized - Invalid, expired, or missing Bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Not authorized, no token"
 *       404:
 *         description: User not found in database.
 *       500:
 *         description: Internal Server Error.
 *   put:
 *     summary: Update user profile
 *     description: Updates non-sensitive user details (Name, Phone, DOB, Gender, Qualification, Bio).
 *     tags:
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileRequest'
 *     responses:
 *       200:
 *         description: Profile updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Unauthorized - Token failed or missing.
 *       400:
 *         description: Validation Error.
 *       500:
 *         description: Internal Server Error.
 */
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.get('/me', protect, getUserProfile); // Alias
router.delete('/account', protect, deleteAccount);
router.delete('/me', protect, deleteAccount);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: User logout
 *     description: Invalidates the user session client-side by clearing stored JWT bearer token.
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               message: "Logged out successfully."
 *       401:
 *         description: Unauthorized.
 */
router.post('/logout', logout);

/**
 * @openapi
 * /api/users/all:
 *   get:
 *     summary: Get all registered users directory
 *     description: Retrieves list of all registered users sorted by newest registration date. Strips passwords and OTP fields.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of registered users.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Unauthorized - Bearer token required.
 *       500:
 *         description: Internal Server Error.
 */
router.get('/all', protect, getAllUsers);

/**
 * @openapi
 * /api/users/check-email:
 *   post:
 *     summary: Check email availability in real time
 *     description: Checks if an email address already exists in the database or active registration memory cache.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email, example: "alex.rivera@example.com" }
 *     responses:
 *       200:
 *         description: Returns boolean indication whether email exists.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exists: { type: boolean, example: true }
 */
router.post('/check-email', checkEmail);

module.exports = router;
