/**
 * @file auth.js
 * @description JWT verification and role-based access control middleware.
 *
 * Exports:
 *   protect   → Verifies Bearer JWT. Attaches authenticated user to req.user.
 *   adminOnly → Restricts route to admin callers only. Must follow protect.
 *
 * Usage:
 *   router.get('/secure',       protect,            handler);
 *   router.delete('/admin/:id', protect, adminOnly, handler);
 */

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// HTTP status codes as named constants
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN    = 403;

// Authorization header prefix
const BEARER_PREFIX = 'Bearer ';

// ── Response helpers ───────────────────────────────────────────

const rejectUnauthorized = (res, message = 'Not authorized.') =>
  res.status(HTTP_UNAUTHORIZED).json({ success: false, message });

const rejectForbidden = (res, message = 'Access denied.') =>
  res.status(HTTP_FORBIDDEN).json({ success: false, message });

// ── Token extraction ───────────────────────────────────────────

/**
 * Extracts the raw JWT from the Authorization header.
 * Returns null if the header is missing or malformed.
 *
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function extractBearerToken(req) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith(BEARER_PREFIX)) {
    return authHeader.slice(BEARER_PREFIX.length);
  }
  return null;
}

// ── protect middleware ─────────────────────────────────────────

/**
 * Verifies the incoming JWT and attaches the caller's identity to req.user.
 *
 * Flow:
 *   1. Extract Bearer token from Authorization header
 *   2. Verify signature and expiry using JWT_SECRET
 *   3. Admin token  → attach { isAdmin: true, email } — no DB lookup needed
 *   4. Regular user → fetch User document from MongoDB
 *   5. Reject if account is blocked
 *   6. Attach user to req.user and call next()
 *
 * @type {import('express').RequestHandler}
 */
const protect = async (req, res, next) => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return rejectUnauthorized(res, 'Not authorized. No token provided.');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Admin has no DB document — build stub directly from token payload
    if (decoded.isAdmin) {
      req.user = { isAdmin: true, email: decoded.email };
      return next();
    }

    // Fetch regular user by ID stored in the token
    const user = await User.findById(decoded.id);
    if (!user) {
      return rejectUnauthorized(res, 'User not found.');
    }

    // Block suspended accounts regardless of token validity
    if (user.status === 'blocked') {
      return rejectForbidden(res, 'Account suspended. Contact admin.');
    }

    req.user = user;
    next();

  } catch (err) {
    rejectUnauthorized(res, 'Invalid or expired token.');
  }
};

// ── adminOnly middleware ───────────────────────────────────────

/**
 * Allows only admin callers through.
 * Must be used after protect (req.user must already be set).
 *
 * @type {import('express').RequestHandler}
 */
const adminOnly = (req, res, next) => {
  if (req.user && req.user.isAdmin) return next();
  rejectForbidden(res, 'Admin access required.');
};

module.exports = { protect, adminOnly };
