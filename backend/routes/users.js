/**
 * @file users.js
 * @route /api/users
 * @description Admin-only routes for managing tenant and landlord accounts.
 *
 * All routes require two middleware guards:
 *   protect   — verifies JWT and populates req.user
 *   adminOnly — rejects non-admin callers with 403
 *
 * Available operations:
 *   GET    /           — list all users (filterable by role)
 *   PUT    /:id/block  — toggle account between active ↔ blocked
 *   PUT    /:id/verify — mark account as verified (irreversible)
 *   DELETE /:id        — permanently delete an account
 */

'use strict';

const express = require('express');
const User    = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// ── HTTP status codes ──────────────────────────────────────────
const STATUS_NOT_FOUND    = 404;
const STATUS_SERVER_ERROR = 500;

// ── GET /api/users ─────────────────────────────────────────────
/**
 * Returns all registered users, newest first.
 * Optional filter: ?role=tenant | ?role=landlord
 *
 * @middleware protect, adminOnly
 * @returns {200} { success, count, users }
 * @returns {500} Server error
 */
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;

    const users = await User.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, count: users.length, users });

  } catch (_err) {
    res.status(STATUS_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ── PUT /api/users/:id/block ───────────────────────────────────
/**
 * Toggles account status between 'active' and 'blocked'.
 * Blocked users receive 403 on every protected route.
 * Calling again on a blocked account unblocks it.
 *
 * @middleware protect, adminOnly
 * @returns {200} { success, message, user }
 * @returns {404} User not found
 * @returns {500} Server error
 */
router.put('/:id/block', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user)
      return res.status(STATUS_NOT_FOUND).json({ success: false, message: 'User not found.' });

    // Toggle status
    user.status = user.status === 'blocked' ? 'active' : 'blocked';
    await user.save();

    res.json({ success: true, message: `User ${user.status}.`, user });

  } catch (_err) {
    res.status(STATUS_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ── PUT /api/users/:id/verify ──────────────────────────────────
/**
 * Marks a user account as verified (sets verified: true).
 * One-way operation — cannot be reversed via the API.
 * Used after admin reviews the user's identity documents.
 *
 * @middleware protect, adminOnly
 * @returns {200} { success, message, user }
 * @returns {404} User not found
 * @returns {500} Server error
 */
router.put('/:id/verify', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { verified: true },
      { new: true }
    );

    if (!user)
      return res.status(STATUS_NOT_FOUND).json({ success: false, message: 'User not found.' });

    res.json({ success: true, message: 'User verified.', user });

  } catch (_err) {
    res.status(STATUS_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ── DELETE /api/users/:id ──────────────────────────────────────
/**
 * Permanently removes a user account. Hard delete — irreversible.
 * Linked documents (properties, complaints, leases) remain but lose
 * their owner reference.
 *
 * @middleware protect, adminOnly
 * @returns {200} { success, message }
 * @returns {500} Server error
 */
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted.' });

  } catch (_err) {
    res.status(STATUS_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
