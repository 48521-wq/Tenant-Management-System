// ============================================================
// TMS — Complaint Routes
// ============================================================
'use strict';

const express   = require('express');
const Complaint = require('../models/Complaint');
const { protect, adminOnly } = require('../middleware/auth');

const complaintRoutes = express.Router();

// ─── GET / — complaints by role ──────────────────────────────
complaintRoutes.get('/', protect, async (req, res) => {
  try {
    const cFilter = {};
    if (req.user?.isAdmin) {
      if (req.query.status) cFilter.status = req.query.status;
    } else if (req.user.role === 'tenant') {
      cFilter.tenantId = req.user._id;
    } else if (req.user.role === 'landlord') {
      cFilter.landlordId = req.user._id;
    }
    const cList = await Complaint.find(cFilter).sort({ createdAt: -1 });
    return res.json({ success: true, count: cList.length, complaints: cList });
  } catch (cListErr) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── POST / — tenant files complaint ─────────────────────────
complaintRoutes.post('/', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin)
      return res.status(403).json({ success: false, message: 'Admin cannot file complaints.' });
    const { subject, description, category, priority } = req.body;
    if (!subject)
      return res.status(400).json({ success: false, message: 'Subject is required.' });
    const newC = await Complaint.create({
      tenantId:   req.user._id,
      tenantName: req.user.name,
      subject, description, category, priority,
    });
    return res.status(201).json({ success: true, complaint: newC });
  } catch (cCreateErr) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── PUT /:id/status — admin updates status ──────────────────
complaintRoutes.put('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const cPatch = { status };
    if (adminNote) cPatch.adminNote = adminNote;
    if (status === 'resolved') cPatch.resolvedAt = new Date();
    const updatedC = await Complaint.findByIdAndUpdate(req.params.id, cPatch, { new: true });
    if (!updatedC)
      return res.status(404).json({ success: false, message: 'Not found.' });
    return res.json({ success: true, complaint: updatedC });
  } catch (cPatchErr) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── DELETE /:id — admin removes complaint ────────────────────
complaintRoutes.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Complaint.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Complaint deleted.' });
  } catch (cDelErr) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = complaintRoutes;
