const express = require('express');
const Lease   = require('../models/Lease');
const { protect, adminOnly } = require('../middleware/auth');
const router = express.Router();

// GET leases
router.get('/', protect, async (req, res) => {
  try {
    let filter = {};
    if (req.user?.isAdmin) {
      // all leases
    } else if (req.user.role === 'tenant') {
      filter.tenantId = req.user._id;
    } else if (req.user.role === 'landlord') {
      filter.landlordId = req.user._id;
    }
    const leases = await Lease.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: leases.length, leases });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// POST create / sign lease (tenant)
router.post('/', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin) return res.status(403).json({ success: false, message: 'Admin cannot sign leases.' });
    const { propertyTitle, propertyAddress, landlordName, rent, startDate, endDate, duration, terms } = req.body;
    const lease = await Lease.create({
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
    res.status(201).json({ success: true, lease });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// DELETE (admin)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Lease.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted.' });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = router;
