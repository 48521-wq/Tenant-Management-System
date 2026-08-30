const express = require('express');
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const { protect, adminOnly } = require('../middleware/auth');
const router = express.Router();

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET payments
router.get('/', protect, async (req, res) => {
  try {
    let filter = {};
    if (req.user?.isAdmin) {
      filter.propertyId = { $ne: null };
      if (req.query.status) filter.status = req.query.status;
    } else if (req.user.role === 'tenant') {
      filter.tenantId = req.user._id;
    } else if (req.user.role === 'landlord') {
      const Property = require('../models/Property');
      const props = await Property.find({ landlordId: req.user._id }).select('_id title');
      const propIds = props.map(p => p._id);
      const propTitles = props.map(p => p.title).filter(Boolean);
      const escapedName = (req.user.name || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const nameRegex = new RegExp(`^${escapedName}$`, 'i');
      const titleRegexes = propTitles.map(t => new RegExp(`^${escapeRegex(t)}$`, 'i'));
      filter = {
        $or: [
          { landlordId: req.user._id },
          { propertyId: { $in: propIds } },
          { landlordName: nameRegex },
          ...(titleRegexes.length ? [{ propertyTitle: { $in: titleRegexes } }] : []),
        ]
      };
      if (req.query.status) filter.status = req.query.status;
      if (req.query.month) {
        // Substring, case-insensitive — so "Aug", "august", "August 2026"
        // all find "August 2026" regardless of how it was typed.
        filter.month = new RegExp(escapeRegex(req.query.month.trim()), 'i');
      }
      if (req.query.property) {
        filter.propertyTitle = new RegExp(escapeRegex(req.query.property.trim()), 'i');
      }
      if (req.query.tenant) {
        filter.tenantName = new RegExp(escapeRegex(req.query.tenant.trim()), 'i');
      }
    }

    const payments = await Payment.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: payments.length, payments });
  } catch (e) {
    console.error('GET /payments error', e);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST create payment record (tenant)
router.post('/', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin) return res.status(403).json({ success: false, message: 'Admin cannot add payments.' });
    const { amount, month, method, note, propertyTitle, landlordId, landlordName, propertyId, screenshot } = req.body;
    if (!amount || !month) return res.status(400).json({ success: false, message: 'Amount and month required.' });

    const paymentData = {
      tenantId: req.user._id,
      tenantName: req.user.name,
      amount,
      month,
      method,
      note,
      propertyTitle: propertyTitle || '',
      screenshot: screenshot || '',
      status: 'pending',
      paidAt: null,
    };
    if (landlordName) paymentData.landlordName = landlordName;

    if (landlordId && mongoose.Types.ObjectId.isValid(landlordId)) {
      paymentData.landlordId = landlordId;
    }
    if (propertyId && mongoose.Types.ObjectId.isValid(propertyId)) {
      paymentData.propertyId = propertyId;
    }

    const payment = await Payment.create(paymentData);
    res.status(201).json({ success: true, payment });
  } catch (e) {
    console.error('POST /payments error', e);
    res.status(500).json({ success: false, message: e.message || 'Server error.' });
  }
});

// PUT approve payment (landlord)
router.put('/:id/approve', protect, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found.' });
    if (req.user.role === 'landlord') {
      if (payment.landlordId && payment.landlordId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to approve this payment.' });
      }
      if (!payment.landlordId && payment.landlordName !== req.user.name) {
        return res.status(403).json({ success: false, message: 'Not authorized to approve this payment.' });
      }
    }
    payment.status = 'paid';
    payment.paidAt = new Date();
    await payment.save();
    res.json({ success: true, payment });
  } catch (e) {
    console.error('PUT /payments/:id/approve error', e);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PUT reject payment (landlord)
router.put('/:id/reject', protect, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found.' });
    if (req.user.role === 'landlord') {
      if (payment.landlordId && payment.landlordId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to reject this payment.' });
      }
      if (!payment.landlordId && payment.landlordName !== req.user.name) {
        return res.status(403).json({ success: false, message: 'Not authorized to reject this payment.' });
      }
    }
    payment.status = 'rejected';
    payment.paidAt = null;
    await payment.save();
    res.json({ success: true, payment });
  } catch (e) {
    console.error('PUT /payments/:id/reject error', e);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// DELETE (admin)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Payment.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted.' });
  } catch (e) {
    console.error('DELETE /payments/:id error', e);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
