// ============================================================
// TMS Auth Routes
// Endpoints: register | login | Google OAuth | fallback | profile
// ============================================================
'use strict';

const authRouter       = require('express').Router();
const tokenLib         = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const TmsUser          = require('../models/User');
const { protect }      = require('../middleware/auth');

const gClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── JWT helpers ───────────────────────────────────────────────
const createToken      = (payload) => tokenLib.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
const createAdminToken = ()        => createToken({ isAdmin: true, email: process.env.ADMIN_EMAIL });

// ── Reusable admin user object ────────────────────────────────
const ADMIN_OBJ = {
  id: 'admin', name: 'Super Admin',
  email: process.env.ADMIN_EMAIL, role: 'admin', isAdmin: true,
};

// ── Build safe user response ──────────────────────────────────
const buildUserResp = (u) => ({
  id: u._id, name: u.name, email: u.email,
  role: u.role, status: u.status, verified: u.verified,
  phone: u.phone, city: u.city,
});

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

    const existing = await TmsUser.findOne({ email: email.toLowerCase() });
    if (existing)
      return res.status(400).json({ success: false, message: 'Account already exists. Please sign in.' });

    const newUser = await TmsUser.create({ name: name.trim(), email: email.toLowerCase(), password, role, authProvider: 'email' });
    const tok     = createToken({ id: newUser._id, role: newUser.role });
    return res.status(201).json({
      success: true,
      token: tok,
      user: { id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role, status: newUser.status, verified: newUser.verified, createdAt: newUser.createdAt },
    });
  } catch (regErr) {
    if (regErr.code === 11000) return res.status(400).json({ success: false, message: 'Email already registered.' });
    console.error('Register error:', regErr);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── POST /api/auth/login ────────────────────────────────────
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Enter email and password.' });

    const cleanEmail = email.toLowerCase().trim();

    // Admin shortcut — no DB query needed
    if (cleanEmail === process.env.ADMIN_EMAIL.toLowerCase()) {
      if (password !== process.env.ADMIN_PASSWORD)
        return res.status(401).json({ success: false, message: 'Incorrect password.' });
      return res.json({ success: true, token: createAdminToken(), user: ADMIN_OBJ });
    }

    const matchedUser = await TmsUser.findOne({ email: cleanEmail }).select('+password');
    if (!matchedUser)
      return res.status(401).json({ success: false, message: 'No account found. Please sign up first.' });
    if (matchedUser.authProvider === 'google' && !matchedUser.password)
      return res.status(400).json({ success: false, message: 'This account uses Google Sign-In.' });
    if (!(await matchedUser.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Incorrect password.' });
    if (matchedUser.status === 'blocked')
      return res.status(403).json({ success: false, message: 'Account suspended. Contact admin.' });

    const tok = createToken({ id: matchedUser._id, role: matchedUser.role });
    return res.json({ success: true, token: tok, user: buildUserResp(matchedUser) });
  } catch (loginErr) {
    console.error('Login error:', loginErr);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── POST /api/auth/google ───────────────────────────────────
authRouter.post('/google', async (req, res) => {
  try {
    const { credential, role, mode } = req.body;
    if (!credential)
      return res.status(400).json({ success: false, message: 'Google credential required.' });

    let gPayload;
    try {
      const ticket = await gClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
      gPayload = ticket.getPayload();
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid Google token.' });
    }

    const { email, name, sub: googleSub } = gPayload;
    const cleanEmail = email.toLowerCase();

    if (cleanEmail === process.env.ADMIN_EMAIL.toLowerCase())
      return res.json({ success: true, token: createAdminToken(), user: ADMIN_OBJ });

    let oauthUser = await TmsUser.findOne({ email: cleanEmail });

    if (mode === 'signin') {
      if (!oauthUser)
        return res.status(401).json({ success: false, message: 'No account for ' + email + '. Please sign up.' });
      if (oauthUser.status === 'blocked')
        return res.status(403).json({ success: false, message: 'Account suspended.' });
      if (!oauthUser.googleId) { oauthUser.googleId = googleSub; oauthUser.authProvider = 'google'; await oauthUser.save(); }
    } else {
      if (oauthUser)
        return res.status(400).json({ success: false, message: 'Account already exists. Please sign in.' });
      if (!role || !['tenant', 'landlord'].includes(role))
        return res.status(400).json({ success: false, message: 'Select Tenant or Landlord first.' });
      oauthUser = await TmsUser.create({ name: name || cleanEmail.split('@')[0], email: cleanEmail, role, authProvider: 'google', googleId: googleSub });
    }

    const tok = createToken({ id: oauthUser._id, role: oauthUser.role });
    return res.json({ success: true, token: tok, user: buildUserResp(oauthUser) });
  } catch (gErr) {
    console.error('Google error:', gErr);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── POST /api/auth/google-fallback ──────────────────────────
authRouter.post('/google-fallback', async (req, res) => {
  try {
    const { email, role, mode } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required.' });

    const cleanEmail = email.toLowerCase().trim();
    if (cleanEmail === process.env.ADMIN_EMAIL.toLowerCase())
      return res.json({ success: true, token: createAdminToken(), user: ADMIN_OBJ });

    let fbUser = await TmsUser.findOne({ email: cleanEmail });
    if (mode === 'signin') {
      if (!fbUser)  return res.status(401).json({ success: false, message: 'No account for ' + email + '.' });
      if (fbUser.status === 'blocked') return res.status(403).json({ success: false, message: 'Account suspended.' });
    } else {
      if (fbUser)   return res.status(400).json({ success: false, message: 'Account already exists.' });
      if (!role)    return res.status(400).json({ success: false, message: 'Select role first.' });
      fbUser = await TmsUser.create({ name: cleanEmail.split('@')[0], email: cleanEmail, role, authProvider: 'google' });
    }
    const tok = createToken({ id: fbUser._id, role: fbUser.role });
    return res.json({ success: true, token: tok, user: { id: fbUser._id, name: fbUser.name, email: fbUser.email, role: fbUser.role, status: fbUser.status, verified: fbUser.verified } });
  } catch (fbErr) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── GET /api/auth/me ────────────────────────────────────────
authRouter.get('/me', protect, (req, res) => {
  if (req.user?.isAdmin) return res.json({ success: true, user: ADMIN_OBJ });
  return res.json({ success: true, user: req.user });
});

// ─── PUT /api/auth/profile ───────────────────────────────────
authRouter.put('/profile', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin) return res.json({ success: true, message: 'Admin profile updated.' });
    const { name, phone, cnic, city, address } = req.body;
    const refreshed = await TmsUser.findByIdAndUpdate(req.user._id, { name, phone, cnic, city, address }, { new: true });
    return res.json({ success: true, user: refreshed });
  } catch (profileErr) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = authRouter;
