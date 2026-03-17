// ═══════════════════════════════════════════════════════════════
//  Payment Routes  —  /api/payments
//  Handles payment records for tenants, landlords, and admin
// ═══════════════════════════════════════════════════════════════

const express  = require('express');
const Payment  = require('../models/Payment');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// ── Helper: build query filter based on logged-in user role ──────
// Admin → all payments (with optional status filter)
// Tenant → only their own payments
// Landlord → only payments made to them
function buildPaymentFilter(user, query) {
  const filter = {};

  if (user.isAdmin) {
    // Admin can optionally filter by payment status
    if (query.status) filter.status = query.status;
  } else if (user.role === 'tenant') {
    filter.tenantId = user._id;
  } else if (user.role === 'landlord') {
    filter.landlordId = user._id;
  }

  return filter;
}

// ── GET /api/payments ────────────────────────────────────────────
// Retrieve payments scoped to the requesting user's role
router.get('/', protect, async (req, res) => {
  try {
    const filter   = buildPaymentFilter(req.user, req.query);
    const payments = await Payment.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, count: payments.length, payments });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── POST /api/payments ───────────────────────────────────────────
// Create a new payment record (tenants only)
router.post('/', protect, async (req, res) => {
  try {
    // Admin should not directly create payment entries
    if (req.user?.isAdmin)
      return res.status(403).json({ success: false, message: 'Admin cannot add payments.' });

    const { amount, month, method, note, propertyTitle } = req.body;

    // Validate required fields
    if (!amount || !month)
      return res.status(400).json({ success: false, message: 'Amount and month required.' });

    // Create the payment record linked to the authenticated tenant
    const payment = await Payment.create({
      tenantId:      req.user._id,
      tenantName:    req.user.name,
      amount,
      month,
      method,
      note,
      propertyTitle: propertyTitle || '',
      status:        'paid',
      paidAt:        new Date(),
    });

    res.status(201).json({ success: true, payment });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── DELETE /api/payments/:id ─────────────────────────────────────
// Permanently delete a payment record (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Payment.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted.' });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
