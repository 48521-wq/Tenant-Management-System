// ============================================================
// TMS Authentication Middleware
// ============================================================
const jwt      = require('jsonwebtoken');
const User     = require('../models/User');

// ─── protect — verify JWT token and load user ───────────────
const protect = async (req, res, next) => {
  try {
    let bearerToken;

    // Extract token from Authorization header
    if (req.headers.authorization?.startsWith('Bearer'))
      bearerToken = req.headers.authorization.split(' ')[1];

    if (!bearerToken)
      return res.status(401).json({ success: false, message: 'Not authorized.' });

    // Verify and decode the token
    const tokenData = jwt.verify(bearerToken, process.env.JWT_SECRET);

    // Admin token carries isAdmin flag — skip DB lookup
    if (tokenData.isAdmin) {
      req.user = { isAdmin: true, email: tokenData.email };
      return next();
    }

    // Load regular user from database
    const dbUser = await User.findById(tokenData.id);
    if (!dbUser)
      return res.status(401).json({ success: false, message: 'User not found.' });
    if (dbUser.status === 'blocked')
      return res.status(403).json({ success: false, message: 'Account suspended.' });

    req.user = dbUser;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

// ─── adminOnly — restrict access to admin users only ────────
const adminOnly = (req, res, next) => {
  if (req.user?.isAdmin) return next();
  res.status(403).json({ success: false, message: 'Admin access required.' });
};

module.exports = { protect, adminOnly };
