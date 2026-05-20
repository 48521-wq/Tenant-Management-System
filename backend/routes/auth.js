const express    = require('express');
const jwt        = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');

const router  = express.Router();
const gClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const genToken = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

// ─── OTP In-Memory Store ────────────────────────────────────────────────────
// key = email, value = { otp, expiresAt, userData }
const otpStore = new Map();

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,   // Gmail App Password
  },
});

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
}

async function sendOTPEmail(email, otp, name) {
  await transporter.sendMail({
    from: `"TMS - Tenant Management System" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🔐 Your TMS Verification Code',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;background:#f9f9f9;border-radius:12px;padding:32px;border:1px solid #e0e0e0;">
        <h2 style="color:#c9a84c;margin-bottom:4px;">TMS Verification</h2>
        <p style="color:#555;margin-bottom:24px;">Hi <strong>${name}</strong>, please use the code below to verify your email.</p>
        <div style="background:#fff;border:2px dashed #c9a84c;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px;">
          <span style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#222;">${otp}</span>
        </div>
        <p style="color:#888;font-size:13px;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
        <p style="color:#aaa;font-size:12px;text-align:center;">Tenant Management System &copy; 2026</p>
      </div>
    `,
  });
}
const adminTok = () => genToken({ isAdmin: true, email: process.env.ADMIN_EMAIL });

// POST /api/auth/register
router.post('/register', async (req, res) => {
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

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ success: false, message: 'Account already exists. Please sign in.' });

    const user = await User.create({ name: name.trim(), email: email.toLowerCase(), password, role, authProvider: 'email' });
    const token = genToken({ id: user._id, role: user.role });
    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, status: user.status, verified: user.verified, createdAt: user.createdAt }
    });
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ success: false, message: 'Email already registered.' });
    console.error('Register:', e);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/auth/send-otp  — Step 1: validate fields & send OTP
router.post('/send-otp', async (req, res) => {
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

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ success: false, message: 'Account already exists. Please sign in.' });

    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    otpStore.set(email.toLowerCase(), { otp, expiresAt, userData: { name: name.trim(), email: email.toLowerCase(), password, role } });

    await sendOTPEmail(email, otp, name.trim());
    res.json({ success: true, message: 'OTP sent to your email. Please check your inbox.' });
  } catch (e) {
    console.error('Send OTP:', e);
    res.status(500).json({ success: false, message: 'Failed to send OTP. Check server email config.' });
  }
});

// POST /api/auth/verify-otp  — Step 2: verify OTP & create account
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP required.' });

    const record = otpStore.get(email.toLowerCase());
    if (!record) return res.status(400).json({ success: false, message: 'OTP expired or not requested. Please try again.' });
    if (Date.now() > record.expiresAt) {
      otpStore.delete(email.toLowerCase());
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }
    if (record.otp !== otp.trim()) return res.status(400).json({ success: false, message: 'Incorrect OTP. Please try again.' });

    otpStore.delete(email.toLowerCase()); // one-time use

    const { name, password, role } = record.userData;
    const user = await User.create({ name, email: email.toLowerCase(), password, role, authProvider: 'email' });
    const token = genToken({ id: user._id, role: user.role });

    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, status: user.status, verified: user.verified, createdAt: user.createdAt }
    });
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ success: false, message: 'Email already registered.' });
    console.error('Verify OTP:', e);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Enter email and password.' });
    const lEmail = email.toLowerCase().trim();

    // Admin
    if (lEmail === process.env.ADMIN_EMAIL.toLowerCase()) {
      if (password !== process.env.ADMIN_PASSWORD)
        return res.status(401).json({ success: false, message: 'Incorrect password.' });
      return res.json({ success: true, token: adminTok(), user: { id:'admin', name:'Super Admin', email: process.env.ADMIN_EMAIL, role:'admin', isAdmin:true } });
    }

    const user = await User.findOne({ email: lEmail }).select('+password');
    if (!user) return res.status(401).json({ success: false, message: 'No account found. Please sign up first.' });
    if (user.authProvider === 'google' && !user.password)
      return res.status(400).json({ success: false, message: 'This account uses Google Sign-In.' });
    if (!(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Incorrect password.' });
    if (user.status === 'blocked')
      return res.status(403).json({ success: false, message: 'Account suspended. Contact admin.' });

    const token = genToken({ id: user._id, role: user.role });
    res.json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, role: user.role, status: user.status, verified: user.verified, phone: user.phone, city: user.city } });
  } catch (e) { console.error('Login:', e); res.status(500).json({ success: false, message: 'Server error.' }); }
});

// POST /api/auth/google
router.post('/google', async (req, res) => {
  try {
    const { credential, role, mode } = req.body;
    if (!credential) return res.status(400).json({ success: false, message: 'Google credential required.' });

    let payload;
    try {
      const ticket = await gClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
      payload = ticket.getPayload();
    } catch { return res.status(401).json({ success: false, message: 'Invalid Google token.' }); }

    const { email, name, sub: googleId } = payload;
    const lEmail = email.toLowerCase();

    if (lEmail === process.env.ADMIN_EMAIL.toLowerCase())
      return res.json({ success: true, token: adminTok(), user: { id:'admin', name:'Super Admin', email: process.env.ADMIN_EMAIL, role:'admin', isAdmin:true } });

    let user = await User.findOne({ email: lEmail });

    if (mode === 'signin') {
      if (!user) return res.status(401).json({ success: false, message: 'No account for ' + email + '. Please sign up.' });
      if (user.status === 'blocked') return res.status(403).json({ success: false, message: 'Account suspended.' });
      if (!user.googleId) { user.googleId = googleId; user.authProvider = 'google'; await user.save(); }
    } else {
      if (user) return res.status(400).json({ success: false, message: 'Account already exists. Please sign in.' });
      if (!role || !['tenant','landlord'].includes(role))
        return res.status(400).json({ success: false, message: 'Select Tenant or Landlord first.' });
      user = await User.create({ name: name || lEmail.split('@')[0], email: lEmail, role, authProvider: 'google', googleId });
    }

    const token = genToken({ id: user._id, role: user.role });
    res.json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, role: user.role, status: user.status, verified: user.verified, phone: user.phone, city: user.city } });
  } catch (e) { console.error('Google:', e); res.status(500).json({ success: false, message: 'Server error.' }); }
});

// POST /api/auth/google-fallback (dev mode)
router.post('/google-fallback', async (req, res) => {
  try {
    const { email, role, mode } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required.' });
    const lEmail = email.toLowerCase().trim();
    if (lEmail === process.env.ADMIN_EMAIL.toLowerCase())
      return res.json({ success: true, token: adminTok(), user: { id:'admin', name:'Super Admin', email: process.env.ADMIN_EMAIL, role:'admin', isAdmin:true } });

    let user = await User.findOne({ email: lEmail });
    if (mode === 'signin') {
      if (!user) return res.status(401).json({ success: false, message: 'No account for ' + email + '.' });
      if (user.status === 'blocked') return res.status(403).json({ success: false, message: 'Account suspended.' });
    } else {
      if (user) return res.status(400).json({ success: false, message: 'Account already exists.' });
      if (!role) return res.status(400).json({ success: false, message: 'Select role first.' });
      user = await User.create({ name: lEmail.split('@')[0], email: lEmail, role, authProvider: 'google' });
    }
    const token = genToken({ id: user._id, role: user.role });
    res.json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, role: user.role, status: user.status, verified: user.verified } });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  if (req.user?.isAdmin)
    return res.json({ success: true, user: { id:'admin', name:'Super Admin', email: process.env.ADMIN_EMAIL, role:'admin', isAdmin:true } });
  res.json({ success: true, user: req.user });
});

// PUT /api/auth/profile — update logged-in user profile
router.put('/profile', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin) return res.json({ success: true, message: 'Admin profile updated.' });
    const { name, phone, cnic, city, address } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { name, phone, cnic, city, address }, { new: true });
    res.json({ success: true, user });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = router;
