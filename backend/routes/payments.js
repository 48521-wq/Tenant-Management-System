// ============================================================
// TMS — Payment Routes
// ============================================================
'use strict';

const router      = require('express').Router();
const PayModel    = require('../models/Payment');
const { protect, adminOnly } = require('../middleware/auth');

// ─── GET / ───────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const qry = {};
    if (req.user?.isAdmin)                { if (req.query.status) qry.status = req.query.status; }
    else if (req.user.role === 'tenant')   { qry.tenantId   = req.user._id; }
    else if (req.user.role === 'landlord') { qry.landlordId = req.user._id; }
    const rows = await PayModel.find(qry).sort({ createdAt: -1 });
    return res.json({ success: true, count: rows.length, payments: rows });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ─── POST / ──────────────────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin)
      return res.status(403).json({ success: false, message: 'Admin cannot add payments.' });
    const { amount, month, method, note, propertyTitle } = req.body;
    if (!amount || !month) return res.status(400).json({ success: false, message: 'Amount and month required.' });
    const saved = await PayModel.create({ tenantId: req.user._id, tenantName: req.user.name, amount, month, method, note, propertyTitle: propertyTitle || '', status: 'paid', paidAt: new Date() });
    return res.status(201).json({ success: true, payment: saved });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ─── DELETE /:id ─────────────────────────────────────────────
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await PayModel.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Deleted.' });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = router;
