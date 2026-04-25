// ============================================================
// TMS — Lease Routes
// ============================================================
'use strict';

const router      = require('express').Router();
const LeaseModel  = require('../models/Lease');
const { protect, adminOnly } = require('../middleware/auth');

// ─── GET / ───────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const qry = {};
    if (req.user?.isAdmin)                { /* all */ }
    else if (req.user.role === 'tenant')   { qry.tenantId   = req.user._id; }
    else if (req.user.role === 'landlord') { qry.landlordId = req.user._id; }
    const rows = await LeaseModel.find(qry).sort({ createdAt: -1 });
    return res.json({ success: true, count: rows.length, leases: rows });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ─── POST / ──────────────────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin)
      return res.status(403).json({ success: false, message: 'Admin cannot sign leases.' });
    const { propertyTitle, propertyAddress, landlordName, rent, startDate, endDate, duration, terms } = req.body;
    const saved = await LeaseModel.create({
      tenantId: req.user._id, tenantName: req.user.name, tenantEmail: req.user.email,
      landlordName: landlordName || '', propertyTitle: propertyTitle || '',
      propertyAddress: propertyAddress || '', rent: rent || 0,
      startDate, endDate, duration, terms, status: 'active', signedAt: new Date(),
    });
    return res.status(201).json({ success: true, lease: saved });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ─── DELETE /:id ─────────────────────────────────────────────
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await LeaseModel.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Deleted.' });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = router;
