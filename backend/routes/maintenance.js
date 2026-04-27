/**
 * @file maintenance.js
 * @route /api/maintenance
 * @description Maintenance request management for tenants, landlords, and admin.
 *
 * Access scoped by role:
 *   Tenant   → submit new requests; view their own
 *   Landlord → view requests linked to their properties
 *   Admin    → view all; update status; delete
 *
 * Status lifecycle:  pending → in_progress → resolved | cancelled
 */

const express           = require('express');
const MaintenanceModel  = require('../models/Maintenance');
const { protect, adminOnly } = require('../middleware/auth');

const maintRouter = express.Router();

// ── HTTP status code constants ─────────────────────────────────
const STATUS_CREATED      = 201;
const STATUS_BAD_REQUEST  = 400;
const STATUS_FORBIDDEN    = 403;
const STATUS_NOT_FOUND    = 404;
const STATUS_SERVER_ERROR = 500;

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

/**
 * Builds a role-scoped MongoDB query for maintenance requests.
 *
 *   Admin    → all requests; optional ?status narrowing
 *   Tenant   → only requests they submitted (tenantId)
 *   Landlord → requests linked to their properties (landlordId)
 *
 * @param {Object} caller      - req.user from protect middleware
 * @param {Object} queryString - req.query from the request
 * @returns {Object} Mongoose filter object
 */
function makeMaintQuery(caller, queryString) {
  const dbQuery = {};

  if (caller.isAdmin) {
    if (queryString.status) dbQuery.status = queryString.status;
  } else if (caller.role === 'tenant') {
    dbQuery.tenantId = caller._id;
  } else if (caller.role === 'landlord') {
    dbQuery.landlordId = caller._id;
  }

  return dbQuery;
}

// ─────────────────────────────────────────────────────────────────
// GET /api/maintenance
// ─────────────────────────────────────────────────────────────────
/**
 * Retrieves maintenance requests scoped to the user's role.
 * Sorted newest first.
 *
 * @middleware protect
 * @returns {200} { success, count, requests }
 * @returns {500} Server error
 */
maintRouter.get('/', protect, async (req, res) => {
  try {
    const dbQuery      = makeMaintQuery(req.user, req.query);
    const requestSet   = await MaintenanceModel.find(dbQuery).sort({ createdAt: -1 });

    res.json({ success: true, count: requestSet.length, requests: requestSet });

  } catch (getErr) {
    res.status(STATUS_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/maintenance
// ─────────────────────────────────────────────────────────────────
/**
 * Submits a new maintenance request (tenants only).
 * tenantId and tenantName come from the verified JWT.
 *
 * @middleware protect
 * @returns {201} { success, request }
 * @returns {400} Missing description
 * @returns {403} Admin cannot submit maintenance
 * @returns {500} Server error
 */
maintRouter.post('/', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin)
      return res.status(STATUS_FORBIDDEN).json({ success: false, message: 'Admin cannot submit maintenance.' });

    const { type, priority, description, propertyTitle } = req.body;

    if (!description)
      return res.status(STATUS_BAD_REQUEST).json({ success: false, message: 'Description is required.' });

    const savedRequest = await MaintenanceModel.create({
      tenantId:      req.user._id,
      tenantName:    req.user.name,
      type,
      priority,
      description,
      propertyTitle: propertyTitle || '',
    });

    res.status(STATUS_CREATED).json({ success: true, request: savedRequest });

  } catch (postErr) {
    res.status(STATUS_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// PUT /api/maintenance/:id/status
// ─────────────────────────────────────────────────────────────────
/**
 * Updates a maintenance request status and optionally adds an admin note.
 * Stamps resolvedAt when status becomes 'resolved'.
 *
 * @middleware protect, adminOnly
 * @returns {200} { success, request }
 * @returns {404} Not found
 * @returns {500} Server error
 */
maintRouter.put('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status, adminNote } = req.body;

    const patchData = { status };
    if (adminNote)             patchData.adminNote  = adminNote;
    if (status === 'resolved') patchData.resolvedAt = new Date();

    const patchedRequest = await MaintenanceModel.findByIdAndUpdate(
      req.params.id,
      patchData,
      { new: true }
    );

    if (!patchedRequest)
      return res.status(STATUS_NOT_FOUND).json({ success: false, message: 'Not found.' });

    res.json({ success: true, request: patchedRequest });

  } catch (patchErr) {
    res.status(STATUS_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// DELETE /api/maintenance/:id
// ─────────────────────────────────────────────────────────────────
/**
 * Permanently removes a maintenance request (admin only).
 *
 * @middleware protect, adminOnly
 * @returns {200} { success, message }
 * @returns {500} Server error
 */
maintRouter.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await MaintenanceModel.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted.' });

  } catch (delErr) {
    res.status(STATUS_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

module.exports = maintRouter;
