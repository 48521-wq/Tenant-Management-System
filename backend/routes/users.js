/**
 * @file users.js
 * @route /api/users
 * @description Admin-only endpoints for managing tenant and landlord accounts.
 *
 * All routes require: protect → adminOnly middleware chain.
 *
 * Available operations:
 *   GET    /           → list all users (filterable by role)
 *   PUT    /:id/block  → toggle active ↔ blocked
 *   PUT    /:id/verify → mark as verified (one-way)
 *   DELETE /:id        → permanently remove account
 */

const express    = require('express');
const UserModel  = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

const usersRouter = express.Router();

const HTTP_NOT_FOUND    = 404;
const HTTP_SERVER_ERROR = 500;

// ─────────────────────────────────────────────────────────────────
// GET /api/users
// ─────────────────────────────────────────────────────────────────
usersRouter.get('/', protect, adminOnly, async (req, res) => {
  try {
    const searchFilter = {};
    if (req.query.role) searchFilter.role = req.query.role;

    const userRecords = await UserModel.find(searchFilter).sort({ createdAt: -1 });

    res.json({ success: true, count: userRecords.length, users: userRecords });

  } catch (listErr) {
    res.status(HTTP_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// PUT /api/users/:id/block
// ─────────────────────────────────────────────────────────────────
usersRouter.put('/:id/block', protect, adminOnly, async (req, res) => {
  try {
    const selectedUser = await UserModel.findById(req.params.id);

    if (!selectedUser)
      return res.status(HTTP_NOT_FOUND).json({ success: false, message: 'User not found.' });

    selectedUser.status = selectedUser.status === 'blocked' ? 'active' : 'blocked';
    await selectedUser.save();

    res.json({
      success: true,
      message: `User ${selectedUser.status}.`,
      user:    selectedUser,
    });

  } catch (blockErr) {
    res.status(HTTP_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// PUT /api/users/:id/verify
// ─────────────────────────────────────────────────────────────────
usersRouter.put('/:id/verify', protect, adminOnly, async (req, res) => {
  try {
    const approvedUser = await UserModel.findByIdAndUpdate(
      req.params.id,
      { verified: true },
      { new: true }
    );

    if (!approvedUser)
      return res.status(HTTP_NOT_FOUND).json({ success: false, message: 'User not found.' });

    res.json({ success: true, message: 'User verified.', user: approvedUser });

  } catch (verifyErr) {
    res.status(HTTP_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// DELETE /api/users/:id
// ─────────────────────────────────────────────────────────────────
usersRouter.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await UserModel.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted.' });

  } catch (deleteErr) {
    res.status(HTTP_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

module.exports = usersRouter;
