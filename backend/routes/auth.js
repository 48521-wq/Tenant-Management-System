// ============================================================
// TMS Auth Routes
// register | login | Google OAuth | google-fallback | profile
// ============================================================
'use strict';

const router           = require('express').Router();
const jwtPkg           = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const UserModel        = require('../models/User');
const { protect }      = require('../middleware/auth');

const googleVerifier = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── JWT helpers ───────────────────────────────────────────────
const signToken      = (data) => jwtPkg.sign(data, process.env.JWT_SECRET, { expiresIn: '7d' });
const signAdminToken = ()     => signToken({ isAdmin: true, email: process.env.ADMIN_EMAIL });

// ── Reusable admin response object ───────────────────────────
const ADMIN_RESP = {
  id: 'admin', name: 'Super Admin',
  email: process.env.ADMIN_EMAIL, role: 'admin', isAdmin: true,
};

// ── Utility: build user response shape ───────────────────────
const userShape = (u) => ({
  id: u._id, name: u.name, email: u.email,
  role: u.role, status: u.status, verified: u.verified,
  phone: u.phone, city: u.city,
});

// ─── POST /api/auth/register ─────────────────────────────────
router.post('/register', async (req, res) => {
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

    const duplicate = await UserModel.findOne({ email: email.toLowerCase() });
    if (duplicate)
      return res.status(400).json({ success: false, message: 'Account already exists. Please sign in.' });

    const saved  = await UserModel.create({ name: name.trim(), email: email.toLowerCase(), password, role, authProvider: 'email' });
    const jwtTok = signToken({ id: saved._id, role: saved.role });
    return res.status(201).json({
      success: true,
      token: jwtTok,
      user: { id: saved._id, name: saved.name, email: saved.email, role: saved.role, status: saved.status, verified: saved.verified, createdAt: saved.createdAt },
    });
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ success: false, message: 'Email already registered.' });
    console.error('Register error:', e);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── POST /api/auth/login ────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Enter email and password.' });

    const normalized = email.toLowerCase().trim();

    // Admin check first
    if (normalized === process.env.ADMIN_EMAIL.toLowerCase()) {
      if (password !== process.env.ADMIN_PASSWORD)
        return res.status(401).json({ success: false, message: 'Incorrect password.' });
      return res.json({ success: true, token: signAdminToken(), user: ADMIN_RESP });
    }

    const found = await UserModel.findOne({ email: normalized }).select('+password');
    if (!found)
      return res.status(401).json({ success: false, message: 'No account found. Please sign up first.' });
    if (found.authProvider === 'google' && !found.password)
      return res.status(400).json({ success: false, message: 'This account uses Google Sign-In.' });
    if (!(await found.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Incorrect password.' });
    if (found.status === 'blocked')
      return res.status(403).json({ success: false, message: 'Account suspended. Contact admin.' });

    const jwtTok = signToken({ id: found._id, role: found.role });
    return res.json({ success: true, token: jwtTok, user: userShape(found) });
  } catch (e) {
    console.error('Login error:', e);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── POST /api/auth/google ───────────────────────────────────
router.post('/google', async (req, res) => {
  try {
    const { credential, role, mode } = req.body;
    if (!credential)
      return res.status(400).json({ success: false, message: 'Google credential required.' });

    let gData;
    try {
      const verified = await googleVerifier.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
      gData = verified.getPayload();
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid Google token.' });
    }

    const { email, name, sub: gSub } = gData;
    const normalized = email.toLowerCase();

    if (normalized === process.env.ADMIN_EMAIL.toLowerCase())
      return res.json({ success: true, token: signAdminToken(), user: ADMIN_RESP });

    let gUser = await UserModel.findOne({ email: normalized });

    if (mode === 'signin') {
      if (!gUser)
        return res.status(401).json({ success: false, message: 'No account for ' + email + '. Please sign up.' });
      if (gUser.status === 'blocked')
        return res.status(403).json({ success: false, message: 'Account suspended.' });
      if (!gUser.googleId) { gUser.googleId = gSub; gUser.authProvider = 'google'; await gUser.save(); }
    } else {
      if (gUser)
        return res.status(400).json({ success: false, message: 'Account already exists. Please sign in.' });
      if (!role || !['tenant', 'landlord'].includes(role))
        return res.status(400).json({ success: false, message: 'Select Tenant or Landlord first.' });
      gUser = await UserModel.create({ name: name || normalized.split('@')[0], email: normalized, role, authProvider: 'google', googleId: gSub });
    }

    const jwtTok = signToken({ id: gUser._id, role: gUser.role });
    return res.json({ success: true, token: jwtTok, user: userShape(gUser) });
  } catch (e) {
    console.error('Google error:', e);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── POST /api/auth/google-fallback ──────────────────────────
router.post('/google-fallback', async (req, res) => {
  try {
    const { email, role, mode } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required.' });

    const normalized = email.toLowerCase().trim();
    if (normalized === process.env.ADMIN_EMAIL.toLowerCase())
      return res.json({ success: true, token: signAdminToken(), user: ADMIN_RESP });

    let fbU = await UserModel.findOne({ email: normalized });
    if (mode === 'signin') {
      if (!fbU)  return res.status(401).json({ success: false, message: 'No account for ' + email + '.' });
      if (fbU.status === 'blocked') return res.status(403).json({ success: false, message: 'Account suspended.' });
    } else {
      if (fbU)   return res.status(400).json({ success: false, message: 'Account already exists.' });
      if (!role) return res.status(400).json({ success: false, message: 'Select role first.' });
      fbU = await UserModel.create({ name: normalized.split('@')[0], email: normalized, role, authProvider: 'google' });
    }
    const jwtTok = signToken({ id: fbU._id, role: fbU.role });
    return res.json({ success: true, token: jwtTok, user: { id: fbU._id, name: fbU.name, email: fbU.email, role: fbU.role, status: fbU.status, verified: fbU.verified } });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── GET /api/auth/me ────────────────────────────────────────
router.get('/me', protect, (req, res) => {
  if (req.user?.isAdmin) return res.json({ success: true, user: ADMIN_RESP });
  return res.json({ success: true, user: req.user });
});

// ─── PUT /api/auth/profile ───────────────────────────────────
router.put('/profile', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin) return res.json({ success: true, message: 'Admin profile updated.' });
    const { name, phone, cnic, city, address } = req.body;
    const updated = await UserModel.findByIdAndUpdate(req.user._id, { name, phone, cnic, city, address }, { new: true });
    return res.json({ success: true, user: updated });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
