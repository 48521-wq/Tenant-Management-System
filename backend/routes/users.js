const express = require('express');
const User    = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

// Router instance for user management endpoints
const userRouter = express.Router();

// GET all users (admin only)
userRouter.get('/', protect, adminOnly, async (req, res) => {
  try {
    const queryFilter = {};
    if (req.query.role) queryFilter.role = req.query.role;
    const allUsers = await User.find(queryFilter).sort({ createdAt: -1 });
    res.json({ success: true, count: allUsers.length, users: allUsers });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// PUT block/unblock user (admin only)
userRouter.put('/:id/block', protect, adminOnly, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found.' });
    targetUser.status = targetUser.status === 'blocked' ? 'active' : 'blocked';
    await targetUser.save();
    res.json({ success: true, message: `User ${targetUser.status}.`, user: targetUser });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// PUT verify user (admin only)
userRouter.put('/:id/verify', protect, adminOnly, async (req, res) => {
  try {
    const verifiedUser = await User.findByIdAndUpdate(req.params.id, { verified: true }, { new: true });
    if (!verifiedUser) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, message: 'User verified.', user: verifiedUser });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// DELETE user (admin only)
userRouter.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted.' });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = userRouter;
