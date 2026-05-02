/**
 * @file maintenance.js
 * @route /api/maintenance
 * @description Maintenance request routes for tenants, landlords, and admin.
 *
 * Role-based access:
 *   Tenant   — submit requests; view their own
 *   Landlord — view requests for their properties
 *   Admin    — view all; update status; delete
 *
 * Status lifecycle:  pending → in_progress → resolved | cancelled
 */

'use strict';

const express     = require('express');
const Maintenance = require('../models/Maintenance');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// ── HTTP status codes ──────────────────────────────────────────
const STATUS_CREATED      = 201;
const STATUS_BAD_REQUEST  = 400;
const STATUS_FORBIDDEN    = 403;
const STATUS_NOT_FOUND    = 404;
const STATUS_SERVER_ERROR = 500;

// ── Helpers ────────────────────────────────────────────────────

/**
 * Builds a role-scoped MongoDB filter for maintenance queries.
 *
 * @param {Object} user  - req.user set by protect middleware
 * @param {Object} query - req.query from the incoming request
 * @returns {Object} Mongoose-compatible filter object
 */
function buildFilter(user, query) {
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

// ── GET /api/maintenance ───────────────────────────────────────
/**
 * Returns maintenance requests scoped to the caller's role, newest first.
 *
 * @middleware protect
 * @returns {200} { success, count, requests }
 * @returns {500} Server error
 */
router.get('/', protect, async (req, res) => {
  try {
    const filter   = buildFilter(req.user, req.query);
    const requests = await Maintenance.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, count: requests.length, requests });

  } catch (_err) {
    res.status(STATUS_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ── POST /api/maintenance ──────────────────────────────────────
/**
 * Submits a new maintenance request. Tenants only.
 * tenantId and tenantName are sourced from the verified JWT.
 *
 * @middleware protect
 * @returns {201} { success, request }
 * @returns {400} Missing description
 * @returns {403} Admin cannot submit requests
 * @returns {500} Server error
 */
router.post('/', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin)
      return res.status(STATUS_FORBIDDEN).json({ success: false, message: 'Admin cannot submit maintenance.' });

    const { type, priority, description, propertyTitle } = req.body;

    if (!description)
      return res.status(STATUS_BAD_REQUEST).json({ success: false, message: 'Description is required.' });

    const request = await Maintenance.create({
      tenantId:      req.user._id,
      tenantName:    req.user.name,
      type,
      priority,
      description,
      propertyTitle: propertyTitle || '',
    });

    res.status(STATUS_CREATED).json({ success: true, request });

  } catch (_err) {
    res.status(STATUS_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ── PUT /api/maintenance/:id/status ───────────────────────────
/**
 * Updates request status and optional admin note. Admin only.
 * Stamps resolvedAt automatically when status becomes 'resolved'.
 *
 * @middleware protect, adminOnly
 * @returns {200} { success, request }
 * @returns {404} Not found
 * @returns {500} Server error
 */
router.put('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status, adminNote } = req.body;

    const changes = { status };
    if (adminNote)             changes.adminNote  = adminNote;
    if (status === 'resolved') changes.resolvedAt = new Date();

    const updated = await Maintenance.findByIdAndUpdate(req.params.id, changes, { new: true });

    if (!updated)
      return res.status(STATUS_NOT_FOUND).json({ success: false, message: 'Not found.' });

    res.json({ success: true, request: updated });

  } catch (_err) {
    res.status(STATUS_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ── DELETE /api/maintenance/:id ────────────────────────────────
/**
 * Permanently deletes a maintenance request. Admin only.
 *
 * @middleware protect, adminOnly
 * @returns {200} { success, message }
 * @returns {500} Server error
 */
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Maintenance.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted.' });

  } catch (_err) {
    res.status(STATUS_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
