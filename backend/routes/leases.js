// ============================================================
// TMS — Lease Routes
// ============================================================
'use strict';

const leaseRouter = require('express').Router();
const TmsLease    = require('../models/Lease');
const { protect, adminOnly } = require('../middleware/auth');

// ─── GET / — leases by role ───────────────────────────────────
leaseRouter.get('/', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.user?.isAdmin)                { /* admin sees all */ }
    else if (req.user.role === 'tenant')   { filter.tenantId   = req.user._id; }
    else if (req.user.role === 'landlord') { filter.landlordId = req.user._id; }
    const leaseList = await TmsLease.find(filter).sort({ createdAt: -1 });
    return res.json({ success: true, count: leaseList.length, leases: leaseList });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ─── POST / — tenant signs a lease ───────────────────────────
leaseRouter.post('/', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin)
      return res.status(403).json({ success: false, message: 'Admin cannot sign leases.' });
    const { propertyTitle, propertyAddress, landlordName, rent, startDate, endDate, duration, terms } = req.body;
    const newLease = await TmsLease.create({
      tenantId: req.user._id, tenantName: req.user.name, tenantEmail: req.user.email,
      landlordName: landlordName || '', propertyTitle: propertyTitle || '',
      propertyAddress: propertyAddress || '', rent: rent || 0,
      startDate, endDate, duration, terms, status: 'active', signedAt: new Date(),
    });
    return res.status(201).json({ success: true, lease: newLease });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ─── DELETE /:id — admin removes lease ───────────────────────
leaseRouter.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await TmsLease.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Deleted.' });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = leaseRouter;
