const express   = require('express');
const Complaint = require('../models/Complaint');
const { protect, adminOnly } = require('../middleware/auth');
const router = express.Router();

// GET complaints — tenant sees own, admin sees all, landlord sees their property complaints
router.get('/', protect, async (req, res) => {
  try {
    let filter = {};
    if (req.user?.isAdmin) {
      if (req.query.status) filter.status = req.query.status;
    } else if (req.user.role === 'tenant') {
      filter.tenantId = req.user._id;
    } else if (req.user.role === 'landlord') {
      filter.landlordId = req.user._id;
    }
    const complaints = await Complaint.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: complaints.length, complaints });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// POST create complaint (tenant)
router.post('/', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin) return res.status(403).json({ success: false, message: 'Admin cannot file complaints.' });
    const { subject, description, category, priority } = req.body;
    if (!subject) return res.status(400).json({ success: false, message: 'Subject is required.' });
    const complaint = await Complaint.create({
      tenantId:   req.user._id,
      tenantName: req.user.name,
      subject, description, category, priority,
    });
    res.status(201).json({ success: true, complaint });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// PUT update status (admin only)
router.put('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const update = { status };
    if (adminNote) update.adminNote = adminNote;
    if (status === 'resolved') update.resolvedAt = new Date();
    const complaint = await Complaint.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!complaint) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, complaint });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// DELETE complaint (admin)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Complaint.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Complaint deleted.' });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = router;
