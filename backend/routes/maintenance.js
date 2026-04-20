// ============================================================
// TMS Maintenance Routes
// ============================================================
const express     = require('express');
const Maintenance = require('../models/Maintenance');
const { protect, adminOnly } = require('../middleware/auth');

const mRouter = express.Router();

// ─── GET / — list maintenance requests by role ───────────────
mRouter.get('/', protect, async (req, res) => {
  try {
    const roleFilter = {};
    if (req.user?.isAdmin) {
      if (req.query.status) roleFilter.status = req.query.status;
    } else if (req.user.role === 'tenant') {
      roleFilter.tenantId = req.user._id;
    } else if (req.user.role === 'landlord') {
      roleFilter.landlordId = req.user._id;
    }
    const requestList = await Maintenance.find(roleFilter).sort({ createdAt: -1 });
    res.json({ success: true, count: requestList.length, requests: requestList });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── POST / — tenant submits a maintenance request ───────────
mRouter.post('/', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin)
      return res.status(403).json({ success: false, message: 'Admin cannot submit maintenance.' });
    const { type, priority, description, propertyTitle } = req.body;
    if (!description)
      return res.status(400).json({ success: false, message: 'Description is required.' });
    const savedRequest = await Maintenance.create({
      tenantId:     req.user._id,
      tenantName:   req.user.name,
      type, priority, description,
      propertyTitle: propertyTitle || '',
    });
    res.status(201).json({ success: true, request: savedRequest });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── PUT /:id/status — admin updates request status ──────────
mRouter.put('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const statusPatch = { status };
    if (adminNote) statusPatch.adminNote = adminNote;
    if (status === 'resolved') statusPatch.resolvedAt = new Date();
    const patchedRequest = await Maintenance.findByIdAndUpdate(req.params.id, statusPatch, { new: true });
    if (!patchedRequest)
      return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, request: patchedRequest });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── DELETE /:id — admin removes maintenance request ─────────
mRouter.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Maintenance.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = mRouter;
