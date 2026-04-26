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

const jwtLib   = require('jsonwebtoken');
const UserDoc  = require('../models/User');

// HTTP status codes as named constants
const STATUS_UNAUTH    = 401;
const STATUS_FORBIDDEN = 403;

// Authorization header prefix used in Bearer token scheme
const TOKEN_PREFIX = 'Bearer ';

// ── Response helpers ───────────────────────────────────────────

const sendUnauthorized = (res, msg = 'Not authorized.') =>
  res.status(STATUS_UNAUTH).json({ success: false, message: msg });

const sendForbidden = (res, msg = 'Access denied.') =>
  res.status(STATUS_FORBIDDEN).json({ success: false, message: msg });

// ── Token extraction ───────────────────────────────────────────

/**
 * Extracts the raw JWT from the Authorization header.
 * Returns null if the header is missing or malformed.
 *
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function pullBearerToken(req) {
  const headerVal = req.headers.authorization;

  if (headerVal && headerVal.startsWith(TOKEN_PREFIX)) {
    return headerVal.slice(TOKEN_PREFIX.length);
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
    const rawToken = pullBearerToken(req);
    if (!rawToken) {
      return sendUnauthorized(res, 'Not authorized. No token provided.');
    }

    const payload = jwtLib.verify(rawToken, process.env.JWT_SECRET);

    // Admin has no DB document — build stub directly from token payload
    if (payload.isAdmin) {
      req.user = { isAdmin: true, email: payload.email };
      return next();
    }

    // Fetch regular user by ID stored in the token
    const foundUser = await UserDoc.findById(payload.id);
    if (!foundUser) {
      return sendUnauthorized(res, 'User not found.');
    }

    // Block suspended accounts regardless of token validity
    if (foundUser.status === 'blocked') {
      return sendForbidden(res, 'Account suspended. Contact admin.');
    }

    req.user = foundUser;
    next();

  } catch (verifyErr) {
    sendUnauthorized(res, 'Invalid or expired token.');
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
  sendForbidden(res, 'Admin access required.');
};

module.exports = { protect, adminOnly };
