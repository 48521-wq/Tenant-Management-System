// ─── complaints Routes ─────────────────────────────────────────────────────────────
const express   = require('express');
const mongoose  = require('mongoose');
const Complaint = require('../models/Complaint');
const Property  = require('../models/Property');
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
    if (req.user?.isAdmin && req.query.status) filter.status = req.query.status;
    const complaints = await Complaint.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: complaints.length, complaints });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// POST create complaint (tenant)
router.post('/', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin) return res.status(403).json({ success: false, message: 'Admin cannot file complaints.' });
    const { subject, description, category, priority, landlordId, landlordName, propertyId } = req.body;
    if (!subject) return res.status(400).json({ success: false, message: 'Subject is required.' });
    const complaintData = {
      tenantId:   req.user._id,
      tenantName: req.user.name,
      subject,
      description,
      category,
      priority,
    };
    if (landlordId && mongoose.Types.ObjectId.isValid(landlordId)) complaintData.landlordId = landlordId;
    if (landlordName) complaintData.landlordName = landlordName;
    if (propertyId && mongoose.Types.ObjectId.isValid(propertyId)) complaintData.propertyId = propertyId;
    const complaint = await Complaint.create(complaintData);
    res.status(201).json({ success: true, complaint });
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
    const complaint = await Complaint.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!complaint) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, complaint });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// PUT approve/in-progress complaint (landlord)
router.put('/:id/approve', protect, async (req, res) => {
  try {
    if (req.user.role !== 'landlord') return res.status(403).json({ success: false, message: 'Not authorized.' });
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found.' });
    // Check landlord ownership
    if (complaint.landlordId && complaint.landlordId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }
    if (!complaint.landlordId && complaint.landlordName !== req.user.name) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }
    complaint.status = 'in_progress';
    await complaint.save();
    res.json({ success: true, complaint });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// PUT resolve/close complaint (landlord)
router.put('/:id/resolve', protect, async (req, res) => {
  try {
    if (req.user.role !== 'landlord') return res.status(403).json({ success: false, message: 'Not authorized.' });
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found.' });
    if (complaint.landlordId && complaint.landlordId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }
    if (!complaint.landlordId && complaint.landlordName !== req.user.name) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }
    complaint.status = 'resolved';
    complaint.resolvedAt = new Date();
    await complaint.save();
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
