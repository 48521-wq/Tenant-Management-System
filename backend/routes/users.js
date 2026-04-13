// ═══════════════════════════════════════════════════════════════
//  User Routes  —  /api/users
//  Admin-only endpoints for managing tenant and landlord accounts.
//
//  All routes in this file require two middleware guards:
//    protect   — verifies the JWT and populates req.user
//    adminOnly — rejects any non-admin request with 403
//
//  Base path: /api/users
// ═══════════════════════════════════════════════════════════════

const express = require('express');
const User    = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/users ───────────────────────────────────────────────
// Return a list of all registered users (admin only).
//
// Optional query parameters:
//   ?role=tenant     — return only tenants
//   ?role=landlord   — return only landlords
//
// Results are sorted newest first so the admin sees recent signups
// at the top of the dashboard table.
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const filter = {};

    // Apply role filter when provided in the query string
    if (req.query.role) filter.role = req.query.role;

    const users = await User.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, count: users.length, users });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── PUT /api/users/:id/block ─────────────────────────────────────
// Toggle a user's account status between 'active' and 'blocked'.
//
// When a user is blocked they receive a 403 Forbidden on every
// protected route — effectively locking them out without deletion.
// Calling this endpoint again unblocks the account.
router.put('/:id/block', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user)
      return res.status(404).json({ success: false, message: 'User not found.' });

    // Flip status: blocked → active, active → blocked
    user.status = user.status === 'blocked' ? 'active' : 'blocked';
    await user.save();

    // Response message reflects the new status ("User active." / "User blocked.")
    res.json({ success: true, message: `User ${user.status}.`, user });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── PUT /api/users/:id/verify ────────────────────────────────────
// Mark a user account as verified (sets verified: true).
//
// Verification is a one-way operation — once verified, a user stays
// verified. The admin uses this after checking the user's documents
// or identity in the landlord approval workflow.
router.put('/:id/verify', protect, adminOnly, async (req, res) => {
  try {
    // { new: true } returns the document AFTER the update is applied
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
// Permanently remove a user account from the database (admin only).
//
// This is a hard delete — the record cannot be recovered.
// Any properties, complaints, or leases linked to this user
// will remain in the database but lose their owner reference.
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted.' });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
