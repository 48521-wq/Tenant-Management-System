const express = require('express');
const mongoose = require('mongoose');
const Lease   = require('../models/Lease');
const { protect, adminOnly } = require('../middleware/auth');
const router = express.Router();

// GET leases — landlord sees own, tenant sees own (including pending_tenant_signature)
router.get('/', protect, async (req, res) => {
  try {
    let filter = {};
    if (req.user?.isAdmin) {
      // all leases
    } else if (req.user.role === 'tenant') {
      // Tenant sees leases where tenantId matches OR tenantEmail matches (fallback)
      filter = {
        $or: [
          { tenantId: req.user._id },
          { tenantEmail: req.user.email },
        ]
      };
    } else if (req.user.role === 'landlord') {
      const Property = require('../models/Property');
      const props = await Property.find({ landlordId: req.user._id }).select('_id');
      const propIds = props.map(p => p._id);
      filter = {
        $or: [
          { landlordId: req.user._id },
          { propertyId: { $in: propIds } },
        ]
      };
    }
    const leases = await Lease.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: leases.length, leases });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// POST — landlord creates lease (status: pending_tenant_signature)
router.post('/', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin) return res.status(403).json({ success: false, message: 'Admin cannot create leases.' });
    if (req.user.role !== 'landlord') return res.status(403).json({ success: false, message: 'Only landlord can create a lease.' });

    const { propertyId } = req.body;

    // If existing lease for this property that is pending_tenant_signature or pending, UPDATE it
    if (propertyId && mongoose.Types.ObjectId.isValid(propertyId)) {
      const existing = await Lease.findOne({
        propertyId,
        status: { $in: ['pending', 'pending_tenant_signature'] }
      });
      if (existing) {
        const fields = [
          'landlordCnic','landlordAddr','landlordPhone','landlordEmail','landlordSignature','landlordName',
          'tenantName','tenantEmail','tenantCnic','tenantAddr','tenantPhone','tenantOcc',
          'propertyTitle','propertyAddress','propertyType','propertyArea','propertyRooms','propertyPlot',
          'rent','deposit','advance','startDate','endDate','duration','dueDay','annualIncrease',
          'city','specialConditions','terms','fullAgreementHtml','tenantId','landlordId'
        ];
        fields.forEach(f => { if (req.body[f] !== undefined) existing[f] = req.body[f]; });
        existing.landlordId = req.user._id;
        existing.landlordName = req.user.name;
        existing.landlordSignature = req.body.landlordSignature || existing.landlordSignature;
        existing.status = 'pending_tenant_signature';
        existing.isLocked = false; // not fully locked until tenant signs
        existing.signedAt = new Date();
        await existing.save();
        return res.json({ success: true, lease: existing });
      }
    }

    const leaseData = {
      landlordId:     req.user._id,
      landlordName:   req.body.landlordName || req.user.name,
      landlordCnic:   req.body.landlordCnic || '',
      landlordAddr:   req.body.landlordAddr || '',
      landlordPhone:  req.body.landlordPhone || '',
      landlordEmail:  req.body.landlordEmail || req.user.email || '',
      landlordSignature: req.body.landlordSignature || '',
      tenantName:     req.body.tenantName || '',
      tenantEmail:    req.body.tenantEmail || '',
      tenantCnic:     req.body.tenantCnic || '',
      tenantAddr:     req.body.tenantAddr || '',
      tenantPhone:    req.body.tenantPhone || '',
      tenantOcc:      req.body.tenantOcc || '',
      tenantSignature:'',
      propertyTitle:  req.body.propertyTitle || '',
      propertyAddress:req.body.propertyAddress || '',
      propertyType:   req.body.propertyType || '',
      propertyArea:   req.body.propertyArea || '',
      propertyRooms:  req.body.propertyRooms || '',
      propertyPlot:   req.body.propertyPlot || '',
      rent:           Number(req.body.rent) || 0,
      deposit:        req.body.deposit || '',
      advance:        req.body.advance || '',
      startDate:      req.body.startDate || '',
      endDate:        req.body.endDate || '',
      duration:       req.body.duration || '11 months',
      dueDay:         req.body.dueDay || '1st of month',
      annualIncrease: req.body.annualIncrease || '',
      city:           req.body.city || '',
      specialConditions: req.body.specialConditions || '',
      terms:          req.body.terms || '',
      fullAgreementHtml: req.body.fullAgreementHtml || '',
      status:         'pending_tenant_signature',
      isLocked:       false,
      signedAt:       new Date(),
    };

    if (mongoose.Types.ObjectId.isValid(req.body.tenantId||''))  leaseData.tenantId  = req.body.tenantId;
    if (mongoose.Types.ObjectId.isValid(propertyId||''))         leaseData.propertyId = propertyId;

    const lease = await Lease.create(leaseData);
    res.status(201).json({ success: true, lease });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PUT /:id/tenant-sign — tenant adds signature, lease becomes active+locked
router.put('/:id/tenant-sign', protect, async (req, res) => {
  try {
    const lease = await Lease.findById(req.params.id);
    if (!lease) return res.status(404).json({ success: false, message: 'Lease not found.' });
    if (req.user.role !== 'tenant') return res.status(403).json({ success: false, message: 'Only tenant can sign.' });
    if (lease.status === 'active' && lease.isLocked) {
      return res.status(400).json({ success: false, message: 'Agreement already locked.' });
    }

    lease.tenantSignature = req.body.tenantSignature || '';
    lease.tenantCnic      = req.body.tenantCnic || lease.tenantCnic;
    lease.tenantAddr      = req.body.tenantAddr || lease.tenantAddr;
    lease.tenantPhone     = req.body.tenantPhone || lease.tenantPhone;
    lease.tenantOcc       = req.body.tenantOcc || lease.tenantOcc;
    // Rebuild HTML with tenant signature if provided
    if (req.body.fullAgreementHtml) lease.fullAgreementHtml = req.body.fullAgreementHtml;
    lease.status    = 'active';
    lease.isLocked  = true;
    lease.acceptedAt = new Date();
    await lease.save();
    res.json({ success: true, message: 'Agreement signed and locked!', lease });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PUT /:id — update (only if not locked; admin bypass)
router.put('/:id', protect, async (req, res) => {
  try {
    const lease = await Lease.findById(req.params.id);
    if (!lease) return res.status(404).json({ success: false, message: 'Lease not found.' });

    const isLandlord = req.user.role === 'landlord' &&
      lease.landlordId && lease.landlordId.toString() === req.user._id.toString();
    const isTenant = req.user.role === 'tenant' && (
      (lease.tenantId && lease.tenantId.toString() === req.user._id.toString()) ||
      (lease.tenantEmail && lease.tenantEmail === req.user.email)
    );

    if (!isLandlord && !isTenant && !req.user?.isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    // If locked & active → no changes allowed (lease period not over)
    if (lease.isLocked && lease.status === 'active' && !req.user?.isAdmin) {
      // Check if lease period is over
      const endDate = lease.endDate ? new Date(lease.endDate) : null;
      const now = new Date();
      if (!endDate || now <= endDate) {
        return res.status(400).json({ success: false, message: 'Lease is active and locked. Changes not allowed until lease expires.' });
      }
    }

    const allowed = ['rent','startDate','endDate','duration','terms','dueDay','specialConditions','annualIncrease'];
    allowed.forEach(f => { if (req.body[f] !== undefined) lease[f] = req.body[f]; });
    await lease.save();
    res.json({ success: true, lease });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// DELETE (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Lease.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted.' });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = router;
