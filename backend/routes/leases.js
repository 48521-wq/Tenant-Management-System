<<<<<<< HEAD
// ============================================================
// TMS — Lease Routes
// ============================================================
'use strict';

=======
>>>>>>> 17a4da6032e965253aaaaa7e291f867a3df0f14b
const express = require('express');
const mongoose = require('mongoose');
const Lease   = require('../models/Lease');
const { protect, adminOnly } = require('../middleware/auth');
<<<<<<< HEAD

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
=======
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
      const Property = require('../models/Property');
      const props = await Property.find({ landlordId: req.user._id }).select('_id title');
      const propIds = props.map(p => p._id);
      const propTitles = props.map(p => p.title).filter(Boolean);
      const escapedName = (req.user.name || '').replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
      const nameRegex = new RegExp(`^${escapedName}$`, 'i');
      const titleRegexes = propTitles.map(t => new RegExp(`^${t.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}$`, 'i'));
      filter = {
        $or: [
          { landlordId: req.user._id },
          { propertyId: { $in: propIds } },
          { landlordName: nameRegex },
          ...(titleRegexes.length ? [{ propertyTitle: { $in: titleRegexes } }] : []),
        ]
      };
    }
    const leases = await Lease.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: leases.length, leases });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// POST create / sign lease (tenant)
router.post('/', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin) return res.status(403).json({ success: false, message: 'Admin cannot sign leases.' });
    const { propertyTitle, propertyAddress, landlordName, rent, startDate, endDate, duration, terms, landlordId, propertyId } = req.body;
    
    // Remove all old leases for this tenant before creating new one
    await Lease.deleteMany({
      tenantId: req.user._id,
      status: { $in: ['pending', 'active'] }
    });
    
    const leaseData = {
      tenantId:       req.user._id,
      tenantName:     req.user.name,
      tenantEmail:    req.user.email,
      landlordName:   landlordName || '',
      propertyTitle:  propertyTitle || '',
      propertyAddress:propertyAddress || '',
      rent:           rent || 0,
      startDate, endDate, duration, terms,
      status: 'pending',
      acceptedAt: null,
      signedAt: new Date(),
    };
    if (landlordId && mongoose.Types.ObjectId.isValid(landlordId)) {
      leaseData.landlordId = landlordId;
    }
    if (propertyId && mongoose.Types.ObjectId.isValid(propertyId)) {
      leaseData.propertyId = propertyId;
    }
    const lease = await Lease.create(leaseData);
    res.status(201).json({ success: true, lease });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// PUT accept lease (landlord)
router.put('/:id/accept', protect, async (req, res) => {
  try {
    const lease = await Lease.findById(req.params.id);
    if (!lease) return res.status(404).json({ success: false, message: 'Lease not found.' });
    if (req.user.role !== 'landlord') return res.status(403).json({ success: false, message: 'Not authorized.' });
    if (lease.landlordId && lease.landlordId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to accept this lease.' });
    }
    if (!lease.landlordId && lease.landlordName !== req.user.name) {
      return res.status(403).json({ success: false, message: 'Not authorized to accept this lease.' });
    }

    // Remove any other old active/pending leases for this tenant
    await Lease.deleteMany({
      tenantId: lease.tenantId,
      _id: { $ne: lease._id },
      status: { $in: ['pending', 'active'] }
    });

    lease.status = 'active';
    lease.acceptedAt = new Date();
    await lease.save();
    res.json({ success: true, lease });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// PUT reject lease (landlord)
router.put('/:id/reject', protect, async (req, res) => {
  try {
    const lease = await Lease.findById(req.params.id);
    if (!lease) return res.status(404).json({ success: false, message: 'Lease not found.' });
    if (req.user.role !== 'landlord') return res.status(403).json({ success: false, message: 'Not authorized.' });
    if (lease.landlordId && lease.landlordId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to reject this lease.' });
    }
    if (!lease.landlordId && lease.landlordName !== req.user.name) {
      return res.status(403).json({ success: false, message: 'Not authorized to reject this lease.' });
    }
    lease.status = 'rejected';
    await lease.save();
    res.json({ success: true, lease });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// PUT update lease (tenant/landlord can edit)
router.put('/:id', protect, async (req, res) => {
  try {
    const lease = await Lease.findById(req.params.id);
    if (!lease) return res.status(404).json({ success: false, message: 'Lease not found.' });
    
    // Check authorization: tenant or landlord who owns this lease
    const isTenant = req.user.role === 'tenant' && lease.tenantId.toString() === req.user._id.toString();
    const isLandlord = req.user.role === 'landlord' && (
      (lease.landlordId && lease.landlordId.toString() === req.user._id.toString()) ||
      (!lease.landlordId && lease.landlordName && lease.landlordName.toLowerCase() === (req.user.name || '').toLowerCase())
    );
    
    if (!isTenant && !isLandlord && !req.user?.isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this lease.' });
    }

    // Prevent modification of active lease until it expires unless the end date is extended
    const now = new Date();
    const currentEnd = lease.endDate ? new Date(lease.endDate) : null;
    const requestedEnd = req.body.endDate ? new Date(req.body.endDate) : null;
    const isActive = lease.status === 'active' && currentEnd;
    if (isActive && currentEnd >= now) {
      const isExtension = requestedEnd && requestedEnd > currentEnd;
      if (!isExtension) {
        return res.status(400).json({
          success: false,
          message: 'Active lease cannot be modified until it expires. To update rent or terms, extend the lease end date first.'
        });
      }
    }
    
    // Allowed fields to update
    const { rent, startDate, endDate, duration, terms } = req.body;
    
    if (rent !== undefined && rent !== null) lease.rent = Number(rent);
    if (startDate) lease.startDate = startDate;
    if (endDate) lease.endDate = endDate;
    if (duration) lease.duration = duration;
    if (terms) lease.terms = terms;
    
    lease.updatedAt = new Date();
    await lease.save();
    
    res.json({ success: true, message: 'Lease updated successfully.', lease });
  } catch (e) { 
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error.' }); 
  }
});

// DELETE (admin)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Lease.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted.' });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
>>>>>>> 17a4da6032e965253aaaaa7e291f867a3df0f14b
});

module.exports = leaseRoutes;
