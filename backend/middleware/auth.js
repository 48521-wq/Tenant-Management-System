/**
 * @file auth.js
 * @description JWT verification and role-based access control middleware.
 *
 * Exports:
 *   protect   — Verifies Bearer JWT and attaches the caller to req.user.
 *   adminOnly — Blocks non-admin callers. Must be used after protect.
 *
 * Usage:
 *   router.get('/secure',       protect,            handler);
 *   router.delete('/admin/:id', protect, adminOnly, handler);
 */

'use strict';

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// ── HTTP status constants ──────────────────────────────────────
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN    = 403;

// Authorization header scheme prefix
const BEARER_PREFIX = 'Bearer ';

// ── Response helpers ───────────────────────────────────────────

/** Sends a 401 Unauthorized JSON response. */
const sendUnauthorized = (res, message = 'Not authorized.') =>
  res.status(HTTP_UNAUTHORIZED).json({ success: false, message });

/** Sends a 403 Forbidden JSON response. */
const sendForbidden = (res, message = 'Access denied.') =>
  res.status(HTTP_FORBIDDEN).json({ success: false, message });

// ── Token extraction ───────────────────────────────────────────

/**
 * Reads the raw JWT string from the Authorization request header.
 * Returns null when the header is absent or does not use the Bearer scheme.
 *
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function extractToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith(BEARER_PREFIX)) {
    return header.slice(BEARER_PREFIX.length);
  }
  return null;
}

// ── protect ────────────────────────────────────────────────────

/**
 * Middleware: verifies the incoming JWT and populates req.user.
 *
 * Flow:
 *   1. Extract Bearer token from the Authorization header
 *   2. Verify signature and expiry against JWT_SECRET
 *   3. Admin token  → attach { isAdmin: true, email } (no DB lookup)
 *   4. Regular user → load User document from MongoDB by token id
 *   5. Reject blocked accounts with 403
 *   6. Attach resolved identity to req.user and call next()
 *
 * @type {import('express').RequestHandler}
 */
const protect = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return sendUnauthorized(res, 'Not authorized. No token provided.');
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Admin has no MongoDB document — build identity from token payload
    if (payload.isAdmin) {
      req.user = { isAdmin: true, email: payload.email };
      return next();
    }

    // Regular users: resolve the full document by the id embedded in the token
    const user = await User.findById(payload.id);
    if (!user) {
      return sendUnauthorized(res, 'User not found.');
    }

    // Suspended accounts are denied even with a valid token
    if (user.status === 'blocked') {
      return sendForbidden(res, 'Account suspended. Contact admin.');
    }

    req.user = user;
    next();

  } catch (_err) {
    sendUnauthorized(res, 'Invalid or expired token.');
  }
};

// ── adminOnly ──────────────────────────────────────────────────

/**
 * Middleware: permits only admin callers to proceed.
 * Must be placed after protect in the middleware chain.
 *
 * @type {import('express').RequestHandler}
 */
const adminOnly = (req, res, next) => {
  if (req.user && req.user.isAdmin) return next();
  sendForbidden(res, 'Admin access required.');
};

module.exports = { protect, adminOnly };
