/**
 * @file payments.js
 * @route /api/payments
 * @description Rent payment record routes for tenants, landlords, and admin.
 *
 * Role-based access:
 *   Tenant   — record new payments; view their own history
 *   Landlord — view payments received for their properties
 *   Admin    — view all records; delete any entry
 *
 * New payments are automatically stamped with status 'paid' and paidAt.
 */

'use strict';

const express  = require('express');
const Payment  = require('../models/Payment');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// ── HTTP status codes ──────────────────────────────────────────
const STATUS_CREATED      = 201;
const STATUS_BAD_REQUEST  = 400;
const STATUS_FORBIDDEN    = 403;
const STATUS_SERVER_ERROR = 500;

const INITIAL_PAYMENT_STATUS = 'paid';

// ── Helpers ────────────────────────────────────────────────────

/**
 * Builds a role-scoped MongoDB filter for payment queries.
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

// ── GET /api/payments ──────────────────────────────────────────
/**
 * Returns payment records scoped to the caller's role, newest first.
 *
 * @middleware protect
 * @returns {200} { success, count, payments }
 * @returns {500} Server error
 */
router.get('/', protect, async (req, res) => {
  try {
    const filter   = buildFilter(req.user, req.query);
    const payments = await Payment.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, count: payments.length, payments });

  } catch (_err) {
    res.status(STATUS_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ── POST /api/payments ─────────────────────────────────────────
/**
 * Records a new rent payment. Tenants only.
 * tenantId and tenantName are sourced from the verified JWT.
 * status and paidAt are set automatically — client must not supply them.
 *
 * @middleware protect
 * @returns {201} { success, payment }
 * @returns {400} Missing amount or month
 * @returns {403} Admin cannot add payments
 * @returns {500} Server error
 */
router.post('/', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin)
      return res.status(STATUS_FORBIDDEN).json({ success: false, message: 'Admin cannot add payments.' });

    const { amount, month, method, note, propertyTitle } = req.body;

    if (!amount || !month)
      return res.status(STATUS_BAD_REQUEST).json({ success: false, message: 'Amount and month required.' });

    const payment = await Payment.create({
      tenantId:      req.user._id,
      tenantName:    req.user.name,
      amount,
      month,
      method,
      note,
      propertyTitle: propertyTitle || '',
      status:        INITIAL_PAYMENT_STATUS,
      paidAt:        new Date(),
    });

    res.status(STATUS_CREATED).json({ success: true, payment });

  } catch (_err) {
    res.status(STATUS_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ── DELETE /api/payments/:id ───────────────────────────────────
/**
 * Permanently deletes a payment record. Admin only.
 *
 * @middleware protect, adminOnly
 * @returns {200} { success, message }
 * @returns {500} Server error
 */
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Payment.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted.' });

  } catch (_err) {
    res.status(STATUS_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
