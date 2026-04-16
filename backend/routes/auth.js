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

// JWT validity window — after this the user must log in again
const TOKEN_EXPIRY = '7d';

/**
 * Sign a JWT with the application secret.
 * @param {Object} payload - data to embed in the token (id, role, etc.)
 * @returns {string} signed JWT string
 */
const genToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

/**
 * Generate an admin-specific JWT.
 * Admin is not stored in the database — identity is carried in the token.
 * @returns {string} signed admin JWT
 */
const adminTok = () =>
  genToken({ isAdmin: true, email: process.env.ADMIN_EMAIL });

/**
 * Build the safe public user object that is returned in API responses.
 * Sensitive fields (hashed password, internal flags) are excluded.
 * @param {Object} u - Mongoose user document
 * @returns {Object} plain serializable user object
 */
const publicUser = ({ _id, name, email, role, status, verified, phone, city, createdAt }) => ({
  id: _id,
  name,
  email,
  role,
  status,
  verified,
  phone,
  city,
  createdAt,
});

/**
 * Build the admin user object returned when an admin logs in.
 * Since admin has no DB record, this is constructed from env variables.
 * @returns {Object} admin identity object
 */
const adminUser = () => ({
  id:      'admin',
  name:    'Super Admin',
  email:   process.env.ADMIN_EMAIL,
  role:    'admin',
  isAdmin: true,
});

/**
 * Check whether an email address matches the admin account.
 * Comparison is case-insensitive.
 * @param {string} email
 * @returns {boolean}
 */
const isAdminEmail = (email) =>
  email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();

// Roles that a regular user is allowed to register with
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

    // 6. Create user record and issue a JWT
    const user  = await User.create({
      name:         name.trim(),
      email:        email.toLowerCase(),
      password,
      role,
      authProvider: 'email',
    });

    // Sign a token carrying the new user's ID and role
    const token = genToken({ id: user._id, role: user.role });

    // Return 201 Created with the token and safe user object
    res.status(201).json({
      success: true,
      token,
      user: publicUser(user),
    });

  } catch (e) {
    // MongoDB duplicate key error — email already taken
    if (e.code === 11000)
      return res.status(400).json({ success: false, message: 'Email already registered.' });

    console.error('Register error:', e);
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
// Development-mode fallback when the Google GSI popup is blocked.
// Authenticates using email address only — no real Google token needed.
// This route should NOT be used in production.
router.post('/google-fallback', async (req, res) => {
  try {
    const { email, role, mode } = req.body;

    if (!email)
      return res.status(400).json({ success: false, message: 'Email required.' });

    const lEmail = email.toLowerCase().trim();

    // Admin shortcut — no DB lookup needed
    if (isAdminEmail(lEmail))
      return res.json({ success: true, token: adminTok(), user: adminUser() });

    let user = await User.findOne({ email: lEmail });

    if (mode === 'signin') {
      // Signing in — account must already exist
      if (!user)
        return res.status(401).json({ success: false, message: 'No account for ' + email + '.' });
      if (user.status === 'blocked')
        return res.status(403).json({ success: false, message: 'Account suspended.' });
    } else {
      // Signing up — account must not already exist
      if (user)
        return res.status(400).json({ success: false, message: 'Account already exists.' });
      if (!role)
        return res.status(400).json({ success: false, message: 'Select role first.' });

      // Create new user — derive name from email prefix
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
// Update the logged-in user's editable profile fields.
// Admin has no DB record so we skip the update and return success.
router.put('/profile', protect, async (req, res) => {
  try {
    // Admin identity is stored in JWT only — nothing to update in DB
    if (req.user?.isAdmin)
      return res.json({ success: true, message: 'Admin profile updated.' });

    // Extract only the fields that users are allowed to edit
    const { name, phone, cnic, city, address } = req.body;

    // findByIdAndUpdate with { new: true } returns the updated document
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
