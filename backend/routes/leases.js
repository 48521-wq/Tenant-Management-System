/**
 * @file leases.js
 * @route /api/leases
 * @description Lease agreement management for tenants, landlords, and admin.
 *
 * Access is scoped by role:
 *   Tenant   → sign new leases; view their own agreements
 *   Landlord → view leases for their properties
 *   Admin    → view all leases; delete any record
 *
 * A new lease is stamped 'active' and signedAt at creation time.
 * Property and landlord details are cached on the lease so it remains
 * readable even if those records are later removed from the database.
 */

const express = require('express');
const Lease   = require('../models/Lease');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// HTTP status codes
const HTTP_CREATED      = 201;
const HTTP_FORBIDDEN    = 403;
const HTTP_SERVER_ERROR = 500;

// New leases are always created in active status
const DEFAULT_LEASE_STATUS = 'active';

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

/**
 * Builds a role-scoped MongoDB query filter for leases.
 *
 *   Admin    → all leases (no filter applied)
 *   Tenant   → only leases they signed (tenantId)
 *   Landlord → leases linked to their properties (landlordId)
 *
 * @param {Object} currentUser - req.user populated by protect middleware
 * @returns {Object} Mongoose-compatible filter object
 */
function buildLeaseFilter(currentUser) {
  const filter = {};

  if (currentUser.isAdmin) {
    // Admin sees everything — intentionally empty filter
  } else if (currentUser.role === 'tenant') {
    filter.tenantId = currentUser._id;
  } else if (currentUser.role === 'landlord') {
    filter.landlordId = currentUser._id;
  }

  return filter;
}

// ─────────────────────────────────────────────────────────────────
// GET /api/leases
// ─────────────────────────────────────────────────────────────────
/**
 * Retrieves lease agreements scoped to the requesting user's role.
 * Sorted newest first (most recently signed agreement at the top).
 *
 * @middleware protect - Valid JWT required
 * @returns {200} { success, count, leases }
 * @returns {500} Unexpected server error
 */
router.get('/', protect, async (req, res) => {
  try {
    const filter    = buildLeaseFilter(req.user);
    const allLeases = await Lease.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, count: allLeases.length, leases: allLeases });

  } catch (err) {
    res.status(HTTP_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/leases
// ─────────────────────────────────────────────────────────────────
/**
 * Creates and digitally signs a new lease agreement (tenants only).
 * Tenant identity (tenantId, tenantName, tenantEmail) is taken from the
 * verified JWT — it cannot be substituted by the client's request body.
 * The lease is created with status 'active' and signedAt set to now.
 *
 * @middleware protect - Valid JWT required
 * @returns {201} { success, lease }
 * @returns {403} Admin cannot sign leases
 * @returns {500} Unexpected server error
 */
router.post('/', protect, async (req, res) => {
  try {
    // Admin accounts should not sign leases — this is a tenant action
    if (req.user?.isAdmin)
      return res.status(HTTP_FORBIDDEN).json({ success: false, message: 'Admin cannot sign leases.' });

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

    const newLease = await Lease.create({
      tenantId:        req.user._id,          // from JWT — cannot be spoofed
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
      status:   DEFAULT_LEASE_STATUS,
      signedAt: new Date(), // timestamp of when the tenant signed
    });

    res.status(HTTP_CREATED).json({ success: true, lease: newLease });

  } catch (err) {
    res.status(HTTP_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// DELETE /api/leases/:id
// ─────────────────────────────────────────────────────────────────
/**
 * Permanently removes a lease record from the database (admin only).
 * Hard delete — the agreement cannot be recovered once removed.
 *
 * @middleware protect   - Valid JWT required
 * @middleware adminOnly - Admin access required
 * @returns {200} { success, message }
 * @returns {500} Unexpected server error
 */
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Lease.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted.' });

  } catch (err) {
    res.status(HTTP_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
