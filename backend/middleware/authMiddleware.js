/**
 * @file authMiddleware.js
 * @description Authentication & Authorization Middleware Guard.
 * 
 * WORK OF THIS FILE:
 * - `protect`: Reads `accessToken` from HTTP-Only cookies (or Authorization header), verifies JWT signature, checks `isBlocked` status, and attaches `req.user`.
 * - `adminOnly`: Restricts route access strictly to users with `role === 'Admin'`.
 * 
 * WHY IS IT IN THE FILE STRUCTURE:
 * - Secures private API endpoints against unauthorized access, enforcing cookie-based JWT authentication and role-based access control (RBAC).
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to protect routes.
 * Checks for a valid JSON Web Token (JWT) in the Authorization header.
 * If valid, it fetches the corresponding user from the database and attaches it to the request object.
 * If invalid or missing, it returns a 401 Unauthorized response.
 */
const protect = async (req, res, next) => {
  let token;

  // 1. Check Authorization header first (Bearer <token>)
  if (req.headers.authorization) {
    const authHeader = req.headers.authorization.trim();
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (authHeader.startsWith('Bearer')) {
      token = authHeader.replace(/^Bearer\s*/, '').trim();
    } else {
      token = authHeader;
    }
  }
  
  // 2. Fallback: Check cookies if header is missing
  if (!token && req.cookies) {
    token = req.cookies.accessToken || req.cookies.token;
  }

  // 3. Prevent literal string "null" or "undefined"
  if (token === 'null' || token === 'undefined') {
    token = null;
  }

  if (token) {
    try {
      // Decode and verify the token using the secret key
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');

      // Find the user by ID
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        return res.status(401).json({ error: 'Not authorized, user not found' });
      }

      if (req.user.isBlocked) {
        res.cookie('accessToken', '', { httpOnly: true, expires: new Date(0), path: '/' });
        res.cookie('refreshToken', '', { httpOnly: true, expires: new Date(0), path: '/' });
        res.cookie('token', '', { httpOnly: true, expires: new Date(0), path: '/' });
        return res.status(403).json({ error: 'Your account has been blocked by an administrator.', code: 'USER_BLOCKED' });
      }

      return next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Access token expired', code: 'TOKEN_EXPIRED' });
      }
      return res.status(401).json({ error: 'Not authorized, token failed' });
    }
  }

  return res.status(401).json({ error: 'Not authorized, no token provided', code: 'NO_TOKEN' });
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    next();
  } else {
    res.status(403).json({ error: 'Not authorized as an admin' });
  }
};

module.exports = { protect, adminOnly };
