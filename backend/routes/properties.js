// ============================================================
// TMS — Property Routes
// Handles CRUD, 3D model config, furniture layout saves
// ============================================================
'use strict';

const express    = require('express');
const Property   = require('../models/Property');
const { protect, adminOnly } = require('../middleware/auth');

const propertyRoutes = express.Router();

// ─── GET /my — landlord's own properties ─────────────────────
propertyRoutes.get('/my', protect, async (req, res) => {
  try {
    const myProps = await Property
      .find({ landlordId: req.user._id })
      .sort({ createdAt: -1 });
    return res.json({ success: true, count: myProps.length, properties: myProps });
  } catch (fetchErr) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── GET / — all properties with query filters ───────────────
propertyRoutes.get('/', async (req, res) => {
  try {
    const searchFilter = {};
    if (req.query.status)     searchFilter.status = req.query.status;
    if (req.query.area)       searchFilter.area   = req.query.area;
    if (req.query.type)       searchFilter.type   = req.query.type;
    if (req.query.beds)       searchFilter.beds   = { $gte: Number(req.query.beds) };
    if (req.query.maxRent)    searchFilter.rent   = { $lte: Number(req.query.maxRent) };
    if (req.query.landlordId) {
      const mongoose = require('mongoose');
      try {
        searchFilter.landlordId = new mongoose.Types.ObjectId(req.query.landlordId);
      } catch {
        searchFilter.landlordId = req.query.landlordId;
      }
    }
    const resultProps = await Property.find(searchFilter).sort({ createdAt: -1 });
    return res.json({ success: true, count: resultProps.length, properties: resultProps });
  } catch (listErr) {
    console.error(listErr);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── GET /:id — single property ──────────────────────────────
propertyRoutes.get('/:id', async (req, res) => {
  try {
    const oneProp = await Property.findById(req.params.id);
    if (!oneProp)
      return res.status(404).json({ success: false, message: 'Property not found.' });
    return res.json({ success: true, property: oneProp });
  } catch (getErr) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── POST / — landlord creates a property ────────────────────
propertyRoutes.post('/', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin)
      return res.status(403).json({ success: false, message: 'Admin cannot add properties.' });
    if (req.user.role !== 'landlord')
      return res.status(403).json({ success: false, message: 'Only landlords can add properties.' });
    const newProp = await Property.create({
      ...req.body,
      landlordId:   req.user._id,
      landlordName: req.user.name,
    });
    return res.status(201).json({ success: true, property: newProp });
  } catch (createErr) {
    console.error(createErr);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── PUT /:id — update property details ──────────────────────
propertyRoutes.put('/:id', protect, async (req, res) => {
  try {
    const currentProp = await Property.findById(req.params.id);
    if (!currentProp)
      return res.status(404).json({ success: false, message: 'Not found.' });
    if (!req.user?.isAdmin && currentProp.landlordId.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    const editedProp = await Property.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return res.json({ success: true, property: editedProp });
  } catch (updateErr) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── PUT /:id/model3d — save 3D config ───────────────────────
propertyRoutes.put('/:id/model3d', protect, async (req, res) => {
  try {
    const updated3d = await Property.findByIdAndUpdate(
      req.params.id,
      { model3d: req.body },
      { new: true }
    );
    return res.json({ success: true, property: updated3d });
  } catch (model3dErr) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── PUT /:id/furniture/landlord — landlord layout ───────────
propertyRoutes.put('/:id/furniture/landlord', protect, async (req, res) => {
  try {
    const llProp = await Property.findById(req.params.id);
    if (!llProp)
      return res.status(404).json({ success: false, message: 'Not found.' });
    llProp.landlordFurnitureLayout = req.body;
    llProp.markModified('landlordFurnitureLayout');
    await llProp.save();
    return res.json({ success: true, property: llProp });
  } catch (llErr) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── PUT /:id/furniture/tenant — tenant layout ───────────────
propertyRoutes.put('/:id/furniture/tenant', protect, async (req, res) => {
  try {
    const tlProp = await Property.findById(req.params.id);
    if (!tlProp)
      return res.status(404).json({ success: false, message: 'Not found.' });
    tlProp.tenantFurnitureLayout = req.body;
    tlProp.markModified('tenantFurnitureLayout');
    await tlProp.save();
    return res.json({ success: true, property: tlProp });
  } catch (tlErr) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── PUT /:id/furniture — legacy layout save ─────────────────
propertyRoutes.put('/:id/furniture', protect, async (req, res) => {
  try {
    const lgProp = await Property.findById(req.params.id);
    if (!lgProp)
      return res.status(404).json({ success: false, message: 'Not found.' });
    lgProp.furnitureLayout = req.body;
    lgProp.markModified('furnitureLayout');
    await lgProp.save();
    return res.json({ success: true, property: lgProp });
  } catch (lgErr) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── DELETE /:id — remove property ───────────────────────────
propertyRoutes.delete('/:id', protect, async (req, res) => {
  try {
    const delProp = await Property.findById(req.params.id);
    if (!delProp)
      return res.status(404).json({ success: false, message: 'Not found.' });
    if (!req.user?.isAdmin && delProp.landlordId.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    await Property.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Property deleted.' });
  } catch (delErr) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = propertyRoutes;
