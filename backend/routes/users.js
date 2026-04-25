// ============================================================
// TMS — User Management Routes (Admin Only)
// ============================================================
'use strict';

const router    = require('express').Router();
const UserModel = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

// ─── GET / ───────────────────────────────────────────────────
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const qry = {};
    if (req.query.role) qry.role = req.query.role;
    const rows = await UserModel.find(qry).sort({ createdAt: -1 });
    return res.json({ success: true, count: rows.length, users: rows });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ─── PUT /:id/block ──────────────────────────────────────────
router.put('/:id/block', protect, adminOnly, async (req, res) => {
  try {
    const target = await UserModel.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: 'User not found.' });
    target.status = target.status === 'blocked' ? 'active' : 'blocked';
    await target.save();
    return res.json({ success: true, message: `User ${target.status}.`, user: target });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ─── PUT /:id/verify ─────────────────────────────────────────
router.put('/:id/verify', protect, adminOnly, async (req, res) => {
  try {
    const verified = await UserModel.findByIdAndUpdate(req.params.id, { verified: true }, { new: true });
    if (!verified) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.json({ success: true, message: 'User verified.', user: verified });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ─── DELETE /:id ─────────────────────────────────────────────
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await UserModel.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'User deleted.' });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = router;
