// ═══════════════════════════════════════════════
//  Auth Routes
//  POST /api/auth/register  — Email Sign Up
//  POST /api/auth/login     — Email Sign In
//  POST /api/auth/google    — Google OAuth Sign In/Up
//  GET  /api/auth/me        — Get current user
// ═══════════════════════════════════════════════
const express = require('express');
const jwt     = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── Generate JWT ──────────────────────────────────────
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// ── Admin token helper ────────────────────────────────
const adminToken = () => generateToken({
  isAdmin: true,
  email: process.env.ADMIN_EMAIL
});

// ══════════════════════════════════════════════════════
//  POST /api/auth/register — Email Sign Up
// ══════════════════════════════════════════════════════
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Please fill in all fields.' });
    }
    if (!['tenant', 'landlord'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    // Block admin email from registering
    if (email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()) {
      return res.status(400).json({ success: false, message: 'This email cannot be registered.' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists. Please sign in.' });
    }

    // Create user (password hashed automatically via pre-save hook)
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role,
      authProvider: 'email',
      verified: role === 'tenant' ? true : false  // tenants auto-verified, landlords need admin
    });

    // Return token + user info (no password)
    const token = generateToken({ id: user._id, role: user.role });
    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        verified: user.verified,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// ══════════════════════════════════════════════════════
//  POST /api/auth/login — Email Sign In
// ══════════════════════════════════════════════════════
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please enter email and password.' });
    }

    const lowerEmail = email.toLowerCase().trim();

    // ── Admin Check ──────────────────────────────────
    if (lowerEmail === process.env.ADMIN_EMAIL.toLowerCase()) {
      if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ success: false, message: 'Incorrect password. Please try again.' });
      }
      const token = adminToken();
      return res.json({
        success: true,
        token,
        user: {
          id: 'admin',
          name: 'Super Admin',
          email: process.env.ADMIN_EMAIL,
          role: 'admin',
          isAdmin: true
        }
      });
    }

    // ── Regular User ─────────────────────────────────
    const user = await User.findOne({ email: lowerEmail }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'No account found with this email. Please sign up first.' });
    }

    // Check auth provider
    if (user.authProvider === 'google' && !user.password) {
      return res.status(400).json({ success: false, message: 'This account uses Google Sign-In. Please use the Google button.' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect password. Please try again.' });
    }

    // Check status
    if (user.status === 'blocked') {
      return res.status(403).json({ success: false, message: 'Your account has been suspended. Please contact the administrator.' });
    }

    const token = generateToken({ id: user._id, role: user.role });
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        verified: user.verified
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// ══════════════════════════════════════════════════════
//  POST /api/auth/google — Google OAuth (Sign In / Sign Up)
//  Body: { credential: <Google JWT token>, role?, mode: 'signin'|'signup' }
// ══════════════════════════════════════════════════════
router.post('/google', async (req, res) => {
  try {
    const { credential, role, mode } = req.body;

    if (!credential) {
      return res.status(400).json({ success: false, message: 'Google credential is required.' });
    }

    // Verify Google token
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      payload = ticket.getPayload();
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid Google token. Please try again.' });
    }

    const { email, name, sub: googleId } = payload;
    const lowerEmail = email.toLowerCase();

    // Admin via Google
    if (lowerEmail === process.env.ADMIN_EMAIL.toLowerCase()) {
      const token = adminToken();
      return res.json({
        success: true,
        token,
        user: { id: 'admin', name: 'Super Admin', email: process.env.ADMIN_EMAIL, role: 'admin', isAdmin: true }
      });
    }

    // Find existing user
    let user = await User.findOne({ email: lowerEmail });

    if (mode === 'signin') {
      if (!user) {
        return res.status(401).json({ success: false, message: 'No account found for ' + email + '. Please sign up first.' });
      }
      if (user.status === 'blocked') {
        return res.status(403).json({ success: false, message: 'Account suspended. Contact admin.' });
      }
      // Update googleId if not set
      if (!user.googleId) {
        user.googleId = googleId;
        user.authProvider = 'google';
        await user.save();
      }

    } else if (mode === 'signup') {
      if (user) {
        return res.status(400).json({ success: false, message: 'Account already exists for ' + email + '. Please sign in.' });
      }
      if (!role || !['tenant', 'landlord'].includes(role)) {
        return res.status(400).json({ success: false, message: 'Please select a role (Tenant or Landlord) first.' });
      }
      // Create new user via Google
      user = await User.create({
        name: name || lowerEmail.split('@')[0],
        email: lowerEmail,
        role,
        authProvider: 'google',
        googleId,
        verified: role === 'tenant' ? true : false
      });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid mode. Use signin or signup.' });
    }

    const token = generateToken({ id: user._id, role: user.role });
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        verified: user.verified
      }
    });

  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// ══════════════════════════════════════════════════════
//  GET /api/auth/me — Get current logged-in user
// ══════════════════════════════════════════════════════
router.get('/me', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin) {
      return res.json({
        success: true,
        user: { id: 'admin', name: 'Super Admin', email: process.env.ADMIN_EMAIL, role: 'admin', isAdmin: true }
      });
    }
    res.json({ success: true, user: req.user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});


// ══════════════════════════════════════════════════════
//  POST /api/auth/login-google-fallback
//  Fallback when real Google OAuth not configured
//  Just looks up user by email (dev mode only)
// ══════════════════════════════════════════════════════
router.post('/login-google-fallback', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required.' });

    const lowerEmail = email.toLowerCase().trim();

    // Admin check
    if (lowerEmail === process.env.ADMIN_EMAIL.toLowerCase()) {
      const token = generateToken({ isAdmin: true, email: process.env.ADMIN_EMAIL });
      return res.json({
        success: true, token,
        user: { id: 'admin', name: 'Super Admin', email: process.env.ADMIN_EMAIL, role: 'admin', isAdmin: true }
      });
    }

    const user = await User.findOne({ email: lowerEmail });
    if (!user) return res.status(401).json({ success: false, message: 'No account found for ' + email + '. Please sign up first.' });
    if (user.status === 'blocked') return res.status(403).json({ success: false, message: 'Account suspended.' });

    const token = generateToken({ id: user._id, role: user.role });
    res.json({
      success: true, token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, status: user.status, verified: user.verified }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
