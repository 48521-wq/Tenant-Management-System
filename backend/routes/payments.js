// ============================================================
// TMS — Payment Routes
// ============================================================
'use strict';

const express = require('express');
const Payment = require('../models/Payment');
const { protect, adminOnly } = require('../middleware/auth');

const payRoutes = express.Router();

// ─── GET / — payments filtered by role ───────────────────────
payRoutes.get('/', protect, async (req, res) => {
  try {
    const pFilter = {};
    if (req.user?.isAdmin) {
      if (req.query.status) pFilter.status = req.query.status;
    } else if (req.user.role === 'tenant') {
      pFilter.tenantId = req.user._id;
    } else if (req.user.role === 'landlord') {
      pFilter.landlordId = req.user._id;
    }
    const pList = await Payment.find(pFilter).sort({ createdAt: -1 });
    return res.json({ success: true, count: pList.length, payments: pList });
  } catch (pListErr) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── POST / — tenant records a payment ───────────────────────
payRoutes.post('/', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin)
      return res.status(403).json({ success: false, message: 'Admin cannot add payments.' });
    const { amount, month, method, note, propertyTitle } = req.body;
    if (!amount || !month)
      return res.status(400).json({ success: false, message: 'Amount and month required.' });
    const newP = await Payment.create({
      tenantId:     req.user._id,
      tenantName:   req.user.name,
      amount, month, method, note,
      propertyTitle: propertyTitle || '',
      status: 'paid',
      paidAt: new Date(),
    });
    return res.status(201).json({ success: true, payment: newP });
  } catch (pCreateErr) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── DELETE /:id — admin removes payment ─────────────────────
payRoutes.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Payment.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Deleted.' });
  } catch (pDelErr) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = payRoutes;
