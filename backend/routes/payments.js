/**
 * @file payments.js
 * @route /api/payments
 * @description Rent payment record management for tenants, landlords, and admin.
 *
 * Access is scoped by role:
 *   Tenant   → record new payments; view their own records
 *   Landlord → view payments received for their properties
 *   Admin    → view all payments; delete any record
 *
 * When a tenant records a payment, status is set to 'paid'
 * and paidAt is stamped automatically at creation time.
 */

const express  = require('express');
const Payment  = require('../models/Payment');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// HTTP status codes
const HTTP_CREATED      = 201;
const HTTP_BAD_REQUEST  = 400;
const HTTP_FORBIDDEN    = 403;
const HTTP_SERVER_ERROR = 500;

// Default status stamped on every new payment record
const DEFAULT_PAYMENT_STATUS = 'paid';

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

/**
 * Builds a role-scoped MongoDB query filter for payment records.
 *
 *   Admin    → all payments; optional ?status narrowing
 *   Tenant   → only their own payment records (tenantId)
 *   Landlord → payments made to them (landlordId)
 *
 * @param {Object} currentUser - req.user populated by protect middleware
 * @param {Object} queryParams - req.query from the incoming request
 * @returns {Object} Mongoose-compatible filter object
 */
function buildPaymentFilter(currentUser, queryParams) {
  const filter = {};

  if (currentUser.isAdmin) {
    // Admin can optionally filter by payment status
    if (queryParams.status) filter.status = queryParams.status;
  } else if (currentUser.role === 'tenant') {
    filter.tenantId = currentUser._id;
  } else if (currentUser.role === 'landlord') {
    filter.landlordId = currentUser._id;
  }

  return filter;
}

// ─────────────────────────────────────────────────────────────────
// GET /api/payments
// ─────────────────────────────────────────────────────────────────
/**
 * Retrieves payment records scoped to the requesting user's role.
 * Sorted newest first so the most recent payment appears at the top.
 *
 * @middleware protect - Valid JWT required
 * @returns {200} { success, count, payments }
 * @returns {500} Unexpected server error
 */
router.get('/', protect, async (req, res) => {
  try {
    const filter      = buildPaymentFilter(req.user, req.query);
    const allPayments = await Payment.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, count: allPayments.length, payments: allPayments });

  } catch (err) {
    res.status(HTTP_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/payments
// ─────────────────────────────────────────────────────────────────
/**
 * Records a new rent payment (tenants only).
 * status is set to 'paid' and paidAt is stamped automatically —
 * the client does not need to supply these fields.
 * Admin cannot create payment entries on behalf of tenants.
 *
 * @middleware protect - Valid JWT required
 * @returns {201} { success, payment }
 * @returns {400} Missing amount or month
 * @returns {403} Admin cannot add payments
 * @returns {500} Unexpected server error
 */
router.post('/', protect, async (req, res) => {
  try {
    // Admin should not create payment records directly
    if (req.user?.isAdmin)
      return res.status(HTTP_FORBIDDEN).json({ success: false, message: 'Admin cannot add payments.' });

    const { amount, month, method, note, propertyTitle } = req.body;

    // Both amount and month are required to create a meaningful payment record
    if (!amount || !month)
      return res.status(HTTP_BAD_REQUEST).json({ success: false, message: 'Amount and month required.' });

    const newPayment = await Payment.create({
      tenantId:      req.user._id,   // from JWT — cannot be spoofed by the client
      tenantName:    req.user.name,
      amount,
      month,
      method,
      note,
      propertyTitle: propertyTitle || '',
      status:        DEFAULT_PAYMENT_STATUS,         // automatically set at creation time
      paidAt:        new Date(),     // timestamp of when the payment was recorded
    });

    res.status(HTTP_CREATED).json({ success: true, payment: newPayment });

  } catch (err) {
    res.status(HTTP_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// DELETE /api/payments/:id
// ─────────────────────────────────────────────────────────────────
/**
 * Permanently removes a payment record (admin only).
 * Hard delete — use with caution as this cannot be undone.
 *
 * @middleware protect   - Valid JWT required
 * @middleware adminOnly - Admin access required
 * @returns {200} { success, message }
 * @returns {500} Unexpected server error
 */
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Payment.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted.' });

  } catch (err) {
    res.status(HTTP_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
