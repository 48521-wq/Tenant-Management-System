// ============================================================
// TMS Lease Routes
// ============================================================
const express = require('express');
const Lease   = require('../models/Lease');
const { protect, adminOnly } = require('../middleware/auth');

const lRouter = express.Router();

// ─── GET / — list leases filtered by role ────────────────────
lRouter.get('/', protect, async (req, res) => {
  try {
    const roleFilter = {};
    if (req.user?.isAdmin) {
      // Admin sees all leases — no filter applied
    } else if (req.user.role === 'tenant') {
      roleFilter.tenantId = req.user._id;
    } else if (req.user.role === 'landlord') {
      roleFilter.landlordId = req.user._id;
    }
    const leaseList = await Lease.find(roleFilter).sort({ createdAt: -1 });
    res.json({ success: true, count: leaseList.length, leases: leaseList });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── POST / — tenant signs a new lease ───────────────────────
lRouter.post('/', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin)
      return res.status(403).json({ success: false, message: 'Admin cannot sign leases.' });
    const { propertyTitle, propertyAddress, landlordName, rent, startDate, endDate, duration, terms } = req.body;
    const signedLease = await Lease.create({
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
    res.status(201).json({ success: true, lease: signedLease });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── DELETE /:id — admin removes a lease ─────────────────────
lRouter.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Lease.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = lRouter;
