// Authentication middleware for TMS routes
const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// Middleware: verify JWT and attach user to request
const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer'))
      token = req.headers.authorization.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Not authorized.' });

    const decodedPayload = jwt.verify(token, process.env.JWT_SECRET);

    // Admin token has isAdmin flag — no DB lookup needed
    if (decodedPayload.isAdmin) {
      req.user = { isAdmin: true, email: decodedPayload.email };
      return next();
    }

    const foundUser = await User.findById(decodedPayload.id);
    if (!foundUser) return res.status(401).json({ success: false, message: 'User not found.' });
    if (foundUser.status === 'blocked') return res.status(403).json({ success: false, message: 'Account suspended.' });
    req.user = foundUser;
    next();
  } catch (e) { res.status(401).json({ success: false, message: 'Invalid token.' }); }
};

// Middleware: restrict route to admin only
const adminOnly = (req, res, next) => {
  if (req.user?.isAdmin) return next();
  res.status(403).json({ success: false, message: 'Admin access required.' });
};

module.exports = { protect, adminOnly };
