// ═══════════════════════════════════════════════════════════════
//  Lease Routes  —  /api/leases
//  Tenants sign leases; landlords and admin can view them
// ═══════════════════════════════════════════════════════════════

const express = require('express');
const Lease   = require('../models/Lease');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// ── Helper: build query filter based on user role ────────────────
// Admin    → all leases (no filter)
// Tenant   → only their own leases
// Landlord → leases linked to their properties
function buildLeaseFilter(user) {
  const filter = {};

  if (user.isAdmin) {
    // Admin sees everything — no filter needed
  } else if (user.role === 'tenant') {
    filter.tenantId = user._id;
  } else if (user.role === 'landlord') {
    filter.landlordId = user._id;
  }

  return filter;
}

// ── GET /api/leases ──────────────────────────────────────────────
// Retrieve leases scoped to the requesting user's role
router.get('/', protect, async (req, res) => {
  try {
    const filter = buildLeaseFilter(req.user);
    const leases = await Lease.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, count: leases.length, leases });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── POST /api/leases ─────────────────────────────────────────────
// Create and sign a new lease agreement (tenants only)
router.post('/', protect, async (req, res) => {
  try {
    // Admin should not sign leases directly
    if (req.user?.isAdmin)
      return res.status(403).json({ success: false, message: 'Admin cannot sign leases.' });

    const {
      propertyTitle,
      propertyAddress,
      landlordName,
      rent,
      startDate,
      endDate,
      duration,
      terms,
    } = req.body;

    const lease = await Lease.create({
      tenantId:        req.user._id,
      tenantName:      req.user.name,
      tenantEmail:     req.user.email,
      landlordName:    landlordName    || '',
      propertyTitle:   propertyTitle   || '',
      propertyAddress: propertyAddress || '',
      rent:            rent            || 0,
      startDate,
      endDate,
      duration,
      terms,
      status:   'active',
      signedAt: new Date(),
    });

    res.status(201).json({ success: true, lease });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── DELETE /api/leases/:id ───────────────────────────────────────
// Permanently remove a lease record (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Lease.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted.' });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
