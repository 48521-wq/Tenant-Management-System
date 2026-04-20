// ============================================================
// TMS Payment Routes
// ============================================================
const express = require('express');
const Payment = require('../models/Payment');
const { protect, adminOnly } = require('../middleware/auth');

const pmtRouter = express.Router();

// ─── GET / — list payments filtered by role ──────────────────
pmtRouter.get('/', protect, async (req, res) => {
  try {
    const roleFilter = {};
    if (req.user?.isAdmin) {
      if (req.query.status) roleFilter.status = req.query.status;
    } else if (req.user.role === 'tenant') {
      roleFilter.tenantId = req.user._id;
    } else if (req.user.role === 'landlord') {
      roleFilter.landlordId = req.user._id;
    }
    const paymentList = await Payment.find(roleFilter).sort({ createdAt: -1 });
    res.json({ success: true, count: paymentList.length, payments: paymentList });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── POST / — tenant records a rent payment ──────────────────
pmtRouter.post('/', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin)
      return res.status(403).json({ success: false, message: 'Admin cannot add payments.' });
    const { amount, month, method, note, propertyTitle } = req.body;
    if (!amount || !month)
      return res.status(400).json({ success: false, message: 'Amount and month required.' });
    const savedPayment = await Payment.create({
      tenantId:     req.user._id,
      tenantName:   req.user.name,
      amount, month, method, note,
      propertyTitle: propertyTitle || '',
      status: 'paid',
      paidAt: new Date(),
    });
    res.status(201).json({ success: true, payment: savedPayment });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── DELETE /:id — admin removes a payment record ────────────
pmtRouter.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Payment.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = pmtRouter;
