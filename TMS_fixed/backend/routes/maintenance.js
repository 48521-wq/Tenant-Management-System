// ═══════════════════════════════════════════════════════════════
//  Maintenance Routes  —  /api/maintenance
//  Tenants submit maintenance requests; admin updates status
// ═══════════════════════════════════════════════════════════════

const express     = require('express');
const Maintenance = require('../models/Maintenance');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// ── Helper: build query filter based on user role ────────────────
// Admin    → all requests (with optional status filter from query)
// Tenant   → only their own requests
// Landlord → requests linked to their properties
function buildMaintenanceFilter(user, query) {
  const filter = {};

  if (user.isAdmin) {
    if (query.status) filter.status = query.status;
  } else if (user.role === 'tenant') {
    filter.tenantId = user._id;
  } else if (user.role === 'landlord') {
    filter.landlordId = user._id;
  }

  return filter;
}

// ── GET /api/maintenance ─────────────────────────────────────────
// Retrieve maintenance requests scoped to the logged-in user's role
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
// Submit a new maintenance request (tenants only)
router.post('/', protect, async (req, res) => {
  try {
    // Admin should not submit maintenance requests
    if (req.user?.isAdmin)
      return res.status(403).json({ success: false, message: 'Admin cannot submit maintenance.' });

    const { type, priority, description, propertyTitle } = req.body;

    // Description is the minimum required field
    if (!description)
      return res.status(400).json({ success: false, message: 'Description is required.' });

    const request = await Maintenance.create({
      tenantId:      req.user._id,
      tenantName:    req.user.name,
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
// Update request status and optionally add an admin note (admin only)
router.put('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status, adminNote } = req.body;

    // Build update — mark resolvedAt timestamp when marking resolved
    const update = { status };
    if (adminNote)             update.adminNote  = adminNote;
    if (status === 'resolved') update.resolvedAt = new Date();

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
// Permanently remove a maintenance request (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Maintenance.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted.' });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
