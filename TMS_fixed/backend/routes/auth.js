// ═══════════════════════════════════════════════════════════════
//  Auth Routes  —  /api/auth
//  Handles registration, login, Google OAuth, and profile
// ═══════════════════════════════════════════════════════════════

const express          = require('express');
const jwt              = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User             = require('../models/User');
const { protect }      = require('../middleware/auth');

const router  = express.Router();
const gClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── Token helpers ────────────────────────────────────────────────

// Generate a signed JWT valid for 7 days
const genToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

// Generate a special admin token (no DB lookup needed)
const adminTok = () =>
  genToken({ isAdmin: true, email: process.env.ADMIN_EMAIL });

// Build the public user object returned in responses
const publicUser = (user) => ({
  id:        user._id,
  name:      user.name,
  email:     user.email,
  role:      user.role,
  status:    user.status,
  verified:  user.verified,
  phone:     user.phone,
  city:      user.city,
  createdAt: user.createdAt,
});

// Admin user object (no DB record)
const adminUser = () => ({
  id:      'admin',
  name:    'Super Admin',
  email:   process.env.ADMIN_EMAIL,
  role:    'admin',
  isAdmin: true,
});

// Check whether the given email belongs to the admin account
const isAdminEmail = (email) =>
  email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();

// Valid roles a user can register as
const VALID_ROLES = ['tenant', 'landlord'];

// ── POST /api/auth/register ──────────────────────────────────────
// Create a new tenant or landlord account with email + password
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // 1. Validate required fields
    if (!name || !email || !password || !role)
      return res.status(400).json({ success: false, message: 'Please fill all fields.' });

    // 2. Validate role
    if (!VALID_ROLES.includes(role))
      return res.status(400).json({ success: false, message: 'Invalid role.' });

    // 3. Enforce minimum password length
    if (password.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });

    // 4. Block admin email from registering
    if (isAdminEmail(email))
      return res.status(400).json({ success: false, message: 'This email cannot be registered.' });

    // 5. Check for duplicate account
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists)
      return res.status(400).json({ success: false, message: 'Account already exists. Please sign in.' });

    // 6. Create user and return token
    const user  = await User.create({
      name:         name.trim(),
      email:        email.toLowerCase(),
      password,
      role,
      authProvider: 'email',
    });

    const token = genToken({ id: user._id, role: user.role });

    res.status(201).json({
      success: true,
      token,
      user: publicUser(user),
    });

  } catch (e) {
    if (e.code === 11000)
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    console.error('Register:', e);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────────
// Authenticate with email + password (admin or regular user)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Enter email and password.' });

    const lEmail = email.toLowerCase().trim();

    // ── Admin login ──────────────────────────────────────────────
    if (isAdminEmail(lEmail)) {
      if (password !== process.env.ADMIN_PASSWORD)
        return res.status(401).json({ success: false, message: 'Incorrect password.' });
      return res.json({ success: true, token: adminTok(), user: adminUser() });
    }

    // ── Regular user login ───────────────────────────────────────
    const user = await User.findOne({ email: lEmail }).select('+password');

    if (!user)
      return res.status(401).json({ success: false, message: 'No account found. Please sign up first.' });

    if (user.authProvider === 'google' && !user.password)
      return res.status(400).json({ success: false, message: 'This account uses Google Sign-In.' });

    if (!(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Incorrect password.' });

    if (user.status === 'blocked')
      return res.status(403).json({ success: false, message: 'Account suspended. Contact admin.' });

    const token = genToken({ id: user._id, role: user.role });

    res.json({ success: true, token, user: publicUser(user) });

  } catch (e) {
    console.error('Login:', e);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── POST /api/auth/google ────────────────────────────────────────
// Sign in or sign up using a real Google ID token (GSI credential)
router.post('/google', async (req, res) => {
  try {
    const { credential, role, mode } = req.body;

    if (!credential)
      return res.status(400).json({ success: false, message: 'Google credential required.' });

    // 1. Verify the Google ID token
    let payload;
    try {
      const ticket = await gClient.verifyIdToken({
        idToken:  credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid Google token.' });
    }

    const { email, name, sub: googleId } = payload;
    const lEmail = email.toLowerCase();

    // 2. Admin shortcut
    if (isAdminEmail(lEmail))
      return res.json({ success: true, token: adminTok(), user: adminUser() });

    let user = await User.findOne({ email: lEmail });

    // 3. Handle sign-in vs sign-up
    if (mode === 'signin') {
      if (!user)
        return res.status(401).json({ success: false, message: 'No account for ' + email + '. Please sign up.' });
      if (user.status === 'blocked')
        return res.status(403).json({ success: false, message: 'Account suspended.' });
      // Link Google ID if not already linked
      if (!user.googleId) {
        user.googleId     = googleId;
        user.authProvider = 'google';
        await user.save();
      }
    } else {
      if (user)
        return res.status(400).json({ success: false, message: 'Account already exists. Please sign in.' });
      if (!role || !VALID_ROLES.includes(role))
        return res.status(400).json({ success: false, message: 'Select Tenant or Landlord first.' });
      user = await User.create({
        name:         name || lEmail.split('@')[0],
        email:        lEmail,
        role,
        authProvider: 'google',
        googleId,
      });
    }

    const token = genToken({ id: user._id, role: user.role });
    res.json({ success: true, token, user: publicUser(user) });

  } catch (e) {
    console.error('Google:', e);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── POST /api/auth/google-fallback ──────────────────────────────
// Dev-mode fallback: authenticate by email only (no real Google token)
router.post('/google-fallback', async (req, res) => {
  try {
    const { email, role, mode } = req.body;

    if (!email)
      return res.status(400).json({ success: false, message: 'Email required.' });

    const lEmail = email.toLowerCase().trim();

    // Admin shortcut
    if (isAdminEmail(lEmail))
      return res.json({ success: true, token: adminTok(), user: adminUser() });

    let user = await User.findOne({ email: lEmail });

    if (mode === 'signin') {
      if (!user)
        return res.status(401).json({ success: false, message: 'No account for ' + email + '.' });
      if (user.status === 'blocked')
        return res.status(403).json({ success: false, message: 'Account suspended.' });
    } else {
      if (user)
        return res.status(400).json({ success: false, message: 'Account already exists.' });
      if (!role)
        return res.status(400).json({ success: false, message: 'Select role first.' });
      user = await User.create({
        name:         lEmail.split('@')[0],
        email:        lEmail,
        role,
        authProvider: 'google',
      });
    }

    const token = genToken({ id: user._id, role: user.role });
    res.json({ success: true, token, user: publicUser(user) });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────────
// Return the currently authenticated user's profile
router.get('/me', protect, (req, res) => {
  if (req.user?.isAdmin)
    return res.json({ success: true, user: adminUser() });

  res.json({ success: true, user: req.user });
});

// ── PUT /api/auth/profile ────────────────────────────────────────
// Update the logged-in user's editable profile fields
router.put('/profile', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin)
      return res.json({ success: true, message: 'Admin profile updated.' });

    const { name, phone, cnic, city, address } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, cnic, city, address },
      { new: true }
    );

    res.json({ success: true, user });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
