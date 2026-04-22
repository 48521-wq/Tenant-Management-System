// ============================================================
// TMS — User Management Routes (Admin Only)
// ============================================================
'use strict';

const express = require('express');
const User    = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

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
});

module.exports = userRoutes;
