// ═══════════════════════════════════════════════════════════════
//  Complaint Routes  —  /api/complaints
//  Tenants file complaints; admin reviews, updates, and resolves them.
//
//  Access is scoped by role:
//    Tenant   → can file new complaints and view their own records
//    Landlord → can view complaints filed about their properties
//    Admin    → can view all complaints, update status, add notes,
//               and delete any record
//
//  Status lifecycle:  open → in_progress → resolved / closed
//
//  Base path: /api/complaints
// ═══════════════════════════════════════════════════════════════

const express   = require('express');
const Complaint = require('../models/Complaint');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// ── Helper: build role-scoped MongoDB query filter ───────────────
//
//  Admin    → sees all complaints; can optionally filter by ?status
//  Tenant   → sees only complaints they personally filed (tenantId)
//  Landlord → sees complaints linked to their properties (landlordId)
//
// @param {Object} user  - req.user populated by protect middleware
// @param {Object} query - req.query from the incoming request
// @returns {Object} Mongoose query filter object
function buildComplaintFilter(user, query) {
  const filter = {};

  if (user.isAdmin) {
    // Admin can optionally narrow results by complaint status
    // e.g. GET /api/complaints?status=open
    if (query.status) filter.status = query.status;
  } else if (user.role === 'tenant') {
    // Tenant sees only their own filings
    filter.tenantId = user._id;
  } else if (user.role === 'landlord') {
    // Landlord sees complaints linked to their properties
    filter.landlordId = user._id;
  }

  return filter;
}

// ── GET /api/complaints ──────────────────────────────────────────
// Retrieve complaints scoped to the requesting user's role.
// Results are sorted newest first so the most recent complaint
// appears at the top of the dashboard table.
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
// File a new complaint (tenants only).
//
// The tenant's identity is taken from the verified JWT — not from
// the request body — so tenantId and tenantName cannot be spoofed.
// Subject is the only required field; description, category, and
// priority are optional and default to schema defaults if omitted.
router.post('/', protect, async (req, res) => {
  try {
    // Admin accounts cannot file complaints — this is a tenant action
    if (req.user?.isAdmin)
      return res.status(403).json({ success: false, message: 'Admin cannot file complaints.' });

    const { subject, description, category, priority } = req.body;

    // Subject is the minimum required field — all others are optional
    if (!subject)
      return res.status(400).json({ success: false, message: 'Subject is required.' });

    const complaint = await Complaint.create({
      tenantId:   req.user._id,   // from JWT — cannot be spoofed
      tenantName: req.user.name,  // cached for display without DB join
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
// Update a complaint's status and optionally add an admin note.
//
// When status is set to 'resolved', a resolvedAt timestamp is
// automatically stamped so the tenant can see when it was handled.
// Admin can also leave a note explaining the resolution.
router.put('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status, adminNote } = req.body;

    // Build the update — only include fields that were provided
    const update = { status };
    if (adminNote)             update.adminNote  = adminNote;
    if (status === 'resolved') update.resolvedAt = new Date();

    // { new: true } returns the document after the update is applied
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
// Permanently remove a complaint record from the database (admin only).
// This is a hard delete — the record cannot be recovered.
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Complaint.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Complaint deleted.' });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
