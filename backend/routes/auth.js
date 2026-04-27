/**
 * @file auth.js
 * @route /api/auth
 * @description Authentication routes — handles sign-up, sign-in,
 *              Google OAuth (GSI + dev fallback), profile read/write.
 * @access Public  → register, login, google, google-fallback
 *         Private → me, profile  (requires valid JWT via protect middleware)
 */

const express          = require('express');
const jwtPackage       = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const UserModel        = require('../models/User');
const { protect }      = require('../middleware/auth');

const authRouter   = express.Router();
const oauthClient  = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ─────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────
const JWT_LIFETIME    = '7d';
const ADMIN_ROLE_NAME = 'admin';
const VALID_ROLES     = ['tenant', 'landlord'];

// ─────────────────────────────────────────────────────────────────
// Token helpers
// ─────────────────────────────────────────────────────────────────

/**
 * Signs a JWT with the application secret.
 * @param {Object} claims - Payload to embed in the token
 * @returns {string} Signed JWT string
 */
const createJwt = (claims) =>
  jwtPackage.sign(claims, process.env.JWT_SECRET, { expiresIn: JWT_LIFETIME });

/**
 * Generates an admin-specific JWT.
 * @returns {string} Signed admin JWT
 */
const createAdminJwt = () =>
  createJwt({ isAdmin: true, email: process.env.ADMIN_EMAIL });

/**
 * Builds the safe user object returned in every API response.
 * @param {import('mongoose').Document} doc - Mongoose User document
 * @returns {Object} Safe user payload
 */
const formatUser = (doc) => ({
  id:        doc._id,
  name:      doc.name,
  email:     doc.email,
  role:      doc.role,
  status:    doc.status,
  verified:  doc.verified,
  phone:     doc.phone,
  city:      doc.city,
  createdAt: doc.createdAt,
});

/**
 * Builds the admin identity returned on admin authentication.
 * @returns {Object} Admin identity object
 */
const buildAdminIdentity = () => ({
  id:      'admin',
  name:    'Super Admin',
  email:   process.env.ADMIN_EMAIL,
  role:    ADMIN_ROLE_NAME,
  isAdmin: true,
});

/**
 * Returns true if the given email matches the admin email (case-insensitive).
 * @param {string} inputEmail
 * @returns {boolean}
 */
const checkIsAdmin = (inputEmail) =>
  inputEmail.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();


// ─────────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────────
authRouter.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role)
      return res.status(400).json({ success: false, message: 'Please fill all fields.' });

    if (!VALID_ROLES.includes(role))
      return res.status(400).json({ success: false, message: 'Invalid role.' });

    if (password.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });

    if (checkIsAdmin(email))
      return res.status(400).json({ success: false, message: 'This email cannot be registered.' });

    const duplicateAccount = await UserModel.findOne({ email: email.toLowerCase() });
    if (duplicateAccount)
      return res.status(400).json({ success: false, message: 'Account already exists. Please sign in.' });

    const registeredUser = await UserModel.create({
      name:         name.trim(),
      email:        email.toLowerCase(),
      password,
      role,
      authProvider: 'email',
    });

    const accessToken = createJwt({ id: registeredUser._id, role: registeredUser.role });

    res.status(201).json({
      success: true,
      token:   accessToken,
      user:    formatUser(registeredUser),
    });

  } catch (regErr) {
    if (regErr.code === 11000)
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    console.error('Register error:', regErr);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Enter email and password.' });

    const emailClean = email.toLowerCase().trim();

    if (checkIsAdmin(emailClean)) {
      if (password !== process.env.ADMIN_PASSWORD)
        return res.status(401).json({ success: false, message: 'Incorrect password.' });
      return res.json({ success: true, token: createAdminJwt(), user: buildAdminIdentity() });
    }

    const loginUser = await UserModel.findOne({ email: emailClean }).select('+password');

    if (!loginUser)
      return res.status(401).json({ success: false, message: 'No account found. Please sign up first.' });

    if (loginUser.authProvider === 'google' && !loginUser.password)
      return res.status(400).json({ success: false, message: 'This account uses Google Sign-In.' });

    if (!(await loginUser.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Incorrect password.' });

    if (loginUser.status === 'blocked')
      return res.status(403).json({ success: false, message: 'Account suspended. Contact admin.' });

    const accessToken = createJwt({ id: loginUser._id, role: loginUser.role });
    res.json({ success: true, token: accessToken, user: formatUser(loginUser) });

  } catch (loginErr) {
    console.error('Login error:', loginErr);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/google
// ─────────────────────────────────────────────────────────────────
authRouter.post('/google', async (req, res) => {
  try {
    const { credential, role, mode } = req.body;

    if (!credential)
      return res.status(400).json({ success: false, message: 'Google credential required.' });

    let gPayload;
    try {
      const verifiedTicket = await oauthClient.verifyIdToken({
        idToken:  credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      gPayload = verifiedTicket.getPayload();
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid Google token.' });
    }

    const { email, name, sub: gSubject } = gPayload;
    const emailClean = email.toLowerCase();

    if (checkIsAdmin(emailClean))
      return res.json({ success: true, token: createAdminJwt(), user: buildAdminIdentity() });

    let oauthUser = await UserModel.findOne({ email: emailClean });

    if (mode === 'signin') {
      if (!oauthUser)
        return res.status(401).json({ success: false, message: 'No account for ' + email + '. Please sign up.' });

      if (oauthUser.status === 'blocked')
        return res.status(403).json({ success: false, message: 'Account suspended.' });

      if (!oauthUser.googleId) {
        oauthUser.googleId     = gSubject;
        oauthUser.authProvider = 'google';
        await oauthUser.save();
      }
    } else {
      if (oauthUser)
        return res.status(400).json({ success: false, message: 'Account already exists. Please sign in.' });

      if (!role || !VALID_ROLES.includes(role))
        return res.status(400).json({ success: false, message: 'Select Tenant or Landlord first.' });

      oauthUser = await UserModel.create({
        name:         name || emailClean.split('@')[0],
        email:        emailClean,
        role,
        authProvider: 'google',
        googleId:     gSubject,
      });
    }

    const accessToken = createJwt({ id: oauthUser._id, role: oauthUser.role });
    res.json({ success: true, token: accessToken, user: formatUser(oauthUser) });

  } catch (gErr) {
    console.error('Google auth error:', gErr);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/google-fallback
// ─────────────────────────────────────────────────────────────────
authRouter.post('/google-fallback', async (req, res) => {
  try {
    const { email, role, mode } = req.body;

    if (!email)
      return res.status(400).json({ success: false, message: 'Email required.' });

    const emailClean = email.toLowerCase().trim();

    if (checkIsAdmin(emailClean))
      return res.json({ success: true, token: createAdminJwt(), user: buildAdminIdentity() });

    let fallbackUser = await UserModel.findOne({ email: emailClean });

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

      fallbackUser = await UserModel.create({
        name:         emailClean.split('@')[0],
        email:        emailClean,
        role,
        authProvider: 'google',
      });
    }

    const accessToken = createJwt({ id: fallbackUser._id, role: fallbackUser.role });
    res.json({ success: true, token: accessToken, user: formatUser(fallbackUser) });

  } catch (fbErr) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────────────────────────
authRouter.get('/me', protect, (req, res) => {
  if (req.user?.isAdmin)
    return res.json({ success: true, user: buildAdminIdentity() });

  res.json({ success: true, user: req.user });
});

// ─────────────────────────────────────────────────────────────────
// PUT /api/auth/profile
// ─────────────────────────────────────────────────────────────────
authRouter.put('/profile', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin)
      return res.json({ success: true, message: 'Admin profile updated.' });

    const { name, phone, cnic, city, address } = req.body;

    const profileResult = await UserModel.findByIdAndUpdate(
      req.user._id,
      { name, phone, cnic, city, address },
      { new: true }
    );

    res.json({ success: true, user: profileResult });

  } catch (profileErr) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = authRouter;
