// ============================================================
// TMS Auth Routes
// Handles: register, login, Google OAuth, profile update
// ============================================================
'use strict';

const express          = require('express');
const jwt              = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User             = require('../models/User');
const { protect }      = require('../middleware/auth');

const authRouter  = express.Router();
const gClient     = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── Helpers ──────────────────────────────────────────────────

/** Create a signed JWT valid for 7 days */
const makeJwt = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

/** Create an admin-scoped JWT */
const makeAdminJwt = () =>
  makeJwt({ isAdmin: true, email: process.env.ADMIN_EMAIL });

/** Standard admin user object returned in responses */
const ADMIN_USER = {
  id: 'admin', name: 'Super Admin',
  email: process.env.ADMIN_EMAIL, role: 'admin', isAdmin: true,
};

// ─── POST /api/auth/register ─────────────────────────────────
authRouter.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role)
      return res.status(400).json({ success: false, message: 'Please fill all fields.' });
    if (!['tenant', 'landlord'].includes(role))
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    if (password.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    if (email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase())
      return res.status(400).json({ success: false, message: 'This email cannot be registered.' });

    const alreadyExists = await User.findOne({ email: email.toLowerCase() });
    if (alreadyExists)
      return res.status(400).json({ success: false, message: 'Account already exists. Please sign in.' });

    const createdUser = await User.create({
      name: name.trim(), email: email.toLowerCase(),
      password, role, authProvider: 'email',
    });
    const tok = makeJwt({ id: createdUser._id, role: createdUser.role });
    return res.status(201).json({
      success: true, token: tok,
      user: {
        id: createdUser._id, name: createdUser.name, email: createdUser.email,
        role: createdUser.role, status: createdUser.status,
        verified: createdUser.verified, createdAt: createdUser.createdAt,
      },
    });
  } catch (regErr) {
    if (regErr.code === 11000)
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    console.error('Register:', regErr);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── POST /api/auth/login ────────────────────────────────────
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Enter email and password.' });

    const lEmail = email.toLowerCase().trim();

    // Admin shortcut
    if (lEmail === process.env.ADMIN_EMAIL.toLowerCase()) {
      if (password !== process.env.ADMIN_PASSWORD)
        return res.status(401).json({ success: false, message: 'Incorrect password.' });
      return res.json({ success: true, token: makeAdminJwt(), user: ADMIN_USER });
    }

    const authUser = await User.findOne({ email: lEmail }).select('+password');
    if (!authUser)
      return res.status(401).json({ success: false, message: 'No account found. Please sign up first.' });
    if (authUser.authProvider === 'google' && !authUser.password)
      return res.status(400).json({ success: false, message: 'This account uses Google Sign-In.' });
    if (!(await authUser.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Incorrect password.' });
    if (authUser.status === 'blocked')
      return res.status(403).json({ success: false, message: 'Account suspended. Contact admin.' });

    const tok = makeJwt({ id: authUser._id, role: authUser.role });
    return res.json({
      success: true, token: tok,
      user: {
        id: authUser._id, name: authUser.name, email: authUser.email,
        role: authUser.role, status: authUser.status, verified: authUser.verified,
        phone: authUser.phone, city: authUser.city,
      },
    });
  } catch (loginErr) {
    console.error('Login:', loginErr);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── POST /api/auth/google ───────────────────────────────────
authRouter.post('/google', async (req, res) => {
  try {
    const { credential, role, mode } = req.body;
    if (!credential)
      return res.status(400).json({ success: false, message: 'Google credential required.' });

    let tokenPayload;
    try {
      const ticket = await gClient.verifyIdToken({
        idToken: credential, audience: process.env.GOOGLE_CLIENT_ID,
      });
      tokenPayload = ticket.getPayload();
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid Google token.' });
    }

    const { email, name, sub: googleSub } = tokenPayload;
    const lEmail = email.toLowerCase();

    if (lEmail === process.env.ADMIN_EMAIL.toLowerCase())
      return res.json({ success: true, token: makeAdminJwt(), user: ADMIN_USER });

    let oauthUser = await User.findOne({ email: lEmail });

    if (mode === 'signin') {
      if (!oauthUser)
        return res.status(401).json({ success: false, message: 'No account for ' + email + '. Please sign up.' });
      if (oauthUser.status === 'blocked')
        return res.status(403).json({ success: false, message: 'Account suspended.' });
      if (!oauthUser.googleId) {
        oauthUser.googleId     = googleSub;
        oauthUser.authProvider = 'google';
        await oauthUser.save();
      }
    } else {
      if (oauthUser)
        return res.status(400).json({ success: false, message: 'Account already exists. Please sign in.' });
      if (!role || !['tenant', 'landlord'].includes(role))
        return res.status(400).json({ success: false, message: 'Select Tenant or Landlord first.' });
      oauthUser = await User.create({
        name: name || lEmail.split('@')[0], email: lEmail,
        role, authProvider: 'google', googleId: googleSub,
      });
    }

    const tok = makeJwt({ id: oauthUser._id, role: oauthUser.role });
    return res.json({
      success: true, token: tok,
      user: {
        id: oauthUser._id, name: oauthUser.name, email: oauthUser.email,
        role: oauthUser.role, status: oauthUser.status, verified: oauthUser.verified,
        phone: oauthUser.phone, city: oauthUser.city,
      },
    });
  } catch (oauthErr) {
    console.error('Google:', oauthErr);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── POST /api/auth/google-fallback (dev) ────────────────────
authRouter.post('/google-fallback', async (req, res) => {
  try {
    const { email, role, mode } = req.body;
    if (!email)
      return res.status(400).json({ success: false, message: 'Email required.' });

    const lEmail = email.toLowerCase().trim();
    if (lEmail === process.env.ADMIN_EMAIL.toLowerCase())
      return res.json({ success: true, token: makeAdminJwt(), user: ADMIN_USER });

    let fallbackUser = await User.findOne({ email: lEmail });
    if (mode === 'signin') {
      if (!fallbackUser)
        return res.status(401).json({ success: false, message: 'No account for ' + email + '.' });
      if (fallbackUser.status === 'blocked')
        return res.status(403).json({ success: false, message: 'Account suspended.' });
    } else {
      if (fallbackUser)
        return res.status(400).json({ success: false, message: 'Account already exists.' });
      if (!role)
        return res.status(400).json({ success: false, message: 'Select role first.' });
      fallbackUser = await User.create({
        name: lEmail.split('@')[0], email: lEmail, role, authProvider: 'google',
      });
    }
    const tok = makeJwt({ id: fallbackUser._id, role: fallbackUser.role });
    return res.json({
      success: true, token: tok,
      user: {
        id: fallbackUser._id, name: fallbackUser.name, email: fallbackUser.email,
        role: fallbackUser.role, status: fallbackUser.status, verified: fallbackUser.verified,
      },
    });
  } catch (fbErr) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── GET /api/auth/me ────────────────────────────────────────
authRouter.get('/me', protect, (req, res) => {
  if (req.user?.isAdmin)
    return res.json({ success: true, user: ADMIN_USER });
  return res.json({ success: true, user: req.user });
});

// ─── PUT /api/auth/profile ───────────────────────────────────
authRouter.put('/profile', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin)
      return res.json({ success: true, message: 'Admin profile updated.' });
    const { name, phone, cnic, city, address } = req.body;
    const refreshedUser = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, cnic, city, address },
      { new: true }
    );
    return res.json({ success: true, user: refreshedUser });
  } catch (profileErr) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = authRouter;
