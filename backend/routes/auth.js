// ============================================================
// TMS Auth Routes — register, login, Google OAuth, profile
// ============================================================
const express          = require('express');
const jwt              = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User             = require('../models/User');
const { protect }      = require('../middleware/auth');

const authRouter   = express.Router();
const oauthClient  = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Sign a JWT valid for 7 days
const signJwt       = (data)  => jwt.sign(data, process.env.JWT_SECRET, { expiresIn: '7d' });
const signAdminJwt  = ()      => signJwt({ isAdmin: true, email: process.env.ADMIN_EMAIL });

// ─── POST /api/auth/register ────────────────────────────────
authRouter.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role)
      return res.status(400).json({ success: false, message: 'Please fill all fields.' });
    if (!['tenant', 'landlord'].includes(role))
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    if (password.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    if (email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase())
      return res.status(400).json({ success: false, message: 'This email cannot be registered.' });

    // Check duplicate email
    const duplicateUser = await User.findOne({ email: email.toLowerCase() });
    if (duplicateUser)
      return res.status(400).json({ success: false, message: 'Account already exists. Please sign in.' });

    // Create user and return token
    const savedUser    = await User.create({ name: name.trim(), email: email.toLowerCase(), password, role, authProvider: 'email' });
    const accessToken  = signJwt({ id: savedUser._id, role: savedUser.role });
    res.status(201).json({
      success: true,
      token: accessToken,
      user: { id: savedUser._id, name: savedUser.name, email: savedUser.email, role: savedUser.role, status: savedUser.status, verified: savedUser.verified, createdAt: savedUser.createdAt }
    });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'Email already registered.' });
    console.error('Register:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── POST /api/auth/login ───────────────────────────────────
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Enter email and password.' });

    const cleanEmail = email.toLowerCase().trim();

    // Admin shortcut — no DB lookup required
    if (cleanEmail === process.env.ADMIN_EMAIL.toLowerCase()) {
      if (password !== process.env.ADMIN_PASSWORD)
        return res.status(401).json({ success: false, message: 'Incorrect password.' });
      return res.json({
        success: true,
        token: signAdminJwt(),
        user: { id: 'admin', name: 'Super Admin', email: process.env.ADMIN_EMAIL, role: 'admin', isAdmin: true }
      });
    }

    // Regular user lookup
    const loginUser = await User.findOne({ email: cleanEmail }).select('+password');
    if (!loginUser)
      return res.status(401).json({ success: false, message: 'No account found. Please sign up first.' });
    if (loginUser.authProvider === 'google' && !loginUser.password)
      return res.status(400).json({ success: false, message: 'This account uses Google Sign-In.' });
    if (!(await loginUser.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Incorrect password.' });
    if (loginUser.status === 'blocked')
      return res.status(403).json({ success: false, message: 'Account suspended. Contact admin.' });

    const accessToken = signJwt({ id: loginUser._id, role: loginUser.role });
    res.json({
      success: true,
      token: accessToken,
      user: { id: loginUser._id, name: loginUser.name, email: loginUser.email, role: loginUser.role, status: loginUser.status, verified: loginUser.verified, phone: loginUser.phone, city: loginUser.city }
    });
  } catch (err) { console.error('Login:', err); res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ─── POST /api/auth/google ──────────────────────────────────
authRouter.post('/google', async (req, res) => {
  try {
    const { credential, role, mode } = req.body;
    if (!credential)
      return res.status(400).json({ success: false, message: 'Google credential required.' });

    // Verify Google token
    let gPayload;
    try {
      const gTicket = await oauthClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
      gPayload = gTicket.getPayload();
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid Google token.' });
    }

    const { email, name, sub: gId } = gPayload;
    const cleanEmail = email.toLowerCase();

    // Admin via Google
    if (cleanEmail === process.env.ADMIN_EMAIL.toLowerCase())
      return res.json({
        success: true,
        token: signAdminJwt(),
        user: { id: 'admin', name: 'Super Admin', email: process.env.ADMIN_EMAIL, role: 'admin', isAdmin: true }
      });

    let googleUser = await User.findOne({ email: cleanEmail });

    if (mode === 'signin') {
      if (!googleUser)
        return res.status(401).json({ success: false, message: 'No account for ' + email + '. Please sign up.' });
      if (googleUser.status === 'blocked')
        return res.status(403).json({ success: false, message: 'Account suspended.' });
      if (!googleUser.googleId) {
        googleUser.googleId     = gId;
        googleUser.authProvider = 'google';
        await googleUser.save();
      }
    } else {
      if (googleUser)
        return res.status(400).json({ success: false, message: 'Account already exists. Please sign in.' });
      if (!role || !['tenant', 'landlord'].includes(role))
        return res.status(400).json({ success: false, message: 'Select Tenant or Landlord first.' });
      googleUser = await User.create({ name: name || cleanEmail.split('@')[0], email: cleanEmail, role, authProvider: 'google', googleId: gId });
    }

    const accessToken = signJwt({ id: googleUser._id, role: googleUser.role });
    res.json({
      success: true,
      token: accessToken,
      user: { id: googleUser._id, name: googleUser.name, email: googleUser.email, role: googleUser.role, status: googleUser.status, verified: googleUser.verified, phone: googleUser.phone, city: googleUser.city }
    });
  } catch (err) { console.error('Google:', err); res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ─── POST /api/auth/google-fallback (dev mode) ──────────────
authRouter.post('/google-fallback', async (req, res) => {
  try {
    const { email, role, mode } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required.' });

    const cleanEmail = email.toLowerCase().trim();
    if (cleanEmail === process.env.ADMIN_EMAIL.toLowerCase())
      return res.json({
        success: true,
        token: signAdminJwt(),
        user: { id: 'admin', name: 'Super Admin', email: process.env.ADMIN_EMAIL, role: 'admin', isAdmin: true }
      });

    let fbUser = await User.findOne({ email: cleanEmail });
    if (mode === 'signin') {
      if (!fbUser)  return res.status(401).json({ success: false, message: 'No account for ' + email + '.' });
      if (fbUser.status === 'blocked') return res.status(403).json({ success: false, message: 'Account suspended.' });
    } else {
      if (fbUser)   return res.status(400).json({ success: false, message: 'Account already exists.' });
      if (!role)    return res.status(400).json({ success: false, message: 'Select role first.' });
      fbUser = await User.create({ name: cleanEmail.split('@')[0], email: cleanEmail, role, authProvider: 'google' });
    }
    const accessToken = signJwt({ id: fbUser._id, role: fbUser.role });
    res.json({
      success: true,
      token: accessToken,
      user: { id: fbUser._id, name: fbUser.name, email: fbUser.email, role: fbUser.role, status: fbUser.status, verified: fbUser.verified }
    });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ─── GET /api/auth/me ───────────────────────────────────────
authRouter.get('/me', protect, (req, res) => {
  if (req.user?.isAdmin)
    return res.json({ success: true, user: { id: 'admin', name: 'Super Admin', email: process.env.ADMIN_EMAIL, role: 'admin', isAdmin: true } });
  res.json({ success: true, user: req.user });
});

// ─── PUT /api/auth/profile — update logged-in user ──────────
authRouter.put('/profile', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin) return res.json({ success: true, message: 'Admin profile updated.' });
    const { name, phone, cnic, city, address } = req.body;
    const profileUser = await User.findByIdAndUpdate(req.user._id, { name, phone, cnic, city, address }, { new: true });
    res.json({ success: true, user: profileUser });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = authRouter;
