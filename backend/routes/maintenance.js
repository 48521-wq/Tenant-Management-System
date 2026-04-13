// ═══════════════════════════════════════════════════════════════
//  Maintenance Routes  —  /api/maintenance
//  Tenants submit repair and maintenance requests; admin reviews
//  and updates their status throughout the resolution workflow.
//
//  Access is scoped by role:
//    Tenant   → can submit new requests and view their own
//    Landlord → can view requests for their properties
//    Admin    → can view all requests, update status, and delete
//
//  Status lifecycle:  pending → in_progress → resolved / cancelled
//
//  Base path: /api/maintenance
// ═══════════════════════════════════════════════════════════════

const express     = require('express');
const Maintenance = require('../models/Maintenance');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// ── Helper: build role-scoped MongoDB query filter ───────────────
//
//  Admin    → all requests; can optionally filter by ?status
//  Tenant   → only their own requests (tenantId match)
//  Landlord → requests linked to their properties (landlordId match)
//
// @param {Object} user  - req.user populated by protect middleware
// @param {Object} query - req.query from the incoming request
// @returns {Object} Mongoose query filter object
function buildMaintenanceFilter(user, query) {
  const filter = {};

  if (user.isAdmin) {
    // Admin can narrow results by status, e.g. ?status=pending
    if (query.status) filter.status = query.status;
  } else if (user.role === 'tenant') {
    // Tenant sees only requests they personally submitted
    filter.tenantId = user._id;
  } else if (user.role === 'landlord') {
    // Landlord sees requests filed for their properties
    filter.landlordId = user._id;
  }

  return filter;
}

// ── GET /api/maintenance ─────────────────────────────────────────
// Retrieve maintenance requests scoped to the logged-in user's role.
// Sorted newest first — most urgent pending requests appear at top.
router.get('/', protect, async (req, res) => {
  try {
    const filter   = buildMaintenanceFilter(req.user, req.query);
    const requests = await Maintenance.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, count: requests.length, requests });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── POST /api/maintenance ────────────────────────────────────────
// Submit a new maintenance request (tenants only).
//
// The tenant's identity is taken from the verified JWT so tenantId
// and tenantName cannot be spoofed by the client. Description is
// the only required field; type and priority use schema defaults.
router.post('/', protect, async (req, res) => {
  try {
    // Admin accounts cannot submit maintenance requests
    if (req.user?.isAdmin)
      return res.status(403).json({ success: false, message: 'Admin cannot submit maintenance.' });

    const { type, priority, description, propertyTitle } = req.body;

    // Description is the only required field — all others have schema defaults
    if (!description)
      return res.status(400).json({ success: false, message: 'Description is required.' });

    const request = await Maintenance.create({
      tenantId:      req.user._id,   // from JWT — cannot be spoofed
      tenantName:    req.user.name,  // cached for display without extra DB join
      type,
      priority,
      description,
      propertyTitle: propertyTitle || '',
    });

    res.status(201).json({ success: true, request });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── PUT /api/maintenance/:id/status ─────────────────────────────
// Update a request's status and optionally add an admin note (admin only).
//
// When status is set to 'resolved', a resolvedAt timestamp is
// automatically stamped. Admin can leave a note explaining what
// repair was carried out or why the request was cancelled.
router.put('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status, adminNote } = req.body;

    // Only include fields that were provided in the update payload
    const update = { status };
    if (adminNote)             update.adminNote  = adminNote;
    if (status === 'resolved') update.resolvedAt = new Date();

    // { new: true } returns the document state after the update
    const request = await Maintenance.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );

    if (!request)
      return res.status(404).json({ success: false, message: 'Not found.' });

    res.json({ success: true, request });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── DELETE /api/maintenance/:id ──────────────────────────────────
// Permanently remove a maintenance request (admin only).
// Hard delete — cannot be recovered once removed.
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Maintenance.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted.' });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
