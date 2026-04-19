/**
 * @file users.js
 * @route /api/users
 * @description Admin-only endpoints for managing tenant and landlord accounts.
 *
 * All routes in this file require two middleware guards in sequence:
 *   protect   → verifies the JWT and populates req.user
 *   adminOnly → rejects any non-admin caller with 403 Forbidden
 *
 * Available operations:
 *   GET    /           → list all users (filterable by role)
 *   PUT    /:id/block  → toggle account status between active ↔ blocked
 *   PUT    /:id/verify → mark account as verified (one-way; cannot undo)
 *   DELETE /:id        → permanently delete a user account
 */

const express = require('express');
const User    = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// HTTP status codes
const HTTP_OK      = 200;
const HTTP_NOT_FOUND = 404;
const HTTP_SERVER_ERROR = 500;

// ─────────────────────────────────────────────────────────────────
// GET /api/users
// ─────────────────────────────────────────────────────────────────
/**
 * Returns a list of all registered users.
 * Optional query parameters:
 *   ?role=tenant    → return only tenants
 *   ?role=landlord  → return only landlords
 *
 * Results are sorted newest first so the admin sees recent sign-ups
 * at the top of the dashboard table.
 *
 * @middleware protect   - Valid JWT required
 * @middleware adminOnly - Admin access required
 * @returns {200} { success, count, users }
 * @returns {500} Unexpected server error
 */
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const queryFilter = {};

    // Apply role filter when provided
    if (req.query.role) queryFilter.role = req.query.role;

    const allUsers = await User.find(queryFilter).sort({ createdAt: -1 });

    res.json({ success: true, count: allUsers.length, users: allUsers });

  } catch (err) {
    res.status(HTTP_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// PUT /api/users/:id/block
// ─────────────────────────────────────────────────────────────────
/**
 * Toggles a user's account status between 'active' and 'blocked'.
 * A blocked user receives 403 Forbidden on every protected route —
 * effectively locking them out without deleting their data.
 * Calling this endpoint again on a blocked account unblocks it.
 *
 * @middleware protect   - Valid JWT required
 * @middleware adminOnly - Admin access required
 * @returns {200} { success, message, user }  — message reflects new status
 * @returns {404} User not found
 * @returns {500} Unexpected server error
 */
router.put('/:id/block', protect, adminOnly, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);

    if (!targetUser)
      return res.status(HTTP_NOT_FOUND).json({ success: false, message: 'User not found.' });

    // Toggle: blocked → active; active → blocked
    targetUser.status = targetUser.status === 'blocked' ? 'active' : 'blocked';
    await targetUser.save();

    res.json({
      success: true,
      message: `User ${targetUser.status}.`,
      user:    targetUser,
    });

  } catch (err) {
    res.status(HTTP_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// PUT /api/users/:id/verify
// ─────────────────────────────────────────────────────────────────
/**
 * Marks a user account as verified (sets verified: true).
 * Verification is a one-way operation — once verified, the flag stays true.
 * Admin uses this after reviewing the user's identity documents
 * (typically part of the landlord approval workflow).
 *
 * @middleware protect   - Valid JWT required
 * @middleware adminOnly - Admin access required
 * @returns {200} { success, message, user }
 * @returns {404} User not found
 * @returns {500} Unexpected server error
 */
router.put('/:id/verify', protect, adminOnly, async (req, res) => {
  try {
    // { new: true } returns the document AFTER the update is applied
    const verifiedUser = await User.findByIdAndUpdate(
      req.params.id,
      { verified: true },
      { new: true }
    );

    if (!verifiedUser)
      return res.status(HTTP_NOT_FOUND).json({ success: false, message: 'User not found.' });

    res.json({ success: true, message: 'User verified.', user: verifiedUser });

  } catch (err) {
    res.status(HTTP_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// DELETE /api/users/:id
// ─────────────────────────────────────────────────────────────────
/**
 * Permanently removes a user account from the database (admin only).
 * Hard delete — the record cannot be recovered.
 * Properties, complaints, or leases linked to this user remain in
 * the database but lose their owner reference (orphaned documents).
 *
 * @middleware protect   - Valid JWT required
 * @middleware adminOnly - Admin access required
 * @returns {200} { success, message }
 * @returns {500} Unexpected server error
 */
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted.' });

  } catch (err) {
    res.status(HTTP_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
