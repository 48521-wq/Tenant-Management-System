// ============================================================
// TMS User Management Routes (Admin Only)
// ============================================================
const express = require('express');
const User    = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

const uRouter = express.Router();

// ─── GET / — list all users with optional role filter ────────
uRouter.get('/', protect, adminOnly, async (req, res) => {
  try {
    const roleFilter = {};
    if (req.query.role) roleFilter.role = req.query.role;
    const userList = await User.find(roleFilter).sort({ createdAt: -1 });
    res.json({ success: true, count: userList.length, users: userList });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── PUT /:id/block — toggle block/active status ─────────────
uRouter.put('/:id/block', protect, adminOnly, async (req, res) => {
  try {
    const pickedUser = await User.findById(req.params.id);
    if (!pickedUser)
      return res.status(404).json({ success: false, message: 'User not found.' });
    pickedUser.status = pickedUser.status === 'blocked' ? 'active' : 'blocked';
    await pickedUser.save();
    res.json({ success: true, message: `User ${pickedUser.status}.`, user: pickedUser });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── PUT /:id/verify — mark user as verified ─────────────────
uRouter.put('/:id/verify', protect, adminOnly, async (req, res) => {
  try {
    const markedUser = await User.findByIdAndUpdate(req.params.id, { verified: true }, { new: true });
    if (!markedUser)
      return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, message: 'User verified.', user: markedUser });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── DELETE /:id — permanently remove a user ─────────────────
uRouter.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = uRouter;
