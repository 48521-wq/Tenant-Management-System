/**
 * @file leases.js
 * @route /api/leases
 * @description Lease agreement management for tenants, landlords, and admin.
 *
 * Access scoped by role:
 *   Tenant   → sign new leases; view own agreements
 *   Landlord → view leases for their properties
 *   Admin    → view all leases; delete any record
 */

const express    = require('express');
const LeaseModel = require('../models/Lease');
const { protect, adminOnly } = require('../middleware/auth');

const leasesRouter = express.Router();

const HTTP_CREATED      = 201;
const HTTP_FORBIDDEN    = 403;
const HTTP_SERVER_ERROR = 500;

const INITIAL_LEASE_STATUS = 'active';

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

/**
 * Builds a role-scoped filter for lease queries.
 * @param {Object} caller - req.user from protect middleware
 * @returns {Object} Mongoose filter
 */
function buildLeaseQuery(caller) {
  const q = {};
  if (caller.isAdmin) { /* admin fetches everything */ }
  else if (caller.role === 'tenant')   { q.tenantId   = caller._id; }
  else if (caller.role === 'landlord') { q.landlordId = caller._id; }
  return q;
}

// ─────────────────────────────────────────────────────────────────
// GET /api/leases
// ─────────────────────────────────────────────────────────────────
leasesRouter.get('/', protect, async (req, res) => {
  try {
    const leaseQuery  = buildLeaseQuery(req.user);
    const leaseResult = await LeaseModel.find(leaseQuery).sort({ createdAt: -1 });

    res.json({ success: true, count: leaseResult.length, leases: leaseResult });

  } catch (fetchErr) {
    res.status(HTTP_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/leases
// ─────────────────────────────────────────────────────────────────
leasesRouter.post('/', protect, async (req, res) => {
  try {
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

    const signedLease = await LeaseModel.create({
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
      status:   INITIAL_LEASE_STATUS,
      signedAt: new Date(),
    });

    res.status(HTTP_CREATED).json({ success: true, lease: signedLease });

  } catch (createErr) {
    res.status(HTTP_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// DELETE /api/leases/:id
// ─────────────────────────────────────────────────────────────────
leasesRouter.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await LeaseModel.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted.' });

  } catch (removeErr) {
    res.status(HTTP_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

module.exports = leasesRouter;
