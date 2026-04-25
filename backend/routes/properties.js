// ============================================================
// TMS — Property Routes
// CRUD + 3D config + furniture layouts (landlord & tenant)
// ============================================================
'use strict';

const router       = require('express').Router();
const PropModel    = require('../models/Property');
const { protect, adminOnly } = require('../middleware/auth');

// ─── GET /my — landlord's properties ─────────────────────────
router.get('/my', protect, async (req, res) => {
  try {
    const ownedList = await PropModel.find({ landlordId: req.user._id }).sort({ createdAt: -1 });
    return res.json({ success: true, count: ownedList.length, properties: ownedList });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ─── GET / — all with filters ────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const qry = {};
    if (req.query.status)     qry.status = req.query.status;
    if (req.query.area)       qry.area   = req.query.area;
    if (req.query.type)       qry.type   = req.query.type;
    if (req.query.beds)       qry.beds   = { $gte: Number(req.query.beds) };
    if (req.query.maxRent)    qry.rent   = { $lte: Number(req.query.maxRent) };
    if (req.query.landlordId) {
      const mg = require('mongoose');
      try   { qry.landlordId = new mg.Types.ObjectId(req.query.landlordId); }
      catch { qry.landlordId = req.query.landlordId; }
    }
    const listing = await PropModel.find(qry).sort({ createdAt: -1 });
    return res.json({ success: true, count: listing.length, properties: listing });
  } catch (e) { console.error(e); return res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ─── GET /:id — single property ──────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const item = await PropModel.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Property not found.' });
    return res.json({ success: true, property: item });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ─── POST / — create property ────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin)       return res.status(403).json({ success: false, message: 'Admin cannot add properties.' });
    if (req.user.role !== 'landlord') return res.status(403).json({ success: false, message: 'Only landlords can add properties.' });
    const created = await PropModel.create({ ...req.body, landlordId: req.user._id, landlordName: req.user.name });
    return res.status(201).json({ success: true, property: created });
  } catch (e) { console.error(e); return res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ─── PUT /:id — update property ──────────────────────────────
router.put('/:id', protect, async (req, res) => {
  try {
    const doc = await PropModel.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found.' });
    if (!req.user?.isAdmin && doc.landlordId.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    const patched = await PropModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return res.json({ success: true, property: patched });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ─── PUT /:id/model3d ────────────────────────────────────────
router.put('/:id/model3d', protect, async (req, res) => {
  try {
    const refreshed = await PropModel.findByIdAndUpdate(req.params.id, { model3d: req.body }, { new: true });
    return res.json({ success: true, property: refreshed });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ─── PUT /:id/furniture/landlord ─────────────────────────────
router.put('/:id/furniture/landlord', protect, async (req, res) => {
  try {
    const rec = await PropModel.findById(req.params.id);
    if (!rec) return res.status(404).json({ success: false, message: 'Not found.' });
    rec.landlordFurnitureLayout = req.body;
    rec.markModified('landlordFurnitureLayout');
    await rec.save();
    return res.json({ success: true, property: rec });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ─── PUT /:id/furniture/tenant ───────────────────────────────
router.put('/:id/furniture/tenant', protect, async (req, res) => {
  try {
    const rec = await PropModel.findById(req.params.id);
    if (!rec) return res.status(404).json({ success: false, message: 'Not found.' });
    rec.tenantFurnitureLayout = req.body;
    rec.markModified('tenantFurnitureLayout');
    await rec.save();
    return res.json({ success: true, property: rec });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ─── PUT /:id/furniture (legacy) ─────────────────────────────
router.put('/:id/furniture', protect, async (req, res) => {
  try {
    const rec = await PropModel.findById(req.params.id);
    if (!rec) return res.status(404).json({ success: false, message: 'Not found.' });
    rec.furnitureLayout = req.body;
    rec.markModified('furnitureLayout');
    await rec.save();
    return res.json({ success: true, property: rec });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ─── DELETE /:id ─────────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const target = await PropModel.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: 'Not found.' });
    if (!req.user?.isAdmin && target.landlordId.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    await PropModel.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Property deleted.' });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = router;
