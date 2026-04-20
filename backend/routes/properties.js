// ============================================================
// TMS Property Routes — CRUD + furniture & 3D model config
// ============================================================
const express    = require('express');
const Property   = require('../models/Property');
const { protect, adminOnly } = require('../middleware/auth');

const propRouter = express.Router();

// ─── GET /my — landlord fetches their own properties ─────────
propRouter.get('/my', protect, async (req, res) => {
  try {
    const landlordProps = await Property
      .find({ landlordId: req.user._id })
      .sort({ createdAt: -1 });
    res.json({ success: true, count: landlordProps.length, properties: landlordProps });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── GET / — fetch all properties with optional filters ──────
propRouter.get('/', async (req, res) => {
  try {
    const dbFilter = {};
    if (req.query.status)     dbFilter.status = req.query.status;
    if (req.query.area)       dbFilter.area   = req.query.area;
    if (req.query.type)       dbFilter.type   = req.query.type;
    if (req.query.beds)       dbFilter.beds   = { $gte: Number(req.query.beds) };
    if (req.query.maxRent)    dbFilter.rent   = { $lte: Number(req.query.maxRent) };
    if (req.query.landlordId) {
      const mongoose = require('mongoose');
      try {
        dbFilter.landlordId = new mongoose.Types.ObjectId(req.query.landlordId);
      } catch {
        dbFilter.landlordId = req.query.landlordId;
      }
    }
    const propList = await Property.find(dbFilter).sort({ createdAt: -1 });
    res.json({ success: true, count: propList.length, properties: propList });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── GET /:id — single property by ID ────────────────────────
propRouter.get('/:id', async (req, res) => {
  try {
    const targetProp = await Property.findById(req.params.id);
    if (!targetProp)
      return res.status(404).json({ success: false, message: 'Property not found.' });
    res.json({ success: true, property: targetProp });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── POST / — create a new property (landlord only) ──────────
propRouter.post('/', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin)
      return res.status(403).json({ success: false, message: 'Admin cannot add properties.' });
    if (req.user.role !== 'landlord')
      return res.status(403).json({ success: false, message: 'Only landlords can add properties.' });
    const savedProp = await Property.create({
      ...req.body,
      landlordId:   req.user._id,
      landlordName: req.user.name,
    });
    res.status(201).json({ success: true, property: savedProp });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── PUT /:id — update property details ──────────────────────
propRouter.put('/:id', protect, async (req, res) => {
  try {
    const existingProp = await Property.findById(req.params.id);
    if (!existingProp)
      return res.status(404).json({ success: false, message: 'Not found.' });
    if (!req.user?.isAdmin && existingProp.landlordId.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    const patchedProp = await Property.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, property: patchedProp });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── PUT /:id/model3d — save 3D model config ─────────────────
propRouter.put('/:id/model3d', protect, async (req, res) => {
  try {
    const modelUpdated = await Property.findByIdAndUpdate(
      req.params.id,
      { model3d: req.body },
      { new: true }
    );
    res.json({ success: true, property: modelUpdated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── PUT /:id/furniture/landlord — save landlord layout ──────
propRouter.put('/:id/furniture/landlord', protect, async (req, res) => {
  try {
    const lProp = await Property.findById(req.params.id);
    if (!lProp)
      return res.status(404).json({ success: false, message: 'Not found.' });
    lProp.landlordFurnitureLayout = req.body;
    lProp.markModified('landlordFurnitureLayout');
    await lProp.save();
    res.json({ success: true, property: lProp });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── PUT /:id/furniture/tenant — save tenant layout ──────────
propRouter.put('/:id/furniture/tenant', protect, async (req, res) => {
  try {
    const tProp = await Property.findById(req.params.id);
    if (!tProp)
      return res.status(404).json({ success: false, message: 'Not found.' });
    tProp.tenantFurnitureLayout = req.body;
    tProp.markModified('tenantFurnitureLayout');
    await tProp.save();
    res.json({ success: true, property: tProp });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── PUT /:id/furniture — legacy furniture save ───────────────
propRouter.put('/:id/furniture', protect, async (req, res) => {
  try {
    const legacyProp = await Property.findById(req.params.id);
    if (!legacyProp)
      return res.status(404).json({ success: false, message: 'Not found.' });
    legacyProp.furnitureLayout = req.body;
    legacyProp.markModified('furnitureLayout');
    await legacyProp.save();
    res.json({ success: true, property: legacyProp });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── DELETE /:id — remove property ───────────────────────────
propRouter.delete('/:id', protect, async (req, res) => {
  try {
    const removeProp = await Property.findById(req.params.id);
    if (!removeProp)
      return res.status(404).json({ success: false, message: 'Not found.' });
    if (!req.user?.isAdmin && removeProp.landlordId.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    await Property.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Property deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = propRouter;
