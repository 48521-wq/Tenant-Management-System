// ============================================================
// TMS — Maintenance Routes
// ============================================================
'use strict';

const express     = require('express');
const Maintenance = require('../models/Maintenance');
const { protect, adminOnly } = require('../middleware/auth');

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
});

module.exports = maintRoutes;
