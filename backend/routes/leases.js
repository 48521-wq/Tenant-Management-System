// ─── leases Routes ─────────────────────────────────────────────────────────────
const express = require('express');
const mongoose = require('mongoose');
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
      const Property = require('../models/Property');
      const props = await Property.find({ landlordId: req.user._id }).select('_id title');
      const propIds = props.map(p => p._id);
      const propTitles = props.map(p => p.title).filter(Boolean);
      const escapedName = (req.user.name || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const nameRegex = new RegExp(`^${escapedName}$`, 'i');
      const titleRegexes = propTitles.map(t => new RegExp(`^${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));
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

// POST create lease (landlord creates, or tenant signs)
router.post('/', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin) return res.status(403).json({ success: false, message: 'Admin cannot sign leases.' });

    // Check if landlord already has an active/pending lease for this property
    if (req.user.role === 'landlord' && req.body.propertyId && mongoose.Types.ObjectId.isValid(req.body.propertyId)) {
      const existing = await Lease.findOne({
        propertyId: req.body.propertyId,
        status: { $in: ['pending', 'active'] }
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Is property ke liye pehle se ek active/pending agreement exist karta hai.'
        });
      }
    }

    if (req.user.role === 'tenant') {
      // Remove old pending leases for this tenant before creating new one
      await Lease.deleteMany({ tenantId: req.user._id, status: { $in: ['pending'] } });
    }

    const {
      // landlord details
      landlordCnic, landlordAddr, landlordPhone, landlordEmail, landlordSignature,
      // tenant details
      tenantName, tenantEmail, tenantCnic, tenantAddr, tenantPhone, tenantOcc, tenantSignature,
      // property
      propertyTitle, propertyAddress, propertyType, propertyArea, propertyRooms, propertyPlot,
      // financial
      rent, deposit, advance, startDate, endDate, duration, dueDay, annualIncrease, city, specialConditions,
      // legacy
      terms,
      landlordName, landlordId, propertyId
    } = req.body;

    const leaseData = {
      tenantId:       req.user.role === 'tenant' ? req.user._id : (mongoose.Types.ObjectId.isValid(req.body.tenantId||'') ? req.body.tenantId : req.user._id),
      tenantName:     req.user.role === 'tenant' ? req.user.name : (tenantName || ''),
      tenantEmail:    req.user.role === 'tenant' ? req.user.email : (tenantEmail || ''),
      tenantCnic:     tenantCnic || '',
      tenantAddr:     tenantAddr || '',
      tenantPhone:    tenantPhone || '',
      tenantOcc:      tenantOcc || '',
      tenantSignature:tenantSignature || '',
      landlordName:   req.user.role === 'landlord' ? req.user.name : (landlordName || ''),
      landlordCnic:   landlordCnic || '',
      landlordAddr:   landlordAddr || '',
      landlordPhone:  landlordPhone || '',
      landlordEmail:  landlordEmail || '',
      landlordSignature: landlordSignature || '',
      propertyTitle:  propertyTitle || '',
      propertyAddress:propertyAddress || '',
      propertyType:   propertyType || '',
      propertyArea:   propertyArea || '',
      propertyRooms:  propertyRooms || '',
      propertyPlot:   propertyPlot || '',
      rent:           Number(rent) || 0,
      deposit:        deposit || '',
      advance:        advance || '',
      startDate:      startDate || '',
      endDate:        endDate || '',
      duration:       duration || '11 months',
      dueDay:         dueDay || '1st of month',
      annualIncrease: annualIncrease || '',
      city:           city || '',
      specialConditions: specialConditions || '',
      terms:          terms || '',
      status:         'pending',
      isLocked:       req.user.role === 'landlord', // landlord-created leases are immediately locked
      signedAt:       new Date(),
    };

    if (landlordId && mongoose.Types.ObjectId.isValid(landlordId)) leaseData.landlordId = landlordId;
    else if (req.user.role === 'landlord') leaseData.landlordId = req.user._id;

    if (propertyId && mongoose.Types.ObjectId.isValid(propertyId)) leaseData.propertyId = propertyId;

    const lease = await Lease.create(leaseData);
    res.status(201).json({ success: true, lease });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PUT accept lease (landlord)
router.put('/:id/accept', protect, async (req, res) => {
  try {
    const lease = await Lease.findById(req.params.id);
    if (!lease) return res.status(404).json({ success: false, message: 'Lease not found.' });
    if (req.user.role !== 'landlord') return res.status(403).json({ success: false, message: 'Not authorized.' });

    lease.status = 'active';
    lease.isLocked = true;
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
    lease.status = 'rejected';
    await lease.save();
    res.json({ success: true, lease });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// PUT update lease — blocked if isLocked
router.put('/:id', protect, async (req, res) => {
  try {
    const lease = await Lease.findById(req.params.id);
    if (!lease) return res.status(404).json({ success: false, message: 'Lease not found.' });

    // Check authorization
    const isTenant = req.user.role === 'tenant' && lease.tenantId.toString() === req.user._id.toString();
    const isLandlord = req.user.role === 'landlord' && (
      (lease.landlordId && lease.landlordId.toString() === req.user._id.toString()) ||
      (!lease.landlordId && lease.landlordName && lease.landlordName.toLowerCase() === (req.user.name || '').toLowerCase())
    );
    if (!isTenant && !isLandlord && !req.user?.isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this lease.' });
    }

    // LOCKED = no edits allowed
    if (lease.isLocked && !req.user?.isAdmin) {
      return res.status(400).json({ success: false, message: 'Yeh agreement lock ho chuka hai. Isme tabdili nahi ki ja sakti.' });
    }

    const { rent, startDate, endDate, duration, terms } = req.body;
    if (rent !== undefined) lease.rent = Number(rent);
    if (startDate) lease.startDate = startDate;
    if (endDate) lease.endDate = endDate;
    if (duration) lease.duration = duration;
    if (terms) lease.terms = terms;
    lease.updatedAt = new Date();
    await lease.save();
    res.json({ success: true, message: 'Lease updated.', lease });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// DELETE (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Lease.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted.' });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = router;
