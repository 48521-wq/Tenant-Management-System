// ═══════════════════════════════════════════════════════════════
//  User Routes  —  /api/users
//  Admin-only endpoints for managing tenant and landlord accounts
// ═══════════════════════════════════════════════════════════════

const express = require('express');
const User    = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/users ───────────────────────────────────────────────
// List all users — admin only
// Supports optional ?role=tenant|landlord filter via query string
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const filter = {};

    // Apply optional role filter from query params
    if (req.query.role) filter.role = req.query.role;

    const users = await User.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, count: users.length, users });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── PUT /api/users/:id/block ─────────────────────────────────────
// Toggle a user's status between 'active' and 'blocked' (admin only)
router.put('/:id/block', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user)
      return res.status(404).json({ success: false, message: 'User not found.' });

    // Toggle between active ↔ blocked
    user.status = user.status === 'blocked' ? 'active' : 'blocked';
    await user.save();

    res.json({ success: true, message: `User ${user.status}.`, user });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── PUT /api/users/:id/verify ────────────────────────────────────
// Mark a user account as verified (admin only)
router.put('/:id/verify', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { verified: true },
      { new: true }
    );

    if (!user)
      return res.status(404).json({ success: false, message: 'User not found.' });

    res.json({ success: true, message: 'User verified.', user });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── DELETE /api/users/:id ────────────────────────────────────────
// Permanently delete a user account (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted.' });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
