const express  = require('express');
const Property = require('../models/Property');
const { protect, adminOnly } = require('../middleware/auth');

// Router instance for property endpoints
const propertyRouter = express.Router();

// GET landlord's OWN properties (uses JWT — no ID needed in URL)
propertyRouter.get('/my', protect, async (req, res) => {
  try {
    const ownProperties = await Property.find({ landlordId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, count: ownProperties.length, properties: ownProperties });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// GET all properties (public / admin)
propertyRouter.get('/', async (req, res) => {
  try {
    const queryFilter = {};
    if (req.query.status)     queryFilter.status = req.query.status;
    if (req.query.area)       queryFilter.area   = req.query.area;
    if (req.query.type)       queryFilter.type   = req.query.type;
    if (req.query.beds)       queryFilter.beds   = { $gte: Number(req.query.beds) };
    if (req.query.maxRent)    queryFilter.rent   = { $lte: Number(req.query.maxRent) };
    if (req.query.landlordId) {
      const mongoose = require('mongoose');
      try {
        queryFilter.landlordId = new mongoose.Types.ObjectId(req.query.landlordId);
      } catch {
        queryFilter.landlordId = req.query.landlordId;
      }
    }
    const allProperties = await Property.find(queryFilter).sort({ createdAt: -1 });
    res.json({ success: true, count: allProperties.length, properties: allProperties });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error.' }); }
});

// GET single property by ID
propertyRouter.get('/:id', async (req, res) => {
  try {
    const singleProperty = await Property.findById(req.params.id);
    if (!singleProperty) return res.status(404).json({ success: false, message: 'Property not found.' });
    res.json({ success: true, property: singleProperty });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// POST create property (landlord only)
propertyRouter.post('/', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin) return res.status(403).json({ success: false, message: 'Admin cannot add properties.' });
    if (req.user.role !== 'landlord') return res.status(403).json({ success: false, message: 'Only landlords can add properties.' });
    const createdProperty = await Property.create({
      ...req.body,
      landlordId:   req.user._id,
      landlordName: req.user.name,
    });
    res.status(201).json({ success: true, property: createdProperty });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error.' }); }
});

// PUT update property
propertyRouter.put('/:id', protect, async (req, res) => {
  try {
    const foundProperty = await Property.findById(req.params.id);
    if (!foundProperty) return res.status(404).json({ success: false, message: 'Not found.' });
    if (!req.user?.isAdmin && foundProperty.landlordId.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    const updatedProperty = await Property.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, property: updatedProperty });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// PUT save 3D model config
propertyRouter.put('/:id/model3d', protect, async (req, res) => {
  try {
    const updatedModel = await Property.findByIdAndUpdate(
      req.params.id, { model3d: req.body }, { new: true }
    );
    res.json({ success: true, property: updatedModel });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// PUT save landlord furniture layout
propertyRouter.put('/:id/furniture/landlord', protect, async (req, res) => {
  try {
    const propRecord = await Property.findById(req.params.id);
    if (!propRecord) return res.status(404).json({ success: false, message: 'Not found.' });
    propRecord.landlordFurnitureLayout = req.body;
    propRecord.markModified('landlordFurnitureLayout');
    await propRecord.save();
    res.json({ success: true, property: propRecord });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// PUT save tenant furniture layout
propertyRouter.put('/:id/furniture/tenant', protect, async (req, res) => {
  try {
    const propRecord = await Property.findById(req.params.id);
    if (!propRecord) return res.status(404).json({ success: false, message: 'Not found.' });
    propRecord.tenantFurnitureLayout = req.body;
    propRecord.markModified('tenantFurnitureLayout');
    await propRecord.save();
    res.json({ success: true, property: propRecord });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// PUT save furniture layout (legacy support)
propertyRouter.put('/:id/furniture', protect, async (req, res) => {
  try {
    const propRecord = await Property.findById(req.params.id);
    if (!propRecord) return res.status(404).json({ success: false, message: 'Not found.' });
    propRecord.furnitureLayout = req.body;
    propRecord.markModified('furnitureLayout');
    await propRecord.save();
    res.json({ success: true, property: propRecord });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// DELETE property
propertyRouter.delete('/:id', protect, async (req, res) => {
  try {
    const propToDelete = await Property.findById(req.params.id);
    if (!propToDelete) return res.status(404).json({ success: false, message: 'Not found.' });
    if (!req.user?.isAdmin && propToDelete.landlordId.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    await Property.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Property deleted.' });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = propertyRouter;
