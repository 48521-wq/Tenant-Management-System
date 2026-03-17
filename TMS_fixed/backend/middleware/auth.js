// ─────────────────────────────────────────────────────────────────
//  Auth Middleware  —  TMS
//  Handles JWT verification and role-based access control
// ─────────────────────────────────────────────────────────────────

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// ── Response helpers ─────────────────────────────────────────────
const unauthorized = (res, msg = 'Not authorized.')      => res.status(401).json({ success: false, message: msg });
const forbidden    = (res, msg = 'Access denied.')       => res.status(403).json({ success: false, message: msg });

// ── Extract Bearer token from Authorization header ───────────────
function extractToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.split(' ')[1];
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────
//  protect  —  Verifies JWT and attaches user to req.user
//  Works for both admin tokens and regular user tokens
// ─────────────────────────────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    // 1. Extract token
    const token = extractToken(req);
    if (!token) return unauthorized(res, 'Not authorized. No token provided.');

    // 2. Verify token signature and expiry
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Admin shortcut — admin tokens carry isAdmin flag directly
    if (decoded.isAdmin) {
      req.user = { isAdmin: true, email: decoded.email };
      return next();
    }

    // 4. Regular user — look up in database
    const user = await User.findById(decoded.id);
    if (!user) return unauthorized(res, 'User not found.');

    // 5. Check account status
    if (user.status === 'blocked') return forbidden(res, 'Account suspended.');

    // 6. Attach user and proceed
    req.user = user;
    next();

  } catch (e) {
    // Covers TokenExpiredError, JsonWebTokenError, etc.
    unauthorized(res, 'Invalid token.');
  }
};

// ─────────────────────────────────────────────────────────────────
//  adminOnly  —  Restricts route to admin users only
//  Must be used after protect middleware
// ─────────────────────────────────────────────────────────────────
const adminOnly = (req, res, next) => {
  if (req.user && req.user.isAdmin) return next();
  forbidden(res, 'Admin access required.');
};

module.exports = { protect, adminOnly };
