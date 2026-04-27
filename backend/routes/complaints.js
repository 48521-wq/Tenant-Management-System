/**
 * @file complaints.js
 * @route /api/complaints
 * @description Complaint management for tenants, landlords, and admin.
 *
 * Access scoped by role:
 *   Tenant   → file new complaints; view their own records
 *   Landlord → view complaints about their properties
 *   Admin    → view all; update status; add notes; delete
 *
 * Status lifecycle:  open → in_progress → resolved | closed
 */

const express         = require('express');
const ComplaintModel  = require('../models/Complaint');
const { protect, adminOnly } = require('../middleware/auth');

const complaintsRouter = express.Router();

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
 * Builds a role-scoped MongoDB query for complaints.
 *
 *   Admin    → all complaints; optional ?status narrowing
 *   Tenant   → only complaints they personally filed (tenantId)
 *   Landlord → complaints linked to their properties (landlordId)
 *
 * @param {Object} caller      - req.user from protect middleware
 * @param {Object} queryString - req.query from the request
 * @returns {Object} Mongoose filter object
 */
function makeComplaintQuery(caller, queryString) {
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
// GET /api/complaints
// ─────────────────────────────────────────────────────────────────
/**
 * Retrieves complaints scoped to the requesting user's role.
 * Sorted newest first.
 *
 * @middleware protect
 * @returns {200} { success, count, complaints }
 * @returns {500} Server error
 */
complaintsRouter.get('/', protect, async (req, res) => {
  try {
    const dbQuery      = makeComplaintQuery(req.user, req.query);
    const complaintSet = await ComplaintModel.find(dbQuery).sort({ createdAt: -1 });

    res.json({ success: true, count: complaintSet.length, complaints: complaintSet });

  } catch (getErr) {
    res.status(STATUS_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/complaints
// ─────────────────────────────────────────────────────────────────
/**
 * Files a new complaint (tenants only).
 * tenantId and tenantName come from the verified JWT.
 *
 * @middleware protect
 * @returns {201} { success, complaint }
 * @returns {400} Missing subject
 * @returns {403} Admin cannot file complaints
 * @returns {500} Server error
 */
complaintsRouter.post('/', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin)
      return res.status(STATUS_FORBIDDEN).json({ success: false, message: 'Admin cannot file complaints.' });

    const { subject, description, category, priority } = req.body;

    if (!subject)
      return res.status(STATUS_BAD_REQUEST).json({ success: false, message: 'Subject is required.' });

    const savedComplaint = await ComplaintModel.create({
      tenantId:   req.user._id,
      tenantName: req.user.name,
      subject,
      description,
      category,
      priority,
    });

    res.status(STATUS_CREATED).json({ success: true, complaint: savedComplaint });

  } catch (postErr) {
    res.status(STATUS_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// PUT /api/complaints/:id/status
// ─────────────────────────────────────────────────────────────────
/**
 * Updates a complaint status and optionally adds an admin note.
 * Stamps resolvedAt when status becomes 'resolved'.
 *
 * @middleware protect, adminOnly
 * @returns {200} { success, complaint }
 * @returns {404} Not found
 * @returns {500} Server error
 */
complaintsRouter.put('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status, adminNote } = req.body;

    const patchData = { status };
    if (adminNote)             patchData.adminNote  = adminNote;
    if (status === 'resolved') patchData.resolvedAt = new Date();

    const patchedComplaint = await ComplaintModel.findByIdAndUpdate(
      req.params.id,
      patchData,
      { new: true }
    );

    if (!patchedComplaint)
      return res.status(STATUS_NOT_FOUND).json({ success: false, message: 'Not found.' });

    res.json({ success: true, complaint: patchedComplaint });

  } catch (patchErr) {
    res.status(STATUS_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// DELETE /api/complaints/:id
// ─────────────────────────────────────────────────────────────────
/**
 * Permanently removes a complaint (admin only).
 *
 * @middleware protect, adminOnly
 * @returns {200} { success, message }
 * @returns {500} Server error
 */
complaintsRouter.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await ComplaintModel.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Complaint deleted.' });

  } catch (delErr) {
    res.status(STATUS_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

module.exports = complaintsRouter;
