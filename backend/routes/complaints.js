const express   = require('express');
const Complaint = require('../models/Complaint');
const { protect, adminOnly } = require('../middleware/auth');

// Router instance for complaint endpoints
const complaintRouter = express.Router();

// GET complaints — tenant sees own, admin sees all, landlord sees their property complaints
complaintRouter.get('/', protect, async (req, res) => {
  try {
    let queryFilter = {};
    if (req.user?.isAdmin) {
      if (req.query.status) queryFilter.status = req.query.status;
    } else if (req.user.role === 'tenant') {
      queryFilter.tenantId = req.user._id;
    } else if (req.user.role === 'landlord') {
      queryFilter.landlordId = req.user._id;
    }
    const allComplaints = await Complaint.find(queryFilter).sort({ createdAt: -1 });
    res.json({ success: true, count: allComplaints.length, complaints: allComplaints });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// POST create complaint (tenant)
complaintRouter.post('/', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin) return res.status(403).json({ success: false, message: 'Admin cannot file complaints.' });
    const { subject, description, category, priority } = req.body;
    if (!subject) return res.status(400).json({ success: false, message: 'Subject is required.' });
    const newComplaint = await Complaint.create({
      tenantId:   req.user._id,
      tenantName: req.user.name,
      subject, description, category, priority,
    });
    res.status(201).json({ success: true, complaint: newComplaint });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// PUT update status (admin only)
complaintRouter.put('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const updateFields = { status };
    if (adminNote) updateFields.adminNote = adminNote;
    if (status === 'resolved') updateFields.resolvedAt = new Date();
    const updatedComplaint = await Complaint.findByIdAndUpdate(req.params.id, updateFields, { new: true });
    if (!updatedComplaint) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, complaint: updatedComplaint });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// DELETE complaint (admin)
complaintRouter.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Complaint.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Complaint deleted.' });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = complaintRouter;
