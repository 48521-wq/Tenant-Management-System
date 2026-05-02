/**
 * @file leases.js
 * @route /api/leases
 * @description Lease agreement routes for tenants, landlords, and admin.
 *
 * Role-based access:
 *   Tenant   — sign new leases; view their own agreements
 *   Landlord — view leases linked to their properties
 *   Admin    — view all; delete any record
 *
 * New leases receive status 'active' and a signedAt timestamp automatically.
 * Property and landlord details are cached on the document so it remains
 * readable even after those records are removed from the database.
 */

'use strict';

const express = require('express');
const Lease   = require('../models/Lease');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// ── HTTP status codes ──────────────────────────────────────────
const STATUS_CREATED      = 201;
const STATUS_FORBIDDEN    = 403;
const STATUS_SERVER_ERROR = 500;

const INITIAL_LEASE_STATUS = 'active';

// ── Helpers ────────────────────────────────────────────────────

/**
 * Builds a role-scoped MongoDB filter for lease queries.
 *
 * @param {Object} user - req.user set by protect middleware
 * @returns {Object} Mongoose-compatible filter object
 */
function buildFilter(user) {
  const filter = {};

  if (user.isAdmin) {
    // Admin sees all leases — empty filter is intentional
  } else if (user.role === 'tenant') {
    filter.tenantId = user._id;
  } else if (user.role === 'landlord') {
    filter.landlordId = user._id;
  }

  return filter;
}

// ── GET /api/leases ────────────────────────────────────────────
/**
 * Returns lease agreements scoped to the caller's role, newest first.
 *
 * @middleware protect
 * @returns {200} { success, count, leases }
 * @returns {500} Server error
 */
router.get('/', protect, async (req, res) => {
  try {
    const filter = buildFilter(req.user);
    const leases = await Lease.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, count: leases.length, leases });

  } catch (_err) {
    res.status(STATUS_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ── POST /api/leases ───────────────────────────────────────────
/**
 * Creates and signs a new lease agreement. Tenants only.
 * tenantId, tenantName, tenantEmail are sourced from the verified JWT.
 * status is set to 'active' and signedAt is stamped automatically.
 *
 * @middleware protect
 * @returns {201} { success, lease }
 * @returns {403} Admin cannot sign leases
 * @returns {500} Server error
 */
router.post('/', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin)
      return res.status(STATUS_FORBIDDEN).json({ success: false, message: 'Admin cannot sign leases.' });

    const {
      propertyTitle, propertyAddress,
      landlordName, rent,
      startDate, endDate, duration, terms,
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
      status:   INITIAL_LEASE_STATUS,
      signedAt: new Date(),
    });

    res.status(STATUS_CREATED).json({ success: true, lease });

  } catch (_err) {
    res.status(STATUS_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ── DELETE /api/leases/:id ─────────────────────────────────────
/**
 * Permanently deletes a lease record. Admin only.
 *
 * @middleware protect, adminOnly
 * @returns {200} { success, message }
 * @returns {500} Server error
 */
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Lease.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted.' });

  } catch (_err) {
    res.status(STATUS_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
