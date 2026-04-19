/**
 * @file auth.js
 * @route /api/auth
 * @description Authentication routes — handles sign-up, sign-in,
 *              Google OAuth (GSI + dev fallback), profile read/write.
 * @access Public  → register, login, google, google-fallback
 *         Private → me, profile  (requires valid JWT via protect middleware)
 */

const express          = require('express');
const jwt              = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User             = require('../models/User');
const { protect }      = require('../middleware/auth');

const router       = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ─────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────
const TOKEN_EXPIRY   = '7d';
const ALLOWED_ROLES  = ['tenant', 'landlord'];
const ADMIN_ROLE     = 'admin';

// ─────────────────────────────────────────────────────────────────
// Token helpers
// ─────────────────────────────────────────────────────────────────

/**
 * Signs a JWT with the application secret.
 * All tokens expire after 7 days — after that the user must re-authenticate.
 *
 * @param {Object} tokenPayload - Claims to embed (e.g. { id, role } or { isAdmin })\
 * @returns {string} Signed JWT string
 */
const signToken = (tokenPayload) =>
  jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

/**
 * Generates an admin-specific JWT.
 * Admin has no MongoDB document — identity lives entirely in the token.
 *
 * @returns {string} Signed admin JWT
 */
const buildAdminToken = () =>
  signToken({ isAdmin: true, email: process.env.ADMIN_EMAIL });

/**
 * Builds the safe, serialisable user object returned in every API response.
 * Sensitive fields (hashed password, internal flags) are deliberately excluded.
 *
 * @param {import('mongoose').Document} userDoc - Mongoose User document
 * @returns {Object} Plain user object safe to send over the wire
 */
const toPublicUser = (userDoc) => ({
  id:        userDoc._id,
  name:      userDoc.name,
  email:     userDoc.email,
  role:      userDoc.role,
  status:    userDoc.status,
  verified:  userDoc.verified,
  phone:     userDoc.phone,
  city:      userDoc.city,
  createdAt: userDoc.createdAt,
});

/**
 * Builds the admin identity object returned on admin login.
 * Constructed from env vars because admin has no User document in MongoDB.
 *
 * @returns {Object} Admin identity object
 */
const buildAdminUser = () => ({
  id:      'admin',
  name:    'Super Admin',
  email:   process.env.ADMIN_EMAIL,
  role:    ADMIN_ROLE,
  isAdmin: true,
});

/**
 * Checks whether the provided email belongs to the admin account.
 * Comparison is case-insensitive to handle mixed-case user input.
 *
 * @param {string} emailAddress - Email to check
 * @returns {boolean} True if it matches ADMIN_EMAIL env var
 */
const isAdminEmail = (emailAddress) =>
  emailAddress.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();



// ─────────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────────
/**
 * Creates a new tenant or landlord account using email + password.
 *
 * Validation order:
 *   1. Required fields present
 *   2. Role is in the allowed list
 *   3. Password meets minimum length
 *   4. Email is not the reserved admin address
 *   5. Email not already registered
 *   6. Create user + issue JWT
 *
 * @returns {201} { success, token, user }
 * @returns {400} Validation failure or duplicate email
 * @returns {500} Unexpected server error
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // 1. All four fields are required — reject early if any are missing
    if (!name || !email || !password || !role)
      return res.status(400).json({ success: false, message: 'Please fill all fields.' });

    // 2. Only tenant and landlord roles can self-register
    if (!ALLOWED_ROLES.includes(role))
      return res.status(400).json({ success: false, message: 'Invalid role.' });

    // 3. Enforce minimum password length before hashing
    if (password.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });

    // 4. Prevent admin email from being used to create a regular account
    if (isAdminEmail(email))
      return res.status(400).json({ success: false, message: 'This email cannot be registered.' });

    // 5. Guard against duplicate accounts (case-insensitive check)
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser)
      return res.status(400).json({ success: false, message: 'Account already exists. Please sign in.' });

    // 6. Persist the new user; bcrypt hashing happens in the pre-save hook
    const newUser = await User.create({
      name:         name.trim(),
      email:        email.toLowerCase(),
      password,
      role,
      authProvider: 'email',
    });

    // Issue a token embedding the new user's MongoDB ID and role
    const authToken = signToken({ id: newUser._id, role: newUser.role });

    res.status(201).json({
      success: true,
      token:   authToken,
      user:    toPublicUser(newUser),
    });

  } catch (err) {
    // MongoDB duplicate-key error (code 11000) — race-condition duplicate email
    if (err.code === 11000)
      return res.status(400).json({ success: false, message: 'Email already registered.' });

    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────
/**
 * Authenticates a user with email + password.
 * Admin credentials are checked against env vars — no DB lookup needed.
 * Regular users are fetched from MongoDB and validated with bcrypt.
 *
 * @returns {200} { success, token, user }
 * @returns {400} Missing fields or Google-only account attempted password login
 * @returns {401} Wrong credentials or account not found
 * @returns {403} Account suspended
 * @returns {500} Unexpected server error
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Enter email and password.' });

    const normalisedEmail = email.toLowerCase().trim();

    // ── Admin login path ─────────────────────────────────────────
    // Credentials live in .env — skip the database entirely
    if (isAdminEmail(normalisedEmail)) {
      if (password !== process.env.ADMIN_PASSWORD)
        return res.status(401).json({ success: false, message: 'Incorrect password.' });

      return res.json({
        success: true,
        token:   buildAdminToken(),
        user:    buildAdminUser(),
      });
    }

    // ── Regular user login path ──────────────────────────────────
    // select('+password') is required — password field has select:false by default
    const foundUser = await User.findOne({ email: normalisedEmail }).select('+password');

    if (!foundUser)
      return res.status(401).json({ success: false, message: 'No account found. Please sign up first.' });

    // Google-only accounts never set a password — redirect to Google Sign-In
    if (foundUser.authProvider === 'google' && !foundUser.password)
      return res.status(400).json({ success: false, message: 'This account uses Google Sign-In.' });

    if (!(await foundUser.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Incorrect password.' });

    if (foundUser.status === 'blocked')
      return res.status(403).json({ success: false, message: 'Account suspended. Contact admin.' });

    const authToken = signToken({ id: foundUser._id, role: foundUser.role });

    res.json({ success: true, token: authToken, user: toPublicUser(foundUser) });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/google
// ─────────────────────────────────────────────────────────────────
/**
 * Sign in or sign up using a real Google ID token produced by GSI.
 * The credential is verified with Google's servers before any DB access —
 * this prevents token forgery attacks.
 *
 * Modes:
 *   signin — account must already exist; Google ID is linked if absent
 *   signup — account must NOT exist; role selection is required
 *
 * @returns {200} { success, token, user }
 * @returns {400} Missing credential, invalid role, or account conflict
 * @returns {401} Bad Google token or account not found (signin mode)
 * @returns {403} Account suspended
 * @returns {500} Unexpected server error
 */
router.post('/google', async (req, res) => {
  try {
    const { credential, role, mode } = req.body;

    if (!credential)
      return res.status(400).json({ success: false, message: 'Google credential required.' });

    // 1. Cryptographically verify the Google ID token
    let googlePayload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken:  credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      googlePayload = ticket.getPayload();
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid Google token.' });
    }

    const { email, name, sub: googleId } = googlePayload;
    const normalisedEmail = email.toLowerCase();

    // 2. Admin shortcut — no DB lookup required
    if (isAdminEmail(normalisedEmail))
      return res.json({ success: true, token: buildAdminToken(), user: buildAdminUser() });

    let foundUser = await User.findOne({ email: normalisedEmail });

    // 3. Branch: sign-in vs. sign-up
    if (mode === 'signin') {
      if (!foundUser)
        return res.status(401).json({
          success: false,
          message: 'No account for ' + email + '. Please sign up.',
        });

      if (foundUser.status === 'blocked')
        return res.status(403).json({ success: false, message: 'Account suspended.' });

      // Link Google subject ID on first Google sign-in for this existing account
      if (!foundUser.googleId) {
        foundUser.googleId     = googleId;
        foundUser.authProvider = 'google';
        await foundUser.save();
      }
    } else {
      if (foundUser)
        return res.status(400).json({ success: false, message: 'Account already exists. Please sign in.' });

      if (!role || !ALLOWED_ROLES.includes(role))
        return res.status(400).json({ success: false, message: 'Select Tenant or Landlord first.' });

      // Derive display name from email prefix if Google did not supply one
      foundUser = await User.create({
        name:         name || normalisedEmail.split('@')[0],
        email:        normalisedEmail,
        role,
        authProvider: 'google',
        googleId,
      });
    }

    const authToken = signToken({ id: foundUser._id, role: foundUser.role });
    res.json({ success: true, token: authToken, user: toPublicUser(foundUser) });

  } catch (err) {
    console.error('Google auth error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/google-fallback
// ─────────────────────────────────────────────────────────────────
/**
 * Development-only fallback for environments where the Google GSI popup
 * is blocked (e.g. file:// pages, strict CSP policies).
 * Authenticates by email address alone — no real Google token is verified.
 *
 * ⚠️  DO NOT enable or expose this endpoint in production.
 *
 * @returns {200} { success, token, user }
 * @returns {400} Missing email, missing role, or account conflict
 * @returns {401} Account not found (signin mode)
 * @returns {403} Account suspended
 * @returns {500} Unexpected server error
 */
router.post('/google-fallback', async (req, res) => {
  try {
    const { email, role, mode } = req.body;

    if (!email)
      return res.status(400).json({ success: false, message: 'Email required.' });

    const normalisedEmail = email.toLowerCase().trim();

    // Admin shortcut — skip the DB
    if (isAdminEmail(normalisedEmail))
      return res.json({ success: true, token: buildAdminToken(), user: buildAdminUser() });

    let foundUser = await User.findOne({ email: normalisedEmail });

    if (mode === 'signin') {
      // Account must exist to sign in
      if (!foundUser)
        return res.status(401).json({ success: false, message: 'No account for ' + email + '.' });
      if (foundUser.status === 'blocked')
        return res.status(403).json({ success: false, message: 'Account suspended.' });
    } else {
      // Account must NOT exist to sign up
      if (foundUser)
        return res.status(400).json({ success: false, message: 'Account already exists.' });
      if (!role)
        return res.status(400).json({ success: false, message: 'Select role first.' });

      // Derive display name from the local part of the email address
      foundUser = await User.create({
        name:         normalisedEmail.split('@')[0],
        email:        normalisedEmail,
        role,
        authProvider: 'google',
      });
    }

    const authToken = signToken({ id: foundUser._id, role: foundUser.role });
    res.json({ success: true, token: authToken, user: toPublicUser(foundUser) });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────────────────────────
/**
 * Returns the currently authenticated user's profile.
 * Admin receives a synthetic object; regular users receive the DB document.
 *
 * @middleware protect - JWT must be valid
 * @returns {200} { success, user }
 */
router.get('/me', protect, (req, res) => {
  if (req.user?.isAdmin)
    return res.json({ success: true, user: buildAdminUser() });

  res.json({ success: true, user: req.user });
});

// ─────────────────────────────────────────────────────────────────
// PUT /api/auth/profile
// ─────────────────────────────────────────────────────────────────
/**
 * Updates the editable profile fields of the logged-in user.
 * Admin has no DB record so the update is skipped and success is returned.
 * Only name, phone, cnic, city, and address are user-writable.
 *
 * @middleware protect - JWT must be valid
 * @returns {200} { success, user }
 * @returns {500} Unexpected server error
 */
router.put('/profile', protect, async (req, res) => {
  try {
    // Admin identity is JWT-only — there is no DB row to update
    if (req.user?.isAdmin)
      return res.json({ success: true, message: 'Admin profile updated.' });

    // Only accept the fields the user is allowed to modify
    const { name, phone, cnic, city, address } = req.body;

    // { new: true } returns the document state after the update
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, cnic, city, address },
      { new: true }
    );

    res.json({ success: true, user: updatedUser });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
