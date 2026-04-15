const express  = require('express');
const Property = require('../models/Property');
const { protect, adminOnly } = require('../middleware/auth');
const router = express.Router();

// GET landlord's OWN properties (uses JWT — no ID needed in URL)
router.get('/my', protect, async (req, res) => {
  try {
    const props = await Property.find({ landlordId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, count: props.length, properties: props });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// GET all properties (public / admin)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status)     filter.status = req.query.status;
    if (req.query.area)       filter.area   = req.query.area;
    if (req.query.type)       filter.type   = req.query.type;
    if (req.query.beds)       filter.beds   = { $gte: Number(req.query.beds) };
    if (req.query.maxRent)    filter.rent   = { $lte: Number(req.query.maxRent) };
    if (req.query.landlordId) {
      // MongoDB stores landlordId as ObjectId — use string comparison via regex or cast
      const mongoose = require('mongoose');
      try {
        filter.landlordId = new mongoose.Types.ObjectId(req.query.landlordId);
      } catch {
        filter.landlordId = req.query.landlordId; // fallback if not valid ObjectId
      }
    }
    const props = await Property.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: props.length, properties: props });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error.' }); }
});

// GET single property
router.get('/:id', async (req, res) => {
  try {
    const prop = await Property.findById(req.params.id);
    if (!prop) return res.status(404).json({ success: false, message: 'Property not found.' });
    res.json({ success: true, property: prop });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// POST create property (landlord)
router.post('/', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin) return res.status(403).json({ success: false, message: 'Admin cannot add properties.' });
    if (req.user.role !== 'landlord') return res.status(403).json({ success: false, message: 'Only landlords can add properties.' });

    const prop = await Property.create({
      ...req.body,
      landlordId:   req.user._id,
      landlordName: req.user.name,
    });
    res.status(201).json({ success: true, property: prop });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error.' }); }
});

// PUT update property
router.put('/:id', protect, async (req, res) => {
  try {
    const prop = await Property.findById(req.params.id);
    if (!prop) return res.status(404).json({ success: false, message: 'Not found.' });
    if (!req.user?.isAdmin && prop.landlordId.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    const updated = await Property.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, property: updated });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// PUT save 3D model config
router.put('/:id/model3d', protect, async (req, res) => {
  try {
    const prop = await Property.findByIdAndUpdate(
      req.params.id, { model3d: req.body }, { new: true }
    );
    res.json({ success: true, property: prop });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// PUT save furniture layout
router.put('/:id/furniture', protect, async (req, res) => {
  try {
    const prop = await Property.findById(req.params.id);
    if (!prop) return res.status(404).json({ success: false, message: 'Not found.' });
    prop.furnitureLayout = req.body;
    prop.markModified('furnitureLayout');
    await prop.save();
    res.json({ success: true, property: prop });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// DELETE property
router.delete('/:id', protect, async (req, res) => {
  try {
    const prop = await Property.findById(req.params.id);
    if (!prop) return res.status(404).json({ success: false, message: 'Not found.' });
    if (!req.user?.isAdmin && prop.landlordId.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    await Property.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Property deleted.' });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = router;
