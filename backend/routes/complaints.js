/**
 * @file complaints.js
 * @route /api/complaints
 * @description Complaint management routes for tenants, landlords, and admin.
 *
 * Role-based access:
 *   Tenant   — file new complaints; view their own records
 *   Landlord — view complaints filed against their properties
 *   Admin    — view all; update status; add notes; delete
 *
 * Status lifecycle:  open → in_progress → resolved | closed
 */

'use strict';

const express   = require('express');
const Complaint = require('../models/Complaint');
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
 * Builds a role-scoped MongoDB filter for complaint queries.
 *
 *   Admin    → all complaints; optional ?status narrowing
 *   Tenant   → only complaints they personally filed (tenantId)
 *   Landlord → complaints linked to their properties (landlordId)
 *
 * @param {Object} user   - req.user set by protect middleware
 * @param {Object} query  - req.query from the incoming request
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

// ── GET /api/complaints ────────────────────────────────────────
/**
 * Returns complaints scoped to the caller's role, newest first.
 *
 * @middleware protect
 * @returns {200} { success, count, complaints }
 * @returns {500} Server error
 */
router.get('/', protect, async (req, res) => {
  try {
    const filter     = buildFilter(req.user, req.query);
    const complaints = await Complaint.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, count: complaints.length, complaints });

  } catch (_err) {
    res.status(STATUS_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ── POST /api/complaints ───────────────────────────────────────
/**
 * Files a new complaint. Tenants only.
 * tenantId and tenantName are sourced from the verified JWT.
 *
 * @middleware protect
 * @returns {201} { success, complaint }
 * @returns {400} Missing subject
 * @returns {403} Admin cannot file complaints
 * @returns {500} Server error
 */
router.post('/', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin)
      return res.status(STATUS_FORBIDDEN).json({ success: false, message: 'Admin cannot file complaints.' });

    const { subject, description, category, priority } = req.body;

    if (!subject)
      return res.status(STATUS_BAD_REQUEST).json({ success: false, message: 'Subject is required.' });

    const complaint = await Complaint.create({
      tenantId:   req.user._id,
      tenantName: req.user.name,
      subject,
      description,
      category,
      priority,
    });

    res.status(STATUS_CREATED).json({ success: true, complaint });

  } catch (_err) {
    res.status(STATUS_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ── PUT /api/complaints/:id/status ─────────────────────────────
/**
 * Updates complaint status and optional admin note. Admin only.
 * Stamps resolvedAt automatically when status is set to 'resolved'.
 *
 * @middleware protect, adminOnly
 * @returns {200} { success, complaint }
 * @returns {404} Not found
 * @returns {500} Server error
 */
router.put('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status, adminNote } = req.body;

    const changes = { status };
    if (adminNote)             changes.adminNote  = adminNote;
    if (status === 'resolved') changes.resolvedAt = new Date();

    const updated = await Complaint.findByIdAndUpdate(req.params.id, changes, { new: true });

    if (!updated)
      return res.status(STATUS_NOT_FOUND).json({ success: false, message: 'Not found.' });

    res.json({ success: true, complaint: updated });

  } catch (_err) {
    res.status(STATUS_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ── DELETE /api/complaints/:id ─────────────────────────────────
/**
 * Permanently deletes a complaint record. Admin only.
 *
 * @middleware protect, adminOnly
 * @returns {200} { success, message }
 * @returns {500} Server error
 */
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Complaint.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Complaint deleted.' });

  } catch (_err) {
    res.status(STATUS_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
