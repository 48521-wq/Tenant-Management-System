/**
 * Authentication Middleware
 * JWT-based token verification and role-based access control
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect Route Middleware
 * Validates JWT token and verifies user status
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
const protect = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Token validation
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized - No token provided'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check for admin access
    if (decoded.isAdmin) {
      req.user = {
        isAdmin: true,
        email: decoded.email,
        role: 'admin'
      };
      return next();
    }

    // Fetch user from database
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if account is blocked/suspended
    if (user.status === 'blocked') {
      return res.status(403).json({
        success: false,
        message: 'Account has been suspended',
        reason: 'Contact administrator for more information'
      });
    }

    // Attach user to request object
    req.user = user;
    next();

  } catch (error) {
    console.error('❌ Auth middleware error:', error.message);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: error.message
    });
  }
};

/**
 * Admin Only Middleware
 * Restricts access to admin users only
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
const adminOnly = (req, res, next) => {
  if (req.user?.isAdmin) {
    return next();
  }

  res.status(403).json({
    success: false,
    message: 'Admin access required',
    userRole: req.user?.role || 'unknown'
  });
};

module.exports = { protect, adminOnly };
