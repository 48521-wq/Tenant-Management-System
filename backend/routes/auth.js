// Auth routes — register, login, Google OAuth, profile
const express = require('express');
const jwt     = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');

const authRouter    = express.Router();
const oauthClient   = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Build a signed JWT that expires in 7 days
const buildToken      = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
const buildAdminToken = () => buildToken({ isAdmin: true, email: process.env.ADMIN_EMAIL });

// POST /api/auth/register
authRouter.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role)
      return res.status(400).json({ success: false, message: 'Please fill all fields.' });
    if (!['tenant','landlord'].includes(role))
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    if (password.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    if (email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase())
      return res.status(400).json({ success: false, message: 'This email cannot be registered.' });

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) return res.status(400).json({ success: false, message: 'Account already exists. Please sign in.' });

    const newUser  = await User.create({ name: name.trim(), email: email.toLowerCase(), password, role, authProvider: 'email' });
    const jwtToken = buildToken({ id: newUser._id, role: newUser.role });
    res.status(201).json({
      success: true,
      token: jwtToken,
      user: { id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role, status: newUser.status, verified: newUser.verified, createdAt: newUser.createdAt }
    });
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ success: false, message: 'Email already registered.' });
    console.error('Register:', e);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Enter email and password.' });
    const normalizedEmail = email.toLowerCase().trim();

    // Check for admin credentials first
    if (normalizedEmail === process.env.ADMIN_EMAIL.toLowerCase()) {
      if (password !== process.env.ADMIN_PASSWORD)
        return res.status(401).json({ success: false, message: 'Incorrect password.' });
      return res.json({ success: true, token: buildAdminToken(), user: { id:'admin', name:'Super Admin', email: process.env.ADMIN_EMAIL, role:'admin', isAdmin:true } });
    }

    const foundUser = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!foundUser) return res.status(401).json({ success: false, message: 'No account found. Please sign up first.' });
    if (foundUser.authProvider === 'google' && !foundUser.password)
      return res.status(400).json({ success: false, message: 'This account uses Google Sign-In.' });
    if (!(await foundUser.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Incorrect password.' });
    if (foundUser.status === 'blocked')
      return res.status(403).json({ success: false, message: 'Account suspended. Contact admin.' });

    const jwtToken = buildToken({ id: foundUser._id, role: foundUser.role });
    res.json({ success: true, token: jwtToken, user: { id: foundUser._id, name: foundUser.name, email: foundUser.email, role: foundUser.role, status: foundUser.status, verified: foundUser.verified, phone: foundUser.phone, city: foundUser.city } });
  } catch (e) { console.error('Login:', e); res.status(500).json({ success: false, message: 'Server error.' }); }
});

// POST /api/auth/google
authRouter.post('/google', async (req, res) => {
  try {
    const { credential, role, mode } = req.body;
    if (!credential) return res.status(400).json({ success: false, message: 'Google credential required.' });

    let googlePayload;
    try {
      const verifiedTicket = await oauthClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
      googlePayload = verifiedTicket.getPayload();
    } catch { return res.status(401).json({ success: false, message: 'Invalid Google token.' }); }

    const { email, name, sub: googleId } = googlePayload;
    const normalizedEmail = email.toLowerCase();

    if (normalizedEmail === process.env.ADMIN_EMAIL.toLowerCase())
      return res.json({ success: true, token: buildAdminToken(), user: { id:'admin', name:'Super Admin', email: process.env.ADMIN_EMAIL, role:'admin', isAdmin:true } });

    let matchedUser = await User.findOne({ email: normalizedEmail });

    if (mode === 'signin') {
      if (!matchedUser) return res.status(401).json({ success: false, message: 'No account for ' + email + '. Please sign up.' });
      if (matchedUser.status === 'blocked') return res.status(403).json({ success: false, message: 'Account suspended.' });
      if (!matchedUser.googleId) { matchedUser.googleId = googleId; matchedUser.authProvider = 'google'; await matchedUser.save(); }
    } else {
      if (matchedUser) return res.status(400).json({ success: false, message: 'Account already exists. Please sign in.' });
      if (!role || !['tenant','landlord'].includes(role))
        return res.status(400).json({ success: false, message: 'Select Tenant or Landlord first.' });
      matchedUser = await User.create({ name: name || normalizedEmail.split('@')[0], email: normalizedEmail, role, authProvider: 'google', googleId });
    }

    const jwtToken = buildToken({ id: matchedUser._id, role: matchedUser.role });
    res.json({ success: true, token: jwtToken, user: { id: matchedUser._id, name: matchedUser.name, email: matchedUser.email, role: matchedUser.role, status: matchedUser.status, verified: matchedUser.verified, phone: matchedUser.phone, city: matchedUser.city } });
  } catch (e) { console.error('Google:', e); res.status(500).json({ success: false, message: 'Server error.' }); }
});

// POST /api/auth/google-fallback (dev mode)
authRouter.post('/google-fallback', async (req, res) => {
  try {
    const { email, role, mode } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required.' });
    const normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail === process.env.ADMIN_EMAIL.toLowerCase())
      return res.json({ success: true, token: buildAdminToken(), user: { id:'admin', name:'Super Admin', email: process.env.ADMIN_EMAIL, role:'admin', isAdmin:true } });

    let matchedUser = await User.findOne({ email: normalizedEmail });
    if (mode === 'signin') {
      if (!matchedUser) return res.status(401).json({ success: false, message: 'No account for ' + email + '.' });
      if (matchedUser.status === 'blocked') return res.status(403).json({ success: false, message: 'Account suspended.' });
    } else {
      if (matchedUser) return res.status(400).json({ success: false, message: 'Account already exists.' });
      if (!role) return res.status(400).json({ success: false, message: 'Select role first.' });
      matchedUser = await User.create({ name: normalizedEmail.split('@')[0], email: normalizedEmail, role, authProvider: 'google' });
    }
    const jwtToken = buildToken({ id: matchedUser._id, role: matchedUser.role });
    res.json({ success: true, token: jwtToken, user: { id: matchedUser._id, name: matchedUser.name, email: matchedUser.email, role: matchedUser.role, status: matchedUser.status, verified: matchedUser.verified } });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// GET /api/auth/me
authRouter.get('/me', protect, (req, res) => {
  if (req.user?.isAdmin)
    return res.json({ success: true, user: { id:'admin', name:'Super Admin', email: process.env.ADMIN_EMAIL, role:'admin', isAdmin:true } });
  res.json({ success: true, user: req.user });
});

// PUT /api/auth/profile — update logged-in user profile
authRouter.put('/profile', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin) return res.json({ success: true, message: 'Admin profile updated.' });
    const { name, phone, cnic, city, address } = req.body;
    const updatedUser = await User.findByIdAndUpdate(req.user._id, { name, phone, cnic, city, address }, { new: true });
    res.json({ success: true, user: updatedUser });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = authRouter;
