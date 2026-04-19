/**
 * @file complaints.js
 * @route /api/complaints
 * @description Complaint management for tenants, landlords, and admin.
 *
 * Access is scoped by role:
 *   Tenant   → file new complaints; view their own records
 *   Landlord → view complaints filed about their properties
 *   Admin    → view all; update status; add notes; delete
 *
 * Status lifecycle:  open → in_progress → resolved | closed
 */

const express   = require('express');
const Complaint = require('../models/Complaint');
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
 * Builds a role-scoped MongoDB query filter for complaints.
 *
 *   Admin    → all complaints; optional ?status narrowing
 *   Tenant   → only complaints they personally filed (tenantId)
 *   Landlord → complaints linked to their properties (landlordId)
 *
 * @param {Object} currentUser - req.user populated by protect middleware
 * @param {Object} queryParams - req.query from the incoming request
 * @returns {Object} Mongoose-compatible filter object
 */
function buildComplaintFilter(currentUser, queryParams) {
  const filter = {};

  if (currentUser.isAdmin) {
    // Admin can optionally narrow by status, e.g. GET /api/complaints?status=open
    if (queryParams.status) filter.status = queryParams.status;
  } else if (currentUser.role === 'tenant') {
    filter.tenantId = currentUser._id;
  } else if (currentUser.role === 'landlord') {
    filter.landlordId = currentUser._id;
  }

  return filter;
}

// ─────────────────────────────────────────────────────────────────
// GET /api/complaints
// ─────────────────────────────────────────────────────────────────
/**
 * Retrieves complaints scoped to the requesting user's role.
 * Sorted newest first so the most recent complaint appears at the top.
 *
 * @middleware protect - Valid JWT required
 * @returns {200} { success, count, complaints }
 * @returns {500} Unexpected server error
 */
router.get('/', protect, async (req, res) => {
  try {
    const filter       = buildComplaintFilter(req.user, req.query);
    const allComplaints = await Complaint.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, count: allComplaints.length, complaints: allComplaints });

  } catch (err) {
    res.status(HTTP_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/complaints
// ─────────────────────────────────────────────────────────────────
/**
 * Files a new complaint (tenants only).
 * The tenant's identity is taken from the verified JWT —
 * tenantId and tenantName cannot be spoofed via the request body.
 * subject is the only required field; all others default per schema.
 *
 * @middleware protect - Valid JWT required
 * @returns {201} { success, complaint }
 * @returns {400} Missing subject
 * @returns {403} Admin cannot file complaints
 * @returns {500} Unexpected server error
 */
router.post('/', protect, async (req, res) => {
  try {
    // Admin accounts cannot file complaints — this is a tenant action
    if (req.user?.isAdmin)
      return res.status(HTTP_FORBIDDEN).json({ success: false, message: 'Admin cannot file complaints.' });

    const { subject, description, category, priority } = req.body;

    if (!subject)
      return res.status(HTTP_BAD_REQUEST).json({ success: false, message: 'Subject is required.' });

    const newComplaint = await Complaint.create({
      tenantId:   req.user._id,
      tenantName: req.user.name,
      subject,
      description,
      category,
      priority,
    });

    res.status(HTTP_CREATED).json({ success: true, complaint: newComplaint });

  } catch (err) {
    res.status(HTTP_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// PUT /api/complaints/:id/status
// ─────────────────────────────────────────────────────────────────
/**
 * Updates a complaint's status and optionally adds an admin note.
 * When status is set to 'resolved', a resolvedAt timestamp is automatically stamped
 * so the tenant can see exactly when the issue was handled.
 *
 * @middleware protect   - Valid JWT required
 * @middleware adminOnly - Admin access required
 * @returns {200} { success, complaint }
 * @returns {404} Complaint not found
 * @returns {500} Unexpected server error
 */
router.put('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status, adminNote } = req.body;

    // Build the update payload — include only provided fields
    const updatePayload = { status };
    if (adminNote)             updatePayload.adminNote  = adminNote;
    if (status === 'resolved') updatePayload.resolvedAt = new Date();

    // { new: true } returns the document after the update is applied
    const updatedComplaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true }
    );

    if (!updatedComplaint)
      return res.status(HTTP_NOT_FOUND).json({ success: false, message: 'Not found.' });

    res.json({ success: true, complaint: updatedComplaint });

  } catch (err) {
    res.status(HTTP_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// DELETE /api/complaints/:id
// ─────────────────────────────────────────────────────────────────
/**
 * Permanently removes a complaint record (admin only).
 * Hard delete — the record cannot be recovered once removed.
 *
 * @middleware protect   - Valid JWT required
 * @middleware adminOnly - Admin access required
 * @returns {200} { success, message }
 * @returns {500} Unexpected server error
 */
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Complaint.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Complaint deleted.' });

  } catch (err) {
    res.status(HTTP_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
