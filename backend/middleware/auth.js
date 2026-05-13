// ─── Authentication Middleware ────────────────────────────────────────────────
const jwt  = require('jsonwebtoken');
const User = require('../models/User');

/**
 * protect — verifies JWT and attaches user to req.user.
 * Supports both admin tokens and regular user tokens.
 */
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer'))
      token = req.headers.authorization.split(' ')[1];

    if (!token)
      return res.status(401).json({ success: false, message: 'Not authorized.' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Admin token — no DB lookup needed
    if (decoded.isAdmin) {
      req.user = { isAdmin: true, email: decoded.email };
      return next();
    }

    const user = await User.findById(decoded.id);
    if (!user)    return res.status(401).json({ success: false, message: 'User not found.' });
    if (user.status === 'blocked')
      return res.status(403).json({ success: false, message: 'Account suspended.' });

    req.user = user;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

/**
 * adminOnly — gate that rejects non-admin requests.
 * Must be used after protect middleware.
 */
const adminOnly = (req, res, next) => {
  if (req.user?.isAdmin) return next();
  res.status(403).json({ success: false, message: 'Admin access required.' });
};

module.exports = { protect, adminOnly };
