// ═══════════════════════════════════════════════
//  Auth Middleware — Verify JWT token
// ═══════════════════════════════════════════════
const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized. No token provided.' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Admin check (not in DB)
    if (decoded.isAdmin) {
      req.user = { isAdmin: true, email: decoded.email };
      return next();
    }

    // Regular user — fetch from DB
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }
    if (user.status === 'blocked') {
      return res.status(403).json({ success: false, message: 'Account suspended. Contact admin.' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

// Admin only middleware
const adminOnly = (req, res, next) => {
  if (req.user?.isAdmin) return next();
  res.status(403).json({ success: false, message: 'Admin access required.' });
};

module.exports = { protect, adminOnly };
