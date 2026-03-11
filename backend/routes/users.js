// ═══════════════════════════════════════════════
//  Users Routes (Admin only)
//  GET  /api/users          — Get all users
//  PUT  /api/users/:id      — Update user
//  PUT  /api/users/:id/block — Block/Unblock
//  DELETE /api/users/:id   — Delete user
// ═══════════════════════════════════════════════
const express = require('express');
const User    = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// GET all users (Admin)
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { role, status, verified } = req.query;
    const filter = {};
    if (role)     filter.role     = role;
    if (status)   filter.status   = status;
    if (verified !== undefined) filter.verified = verified === 'true';

    const users = await User.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET single user
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PUT update user profile
router.put('/:id', protect, async (req, res) => {
  try {
    const { name, phone, cnic, city, address } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, phone, cnic, city, address },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, message: 'Profile updated.', user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PUT block/unblock (Admin)
router.put('/:id/block', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    user.status = user.status === 'blocked' ? 'active' : 'blocked';
    await user.save();
    res.json({ success: true, message: `User ${user.status}.`, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PUT verify user (Admin)
router.put('/:id/verify', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { verified: true }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, message: 'User verified.', user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// DELETE user (Admin)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, message: 'User deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
