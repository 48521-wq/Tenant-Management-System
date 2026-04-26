// ============================================================
// TMS — User Management Routes (Admin Only)
// ============================================================
'use strict';

const userRouter = require('express').Router();
const TmsUser    = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

// ─── GET / — list all users ───────────────────────────────────
userRouter.get('/', protect, adminOnly, async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    const userList = await TmsUser.find(filter).sort({ createdAt: -1 });
    return res.json({ success: true, count: userList.length, users: userList });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ─── PUT /:id/block — toggle block/active ────────────────────
userRouter.put('/:id/block', protect, adminOnly, async (req, res) => {
  try {
    const picked = await TmsUser.findById(req.params.id);
    if (!picked) return res.status(404).json({ success: false, message: 'User not found.' });
    picked.status = picked.status === 'blocked' ? 'active' : 'blocked';
    await picked.save();
    return res.json({ success: true, message: `User ${picked.status}.`, user: picked });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ─── PUT /:id/verify — mark user verified ────────────────────
userRouter.put('/:id/verify', protect, adminOnly, async (req, res) => {
  try {
    const confirmed = await TmsUser.findByIdAndUpdate(req.params.id, { verified: true }, { new: true });
    if (!confirmed) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.json({ success: true, message: 'User verified.', user: confirmed });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ─── DELETE /:id — remove user ───────────────────────────────
userRouter.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await TmsUser.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'User deleted.' });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = userRouter;
