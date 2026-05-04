// ─── Auth Routes ──────────────────────────────────────────────────────────────
const express          = require('express');
const jwt              = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User             = require('../models/User');
const { protect }      = require('../middleware/auth');

const router  = express.Router();
const gClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ─── Token Helpers ────────────────────────────────────────────────────────────
const generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

const generateAdminToken = () =>
  generateToken({ isAdmin: true, email: process.env.ADMIN_EMAIL });

// ─── POST /api/auth/register ──────────────────────────────────────────────────
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

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser)
      return res.status(400).json({ success: false, message: 'Account already exists. Please sign in.' });

    const user  = await User.create({ name: name.trim(), email: email.toLowerCase(), password, role, authProvider: 'email' });
    const token = generateToken({ id: user._id, role: user.role });

    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, status: user.status, verified: user.verified, createdAt: user.createdAt },
    });
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    console.error('Register:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Enter email and password.' });

    const normalizedEmail = email.toLowerCase().trim();

    // Admin shortcut
    if (normalizedEmail === process.env.ADMIN_EMAIL.toLowerCase()) {
      if (password !== process.env.ADMIN_PASSWORD)
        return res.status(401).json({ success: false, message: 'Incorrect password.' });
      return res.json({
        success: true,
        token: generateAdminToken(),
        user: { id: 'admin', name: 'Super Admin', email: process.env.ADMIN_EMAIL, role: 'admin', isAdmin: true },
      });
    }

    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user)
      return res.status(401).json({ success: false, message: 'No account found. Please sign up first.' });

    if (user.authProvider === 'google' && !user.password)
      return res.status(400).json({ success: false, message: 'This account uses Google Sign-In.' });

    if (!(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Incorrect password.' });

    if (user.status === 'blocked')
      return res.status(403).json({ success: false, message: 'Account suspended. Contact admin.' });

    const token = generateToken({ id: user._id, role: user.role });
    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, status: user.status, verified: user.verified, phone: user.phone, city: user.city },
    });
  } catch (err) {
    console.error('Login:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── POST /api/auth/google ────────────────────────────────────────────────────
router.post('/google', async (req, res) => {
  try {
    const { credential, role, mode } = req.body;
    if (!credential)
      return res.status(400).json({ success: false, message: 'Google credential required.' });

    let payload;
    try {
      const ticket = await gClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
      payload = ticket.getPayload();
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid Google token.' });
    }

    const { email, name, sub: googleId } = payload;
    const normalizedEmail = email.toLowerCase();

    if (normalizedEmail === process.env.ADMIN_EMAIL.toLowerCase())
      return res.json({
        success: true,
        token: generateAdminToken(),
        user: { id: 'admin', name: 'Super Admin', email: process.env.ADMIN_EMAIL, role: 'admin', isAdmin: true },
      });

    let user = await User.findOne({ email: normalizedEmail });

    if (mode === 'signin') {
      if (!user)
        return res.status(401).json({ success: false, message: 'No account for ' + email + '. Please sign up.' });
      if (user.status === 'blocked')
        return res.status(403).json({ success: false, message: 'Account suspended.' });
      if (!user.googleId) {
        user.googleId     = googleId;
        user.authProvider = 'google';
        await user.save();
      }
    } else {
      if (user)
        return res.status(400).json({ success: false, message: 'Account already exists. Please sign in.' });
      if (!role || !['tenant', 'landlord'].includes(role))
        return res.status(400).json({ success: false, message: 'Select Tenant or Landlord first.' });
      user = await User.create({ name: name || normalizedEmail.split('@')[0], email: normalizedEmail, role, authProvider: 'google', googleId });
    }

    const token = generateToken({ id: user._id, role: user.role });
    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, status: user.status, verified: user.verified, phone: user.phone, city: user.city },
    });
  } catch (err) {
    console.error('Google:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── POST /api/auth/google-fallback (dev mode) ───────────────────────────────
router.post('/google-fallback', async (req, res) => {
  try {
    const { email, role, mode } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required.' });

    const normalizedEmail = email.toLowerCase().trim();

    if (normalizedEmail === process.env.ADMIN_EMAIL.toLowerCase())
      return res.json({
        success: true,
        token: generateAdminToken(),
        user: { id: 'admin', name: 'Super Admin', email: process.env.ADMIN_EMAIL, role: 'admin', isAdmin: true },
      });

    let user = await User.findOne({ email: normalizedEmail });

    if (mode === 'signin') {
      if (!user) return res.status(401).json({ success: false, message: 'No account for ' + email + '.' });
      if (user.status === 'blocked') return res.status(403).json({ success: false, message: 'Account suspended.' });
    } else {
      if (user)  return res.status(400).json({ success: false, message: 'Account already exists.' });
      if (!role) return res.status(400).json({ success: false, message: 'Select role first.' });
      user = await User.create({ name: normalizedEmail.split('@')[0], email: normalizedEmail, role, authProvider: 'google' });
    }

    const token = generateToken({ id: user._id, role: user.role });
    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, status: user.status, verified: user.verified },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', protect, (req, res) => {
  if (req.user?.isAdmin)
    return res.json({ success: true, user: { id: 'admin', name: 'Super Admin', email: process.env.ADMIN_EMAIL, role: 'admin', isAdmin: true } });
  res.json({ success: true, user: req.user });
});

// ─── PUT /api/auth/profile ────────────────────────────────────────────────────
router.put('/profile', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin)
      return res.json({ success: true, message: 'Admin profile updated.' });

    const { name, phone, cnic, city, address } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { name, phone, cnic, city, address }, { new: true });
    res.json({ success: true, user });
  } catch {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
