// ============================================================
// TMS — Lease Routes
// ============================================================
'use strict';

const express = require('express');
const Lease   = require('../models/Lease');
const { protect, adminOnly } = require('../middleware/auth');

const leaseRoutes = express.Router();

// ─── GET / — leases by role ───────────────────────────────────
leaseRoutes.get('/', protect, async (req, res) => {
  try {
    const lsFilter = {};
    if (req.user?.isAdmin) {
      // Admin fetches all — no filter needed
    } else if (req.user.role === 'tenant') {
      lsFilter.tenantId = req.user._id;
    } else if (req.user.role === 'landlord') {
      lsFilter.landlordId = req.user._id;
    }
    const lsList = await Lease.find(lsFilter).sort({ createdAt: -1 });
    return res.json({ success: true, count: lsList.length, leases: lsList });
  } catch (lsListErr) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── POST / — tenant signs a lease ───────────────────────────
leaseRoutes.post('/', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin)
      return res.status(403).json({ success: false, message: 'Admin cannot sign leases.' });
    const { propertyTitle, propertyAddress, landlordName, rent, startDate, endDate, duration, terms } = req.body;
    const newLs = await Lease.create({
      tenantId:        req.user._id,
      tenantName:      req.user.name,
      tenantEmail:     req.user.email,
      landlordName:    landlordName    || '',
      propertyTitle:   propertyTitle   || '',
      propertyAddress: propertyAddress || '',
      rent:            rent || 0,
      startDate, endDate, duration, terms,
      status:   'active',
      signedAt: new Date(),
    });
    return res.status(201).json({ success: true, lease: newLs });
  } catch (lsCreateErr) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── DELETE /:id — admin removes lease ───────────────────────
leaseRoutes.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Lease.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Deleted.' });
  } catch (lsDelErr) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = leaseRoutes;
