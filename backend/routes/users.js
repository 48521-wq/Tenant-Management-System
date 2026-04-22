<<<<<<< HEAD
// ============================================================
// TMS — User Management Routes (Admin Only)
// ============================================================
'use strict';

=======
>>>>>>> 17a4da6032e965253aaaaa7e291f867a3df0f14b
const express = require('express');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');
<<<<<<< HEAD

const userRoutes = express.Router();

// ─── GET / — all users, optional role filter ─────────────────
userRoutes.get('/', protect, adminOnly, async (req, res) => {
  try {
    const uFilter = {};
    if (req.query.role) uFilter.role = req.query.role;
    const uList = await User.find(uFilter).sort({ createdAt: -1 });
    return res.json({ success: true, count: uList.length, users: uList });
  } catch (uListErr) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── PUT /:id/block — toggle block / active ──────────────────
userRoutes.put('/:id/block', protect, adminOnly, async (req, res) => {
  try {
    const chosenUser = await User.findById(req.params.id);
    if (!chosenUser)
      return res.status(404).json({ success: false, message: 'User not found.' });
    chosenUser.status = chosenUser.status === 'blocked' ? 'active' : 'blocked';
    await chosenUser.save();
    return res.json({ success: true, message: `User ${chosenUser.status}.`, user: chosenUser });
  } catch (uBlockErr) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── PUT /:id/verify — mark user verified ────────────────────
userRoutes.put('/:id/verify', protect, adminOnly, async (req, res) => {
  try {
    const confirmedUser = await User.findByIdAndUpdate(req.params.id, { verified: true }, { new: true });
    if (!confirmedUser)
      return res.status(404).json({ success: false, message: 'User not found.' });
    return res.json({ success: true, message: 'User verified.', user: confirmedUser });
  } catch (uVerifyErr) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── DELETE /:id — remove user ───────────────────────────────
userRoutes.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'User deleted.' });
  } catch (uDelErr) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
=======
const router = express.Router();

// GET all users (admin)
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    const users = await User.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, users });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// PUT block/unblock
router.put('/:id/block', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    user.status = user.status === 'blocked' ? 'active' : 'blocked';
    await user.save();
    res.json({ success: true, message: `User ${user.status}.`, user });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// PUT verify
router.put('/:id/verify', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { verified: true }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, message: 'User verified.', user });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// DELETE user
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted.' });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
>>>>>>> 17a4da6032e965253aaaaa7e291f867a3df0f14b
});

module.exports = userRoutes;
