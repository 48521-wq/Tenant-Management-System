// ============================================================
// TMS — Auth & Authorisation Middleware
// ============================================================
'use strict';

const jwtLib   = require('jsonwebtoken');
const UserModel = require('../models/User');

const BEARER_PREFIX = 'Bearer';

// ─────────────────────────────────────────────────────────────
// protect
// Extracts the Bearer JWT, verifies it, loads the matching
// user from MongoDB (or short-circuits for admin tokens),
// and attaches the result to req.user.
// ─────────────────────────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    // Step 1 — pull token out of Authorization header
    let extractedToken = null;
    const headerValue  = req.headers.authorization;

    if (headerValue && headerValue.startsWith(BEARER_PREFIX)) {
      extractedToken = headerValue.split(' ')[1];
    }

    if (!extractedToken) {
      return res.status(401).json({ success: false, message: 'Not authorized.' });
    }

    // Step 2 — verify and decode
    const decoded = jwtLib.verify(extractedToken, process.env.JWT_SECRET);

    // Step 3a — admin tokens have isAdmin flag; skip DB entirely
    if (decoded.isAdmin) {
      req.user = { isAdmin: true, email: decoded.email };
      return next();
    }

    // Step 3b — load regular user record
    const loadedUser = await UserModel.findById(decoded.id);
    if (!loadedUser) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }
    if (loadedUser.status === 'blocked') {
      return res.status(403).json({ success: false, message: 'Account suspended.' });
    }

    req.user = loadedUser;
    next();
  } catch (tokenErr) {
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

// ─────────────────────────────────────────────────────────────
// adminOnly
// Gate middleware — call after protect.
// Returns 403 for any non-admin caller.
// ─────────────────────────────────────────────────────────────
const adminOnly = (req, res, next) => {
  if (req.user && req.user.isAdmin) return next();
  return res.status(403).json({ success: false, message: 'Admin access required.' });
};

module.exports = { protect, adminOnly };
