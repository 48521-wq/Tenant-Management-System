const express = require('express');
const Lease   = require('../models/Lease');
const { protect, adminOnly } = require('../middleware/auth');

// Router instance for lease endpoints
const leaseRouter = express.Router();

// GET leases — filtered by user role
leaseRouter.get('/', protect, async (req, res) => {
  try {
    let queryFilter = {};
    if (req.user?.isAdmin) {
      // admin gets all leases — no filter applied
    } else if (req.user.role === 'tenant') {
      queryFilter.tenantId = req.user._id;
    } else if (req.user.role === 'landlord') {
      queryFilter.landlordId = req.user._id;
    }
    const allLeases = await Lease.find(queryFilter).sort({ createdAt: -1 });
    res.json({ success: true, count: allLeases.length, leases: allLeases });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// POST create / sign lease (tenant only)
leaseRouter.post('/', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin) return res.status(403).json({ success: false, message: 'Admin cannot sign leases.' });
    const { propertyTitle, propertyAddress, landlordName, rent, startDate, endDate, duration, terms } = req.body;
    const newLease = await Lease.create({
      tenantId:       req.user._id,
      tenantName:     req.user.name,
      tenantEmail:    req.user.email,
      landlordName:   landlordName || '',
      propertyTitle:  propertyTitle || '',
      propertyAddress:propertyAddress || '',
      rent:           rent || 0,
      startDate, endDate, duration, terms,
      status: 'active',
      signedAt: new Date(),
    });
    res.status(201).json({ success: true, lease: newLease });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// DELETE lease (admin only)
leaseRouter.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Lease.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted.' });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = leaseRouter;
