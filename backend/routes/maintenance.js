<<<<<<< HEAD
// ============================================================
// TMS — Maintenance Routes
// ============================================================
'use strict';

=======
>>>>>>> 17a4da6032e965253aaaaa7e291f867a3df0f14b
const express     = require('express');
const mongoose    = require('mongoose');
const Maintenance = require('../models/Maintenance');
const Property    = require('../models/Property');
const { protect, adminOnly } = require('../middleware/auth');
<<<<<<< HEAD

const maintRoutes = express.Router();

// ─── GET / — maintenance requests by role ────────────────────
maintRoutes.get('/', protect, async (req, res) => {
  try {
    const mFilter = {};
    if (req.user?.isAdmin) {
      if (req.query.status) mFilter.status = req.query.status;
    } else if (req.user.role === 'tenant') {
      mFilter.tenantId = req.user._id;
    } else if (req.user.role === 'landlord') {
      mFilter.landlordId = req.user._id;
    }
    const mList = await Maintenance.find(mFilter).sort({ createdAt: -1 });
    return res.json({ success: true, count: mList.length, requests: mList });
  } catch (mListErr) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── POST / — tenant submits maintenance request ─────────────
maintRoutes.post('/', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin)
      return res.status(403).json({ success: false, message: 'Admin cannot submit maintenance.' });
    const { type, priority, description, propertyTitle } = req.body;
    if (!description)
      return res.status(400).json({ success: false, message: 'Description is required.' });
    const newM = await Maintenance.create({
      tenantId:     req.user._id,
      tenantName:   req.user.name,
      type, priority, description,
      propertyTitle: propertyTitle || '',
    });
    return res.status(201).json({ success: true, request: newM });
  } catch (mCreateErr) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── PUT /:id/status — admin updates status ──────────────────
maintRoutes.put('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const mPatch = { status };
    if (adminNote) mPatch.adminNote = adminNote;
    if (status === 'resolved') mPatch.resolvedAt = new Date();
    const updatedM = await Maintenance.findByIdAndUpdate(req.params.id, mPatch, { new: true });
    if (!updatedM)
      return res.status(404).json({ success: false, message: 'Not found.' });
    return res.json({ success: true, request: updatedM });
  } catch (mPatchErr) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── DELETE /:id — admin removes request ─────────────────────
maintRoutes.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Maintenance.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Deleted.' });
  } catch (mDelErr) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
=======
const router = express.Router();

// GET maintenance requests
router.get('/', protect, async (req, res) => {
  try {
    let filter = {};
    if (req.user?.isAdmin) {
      if (req.query.status) filter.status = req.query.status;
    } else if (req.user.role === 'tenant') {
      filter.tenantId = req.user._id;
    } else if (req.user.role === 'landlord') {
      const props = await Property.find({ landlordId: req.user._id }).select('_id title');
      const propIds = props.map(p => p._id);
      const propTitles = props.map(p => p.title).filter(Boolean);
      const escapedName = (req.user.name || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
    const requests = await Maintenance.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: requests.length, requests });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// POST create request (tenant)
router.post('/', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin) return res.status(403).json({ success: false, message: 'Admin cannot submit maintenance.' });
    const { type, priority, description, propertyTitle, landlordId, landlordName, propertyId } = req.body;
    if (!description) return res.status(400).json({ success: false, message: 'Description is required.' });
    const requestData = {
      tenantId:    req.user._id,
      tenantName:  req.user.name,
      type,
      priority,
      description,
      propertyTitle: propertyTitle || '',
    };
    if (landlordId && mongoose.Types.ObjectId.isValid(landlordId)) requestData.landlordId = landlordId;
    if (landlordName) requestData.landlordName = landlordName;
    if (propertyId && mongoose.Types.ObjectId.isValid(propertyId)) requestData.propertyId = propertyId;
    const request = await Maintenance.create(requestData);
    res.status(201).json({ success: true, request });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PUT update status (admin only)
router.put('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const update = { status };
    if (adminNote) update.adminNote = adminNote;
    if (status === 'resolved') update.resolvedAt = new Date();
    const request = await Maintenance.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!request) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, request });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// PUT approve/in-progress maintenance (landlord)
router.put('/:id/approve', protect, async (req, res) => {
  try {
    if (req.user.role !== 'landlord') return res.status(403).json({ success: false, message: 'Not authorized.' });
    const request = await Maintenance.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });
    if (request.landlordId && request.landlordId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }
    if (!request.landlordId && request.landlordName !== req.user.name) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }
    request.status = 'in_progress';
    await request.save();
    res.json({ success: true, request });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// PUT mark done/resolved maintenance (landlord)
router.put('/:id/done', protect, async (req, res) => {
  try {
    if (req.user.role !== 'landlord') return res.status(403).json({ success: false, message: 'Not authorized.' });
    const request = await Maintenance.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });
    if (request.landlordId && request.landlordId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }
    if (!request.landlordId && request.landlordName !== req.user.name) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }
    request.status = 'resolved';
    request.resolvedAt = new Date();
    await request.save();
    res.json({ success: true, request });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// DELETE (admin)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Maintenance.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted.' });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
>>>>>>> 17a4da6032e965253aaaaa7e291f867a3df0f14b
});

module.exports = maintRoutes;
