// ═══════════════════════════════════════════════════════════════
//  Auth Middleware  —  middleware/auth.js
//  Tenant Management System
//
//  Exports two Express middleware functions:
//
//    protect    — Verifies the JWT in the Authorization header.
//                 Attaches the authenticated user to req.user.
//                 Used on any route that requires a logged-in user.
//
//    adminOnly  — Restricts a route to admin users only.
//                 Must be chained AFTER protect.
//
//  Usage example:
//    router.get('/secure', protect, handler);
//    router.delete('/admin-only', protect, adminOnly, handler);
// ═══════════════════════════════════════════════════════════════

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// ── Response helpers ──────────────────────────────────────────
// Centralised so that status codes and message format stay consistent
// across all authentication rejection points.

/**
 * Send a 401 Unauthorized response.
 * @param {Object} res     - Express response object
 * @param {string} message - Human-readable reason
 */
const unauthorized = (res, message = 'Not authorized.') =>
  res.status(401).json({ success: false, message });

/**
 * Send a 403 Forbidden response.
 * @param {Object} res     - Express response object
 * @param {string} message - Human-readable reason
 */
const forbidden = (res, message = 'Access denied.') =>
  res.status(403).json({ success: false, message });

// ── Token extractor ───────────────────────────────────────────

/**
 * Parse the Bearer token from the Authorization header.
 * Returns null if the header is missing or malformed.
 *
 * Expected format:  Authorization: Bearer <token>
 *
 * @param {Object} req - Express request object
 * @returns {string|null} raw JWT string, or null
 */
function extractToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.split(' ')[1];
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
//  protect  —  JWT verification middleware
//
//  Flow:
//    1. Extract Bearer token from Authorization header
//    2. Verify token signature and expiry against JWT_SECRET
//    3. If admin token  → attach { isAdmin: true } to req.user
//    4. If user token   → look up user in MongoDB
//    5. Check account is not blocked
//    6. Attach full user document to req.user and call next()
// ═══════════════════════════════════════════════════════════════
const protect = async (req, res, next) => {
  try {
    // ── Step 1: Extract token ─────────────────────────────────
    const token = extractToken(req);
    if (!token) {
      return unauthorized(res, 'Not authorized. No token provided.');
    }

    // ── Step 2: Verify JWT signature and expiry ───────────────
    // Throws TokenExpiredError or JsonWebTokenError on failure
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ── Step 3: Admin shortcut ────────────────────────────────
    // Admin tokens carry an isAdmin flag and do not map to a DB record.
    // The admin account is managed entirely via .env variables.
    if (decoded.isAdmin) {
      req.user = {
        isAdmin: true,
        email:   decoded.email,
      };
      return next();
    }

    // ── Step 4: Regular user — look up in database ────────────
    const user = await User.findById(decoded.id);
    if (!user) {
      return unauthorized(res, 'User not found.');
    }

    // ── Step 5: Check account status ─────────────────────────
    // Blocked accounts cannot access any protected route
    if (user.status === 'blocked') {
      return forbidden(res, 'Account suspended. Contact admin.');
    }

    // ── Step 6: Attach user and proceed ──────────────────────
    req.user = user;
    next();

  } catch (err) {
    // Handles: TokenExpiredError, JsonWebTokenError, NotBeforeError
    unauthorized(res, 'Invalid or expired token.');
  }
};

// ═══════════════════════════════════════════════════════════════
//  adminOnly  —  Role guard middleware
//
//  Restricts the route to admin users only.
//  MUST be used after the protect middleware so that req.user
//  is already populated before this check runs.
//
//  Usage:  router.delete('/:id', protect, adminOnly, handler);
// ═══════════════════════════════════════════════════════════════
const adminOnly = (req, res, next) => {
  if (req.user && req.user.isAdmin) return next();
  forbidden(res, 'Admin access required.');
};

module.exports = { protect, adminOnly };
