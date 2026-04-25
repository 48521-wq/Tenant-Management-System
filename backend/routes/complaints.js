// ============================================================
// TMS — Complaint Routes
// ============================================================
'use strict';

const router        = require('express').Router();
const ComplaintModel = require('../models/Complaint');
const { protect, adminOnly } = require('../middleware/auth');

// ─── GET / ───────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const qry = {};
    if (req.user?.isAdmin)                { if (req.query.status) qry.status = req.query.status; }
    else if (req.user.role === 'tenant')   { qry.tenantId   = req.user._id; }
    else if (req.user.role === 'landlord') { qry.landlordId = req.user._id; }
    const rows = await ComplaintModel.find(qry).sort({ createdAt: -1 });
    return res.json({ success: true, count: rows.length, complaints: rows });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ─── POST / ──────────────────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin)
      return res.status(403).json({ success: false, message: 'Admin cannot file complaints.' });
    const { subject, description, category, priority } = req.body;
    if (!subject) return res.status(400).json({ success: false, message: 'Subject is required.' });
    const saved = await ComplaintModel.create({ tenantId: req.user._id, tenantName: req.user.name, subject, description, category, priority });
    return res.status(201).json({ success: true, complaint: saved });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ─── PUT /:id/status ─────────────────────────────────────────
router.put('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const patch = { status };
    if (adminNote) patch.adminNote = adminNote;
    if (status === 'resolved') patch.resolvedAt = new Date();
    const updated = await ComplaintModel.findByIdAndUpdate(req.params.id, patch, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Not found.' });
    return res.json({ success: true, complaint: updated });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ─── DELETE /:id ─────────────────────────────────────────────
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await ComplaintModel.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Complaint deleted.' });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = router;
