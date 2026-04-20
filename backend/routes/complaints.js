// ============================================================
// TMS Complaint Routes
// ============================================================
const express   = require('express');
const Complaint = require('../models/Complaint');
const { protect, adminOnly } = require('../middleware/auth');

const cRouter = express.Router();

// ─── GET / — list complaints based on role ───────────────────
cRouter.get('/', protect, async (req, res) => {
  try {
    const roleFilter = {};
    if (req.user?.isAdmin) {
      if (req.query.status) roleFilter.status = req.query.status;
    } else if (req.user.role === 'tenant') {
      roleFilter.tenantId = req.user._id;
    } else if (req.user.role === 'landlord') {
      roleFilter.landlordId = req.user._id;
    }
    const complaintList = await Complaint.find(roleFilter).sort({ createdAt: -1 });
    res.json({ success: true, count: complaintList.length, complaints: complaintList });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── POST / — tenant files a new complaint ───────────────────
cRouter.post('/', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin)
      return res.status(403).json({ success: false, message: 'Admin cannot file complaints.' });
    const { subject, description, category, priority } = req.body;
    if (!subject)
      return res.status(400).json({ success: false, message: 'Subject is required.' });
    const createdComplaint = await Complaint.create({
      tenantId:   req.user._id,
      tenantName: req.user.name,
      subject, description, category, priority,
    });
    res.status(201).json({ success: true, complaint: createdComplaint });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── PUT /:id/status — admin updates complaint status ────────
cRouter.put('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const statusUpdate = { status };
    if (adminNote) statusUpdate.adminNote = adminNote;
    if (status === 'resolved') statusUpdate.resolvedAt = new Date();
    const resolvedItem = await Complaint.findByIdAndUpdate(req.params.id, statusUpdate, { new: true });
    if (!resolvedItem)
      return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, complaint: resolvedItem });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── DELETE /:id — admin removes a complaint ─────────────────
cRouter.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Complaint.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Complaint deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = cRouter;
