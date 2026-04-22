<<<<<<< HEAD
// ============================================================
// TMS — Authentication & Authorisation Middleware
// ============================================================
'use strict';

const jwt      = require('jsonwebtoken');
const User     = require('../models/User');

// ─────────────────────────────────────────────────────────────
// protect
// Reads the Bearer token from the Authorization header,
// verifies it with JWT_SECRET, then attaches the user
// (or admin stub) to req.user before calling next().
// ─────────────────────────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    // 1. Extract raw token string
    let rawToken = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer')) {
      rawToken = authHeader.split(' ')[1];
    }

    if (!rawToken) {
      return res.status(401).json({ success: false, message: 'Not authorized.' });
    }

    // 2. Verify signature and decode payload
    const claims = jwt.verify(rawToken, process.env.JWT_SECRET);

    // 3a. Admin path — no DB call needed
    if (claims.isAdmin) {
      req.user = { isAdmin: true, email: claims.email };
      return next();
    }

    // 3b. Regular user — fetch from DB
    const requestUser = await User.findById(claims.id);
    if (!requestUser) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }
    if (requestUser.status === 'blocked') {
      return res.status(403).json({ success: false, message: 'Account suspended.' });
    }

    req.user = requestUser;
    next();
  } catch (jwtErr) {
    res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

// ─────────────────────────────────────────────────────────────
// adminOnly
// Must be used after protect.
// Rejects non-admin callers with 403.
// ─────────────────────────────────────────────────────────────
const adminOnly = (req, res, next) => {
  if (req.user && req.user.isAdmin) return next();
=======
const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer'))
      token = req.headers.authorization.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Not authorized.' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.isAdmin) { req.user = { isAdmin: true, email: decoded.email }; return next(); }

    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ success: false, message: 'User not found.' });
    if (user.status === 'blocked') return res.status(403).json({ success: false, message: 'Account suspended.' });
    req.user = user;
    next();
  } catch (e) { res.status(401).json({ success: false, message: 'Invalid token.' }); }
};

const adminOnly = (req, res, next) => {
  if (req.user?.isAdmin) return next();
>>>>>>> 17a4da6032e965253aaaaa7e291f867a3df0f14b
  res.status(403).json({ success: false, message: 'Admin access required.' });
};

module.exports = { protect, adminOnly };
