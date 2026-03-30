// ═══════════════════════════════════════════════════════════════
//  Complaint Routes  —  /api/complaints
//  Tenants file complaints; admin reviews and resolves them
// ═══════════════════════════════════════════════════════════════

const express   = require('express');
const Complaint = require('../models/Complaint');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// ── Helper: build query filter based on logged-in user role ──────
// Admin  → all complaints (with optional status filter)
// Tenant → only their own complaints
// Landlord → complaints linked to their properties
function buildComplaintFilter(user, query) {
  const filter = {};

  if (user.isAdmin) {
    // Admin can optionally filter by complaint status
    if (query.status) filter.status = query.status;
  } else if (user.role === 'tenant') {
    filter.tenantId = user._id;
  } else if (user.role === 'landlord') {
    filter.landlordId = user._id;
  }

  return filter;
}

// ── GET /api/complaints ──────────────────────────────────────────
// Retrieve complaints scoped to the requesting user's role
router.get('/', protect, async (req, res) => {
  try {
    const filter     = buildComplaintFilter(req.user, req.query);
    const complaints = await Complaint.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, count: complaints.length, complaints });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── POST /api/complaints ─────────────────────────────────────────
// File a new complaint (tenants only)
router.post('/', protect, async (req, res) => {
  try {
    // Admin should not file complaints
    if (req.user?.isAdmin)
      return res.status(403).json({ success: false, message: 'Admin cannot file complaints.' });

    const { subject, description, category, priority } = req.body;

    // Subject is the minimum required field
    if (!subject)
      return res.status(400).json({ success: false, message: 'Subject is required.' });

    const complaint = await Complaint.create({
      tenantId:   req.user._id,
      tenantName: req.user.name,
      subject,
      description,
      category,
      priority,
    });

    res.status(201).json({ success: true, complaint });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── PUT /api/complaints/:id/status ───────────────────────────────
// Update complaint status and optionally add an admin note (admin only)
router.put('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status, adminNote } = req.body;

    // Build the update object
    const update = { status };
    if (adminNote)          update.adminNote  = adminNote;
    if (status === 'resolved') update.resolvedAt = new Date();

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );

    if (!complaint)
      return res.status(404).json({ success: false, message: 'Not found.' });

    res.json({ success: true, complaint });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── DELETE /api/complaints/:id ───────────────────────────────────
// Permanently remove a complaint record (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Complaint.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Complaint deleted.' });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
