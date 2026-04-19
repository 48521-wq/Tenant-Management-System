/**
 * @file maintenance.js
 * @route /api/maintenance
 * @description Maintenance request management for tenants, landlords, and admin.
 *
 * Access is scoped by role:
 *   Tenant   → submit new requests; view their own
 *   Landlord → view requests linked to their properties
 *   Admin    → view all requests; update status; delete
 *
 * Status lifecycle:  pending → in_progress → resolved | cancelled
 */

const express     = require('express');
const Maintenance = require('../models/Maintenance');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// HTTP status codes
const HTTP_CREATED      = 201;
const HTTP_BAD_REQUEST  = 400;
const HTTP_FORBIDDEN    = 403;
const HTTP_NOT_FOUND    = 404;
const HTTP_SERVER_ERROR = 500;

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

/**
 * Builds a role-scoped MongoDB query filter for maintenance requests.
 *
 *   Admin    → all requests; optional ?status narrowing
 *   Tenant   → only requests they personally submitted (tenantId)
 *   Landlord → requests linked to their properties (landlordId)
 *
 * @param {Object} currentUser - req.user populated by protect middleware
 * @param {Object} queryParams - req.query from the incoming request
 * @returns {Object} Mongoose-compatible filter object
 */
function buildMaintenanceFilter(currentUser, queryParams) {
  const filter = {};

  if (currentUser.isAdmin) {
    // Admin can optionally narrow by status, e.g. ?status=pending
    if (queryParams.status) filter.status = queryParams.status;
  } else if (currentUser.role === 'tenant') {
    filter.tenantId = currentUser._id;
  } else if (currentUser.role === 'landlord') {
    filter.landlordId = currentUser._id;
  }

  return filter;
}

// ─────────────────────────────────────────────────────────────────
// GET /api/maintenance
// ─────────────────────────────────────────────────────────────────
/**
 * Retrieves maintenance requests scoped to the logged-in user's role.
 * Sorted newest first so the most urgent pending items appear at the top.
 *
 * @middleware protect - Valid JWT required
 * @returns {200} { success, count, requests }
 * @returns {500} Unexpected server error
 */
router.get('/', protect, async (req, res) => {
  try {
    const filter      = buildMaintenanceFilter(req.user, req.query);
    const allRequests = await Maintenance.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, count: allRequests.length, requests: allRequests });

  } catch (err) {
    res.status(HTTP_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/maintenance
// ─────────────────────────────────────────────────────────────────
/**
 * Submits a new maintenance request (tenants only).
 * The tenant's identity is taken from the verified JWT —
 * tenantId and tenantName cannot be spoofed via the request body.
 * description is the only required field; type and priority use schema defaults.
 *
 * @middleware protect - Valid JWT required
 * @returns {201} { success, request }
 * @returns {400} Missing description
 * @returns {403} Admin cannot submit maintenance requests
 * @returns {500} Unexpected server error
 */
router.post('/', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin)
      return res.status(HTTP_FORBIDDEN).json({ success: false, message: 'Admin cannot submit maintenance.' });

    const { type, priority, description, propertyTitle } = req.body;

    if (!description)
      return res.status(HTTP_BAD_REQUEST).json({ success: false, message: 'Description is required.' });

    const newRequest = await Maintenance.create({
      tenantId:      req.user._id,
      tenantName:    req.user.name,
      type,
      priority,
      description,
      propertyTitle: propertyTitle || '',
    });

    res.status(HTTP_CREATED).json({ success: true, request: newRequest });

  } catch (err) {
    res.status(HTTP_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// PUT /api/maintenance/:id/status
// ─────────────────────────────────────────────────────────────────
/**
 * Updates a maintenance request's status and optionally adds an admin note.
 * When status is set to 'resolved', a resolvedAt timestamp is automatically stamped.
 * Admin can leave a note explaining what was repaired or why it was cancelled.
 *
 * @middleware protect   - Valid JWT required
 * @middleware adminOnly - Admin access required
 * @returns {200} { success, request }
 * @returns {404} Request not found
 * @returns {500} Unexpected server error
 */
router.put('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status, adminNote } = req.body;

    // Build the update payload — only include fields that were provided
    const updatePayload = { status };
    if (adminNote)             updatePayload.adminNote  = adminNote;
    if (status === 'resolved') updatePayload.resolvedAt = new Date();

    // { new: true } returns the document state after the update is applied
    const updatedRequest = await Maintenance.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true }
    );

    if (!updatedRequest)
      return res.status(HTTP_NOT_FOUND).json({ success: false, message: 'Not found.' });

    res.json({ success: true, request: updatedRequest });

  } catch (err) {
    res.status(HTTP_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// DELETE /api/maintenance/:id
// ─────────────────────────────────────────────────────────────────
/**
 * Permanently removes a maintenance request (admin only).
 * Hard delete — the record cannot be recovered once removed.
 *
 * @middleware protect   - Valid JWT required
 * @middleware adminOnly - Admin access required
 * @returns {200} { success, message }
 * @returns {500} Unexpected server error
 */
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Maintenance.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted.' });

  } catch (err) {
    res.status(HTTP_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
