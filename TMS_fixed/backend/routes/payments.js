const express = require('express');
const Payment = require('../models/Payment');
const { protect, adminOnly } = require('../middleware/auth');
const router = express.Router();

// GET payments
router.get('/', protect, async (req, res) => {
  try {
    let filter = {};
    if (req.user?.isAdmin) {
      if (req.query.status) filter.status = req.query.status;
    } else if (req.user.role === 'tenant') {
      filter.tenantId = req.user._id;
    } else if (req.user.role === 'landlord') {
      filter.landlordId = req.user._id;
    }
    const payments = await Payment.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: payments.length, payments });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// POST create payment record (tenant)
router.post('/', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin) return res.status(403).json({ success: false, message: 'Admin cannot add payments.' });
    const { amount, month, method, note, propertyTitle } = req.body;
    if (!amount || !month) return res.status(400).json({ success: false, message: 'Amount and month required.' });
    const payment = await Payment.create({
      tenantId:    req.user._id,
      tenantName:  req.user.name,
      amount, month, method, note,
      propertyTitle: propertyTitle || '',
      status: 'paid',
      paidAt: new Date(),
    });
    res.status(201).json({ success: true, payment });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// DELETE (admin)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Payment.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted.' });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = router;
