// ═══════════════════════════════════════════════════════════════
//  Property Routes  —  /api/properties
//  Landlords manage their listings; tenants and admin can view
// ═══════════════════════════════════════════════════════════════

const express  = require('express');
const mongoose = require('mongoose');
const Property = require('../models/Property');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// ── Helper: safely cast a string to MongoDB ObjectId ────────────
// Returns the ObjectId on success, or the raw string as fallback
function toObjectId(value) {
  try {
    return new mongoose.Types.ObjectId(value);
  } catch {
    return value; // fallback if not a valid ObjectId string
  }
}

// ── GET /api/properties/my ───────────────────────────────────────
// Return only the properties owned by the logged-in landlord
// Uses JWT identity — no landlordId needed in the URL
router.get('/my', protect, async (req, res) => {
  try {
    const props = await Property
      .find({ landlordId: req.user._id })
      .sort({ createdAt: -1 });

    res.json({ success: true, count: props.length, properties: props });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── GET /api/properties ──────────────────────────────────────────
// Public listing — supports optional query filters:
//   ?status, ?area, ?type, ?beds, ?maxRent, ?landlordId
router.get('/', async (req, res) => {
  try {
    const filter = {};

    // Simple equality filters
    if (req.query.status) filter.status = req.query.status;
    if (req.query.area)   filter.area   = req.query.area;
    if (req.query.type)   filter.type   = req.query.type;

    // Numeric range filters
    if (req.query.beds)    filter.beds = { $gte: Number(req.query.beds) };
    if (req.query.maxRent) filter.rent = { $lte: Number(req.query.maxRent) };

    // landlordId needs ObjectId cast for MongoDB comparison
    if (req.query.landlordId) {
      filter.landlordId = toObjectId(req.query.landlordId);
    }

    const props = await Property.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, count: props.length, properties: props });

  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── GET /api/properties/:id ──────────────────────────────────────
// Retrieve a single property by its MongoDB ID
router.get('/:id', async (req, res) => {
  try {
    const prop = await Property.findById(req.params.id);

    if (!prop)
      return res.status(404).json({ success: false, message: 'Property not found.' });

    res.json({ success: true, property: prop });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── POST /api/properties ─────────────────────────────────────────
// Create a new property listing (landlords only)
router.post('/', protect, async (req, res) => {
  try {
    // Only landlords may create listings
    if (req.user?.isAdmin)
      return res.status(403).json({ success: false, message: 'Admin cannot add properties.' });

    if (req.user.role !== 'landlord')
      return res.status(403).json({ success: false, message: 'Only landlords can add properties.' });

    const prop = await Property.create({
      ...req.body,
      landlordId:   req.user._id,
      landlordName: req.user.name,
    });

    res.status(201).json({ success: true, property: prop });

  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── PUT /api/properties/:id ──────────────────────────────────────
// Update a property — owner landlord or admin only
router.put('/:id', protect, async (req, res) => {
  try {
    const prop = await Property.findById(req.params.id);

    if (!prop)
      return res.status(404).json({ success: false, message: 'Not found.' });

    // Authorization: must be the owning landlord or admin
    const isOwner = prop.landlordId.toString() === req.user._id.toString();
    if (!req.user?.isAdmin && !isOwner)
      return res.status(403).json({ success: false, message: 'Not authorized.' });

    const updated = await Property.findByIdAndUpdate(req.params.id, req.body, { new: true });

    res.json({ success: true, property: updated });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── PUT /api/properties/:id/model3d ─────────────────────────────
// Save the 3D model configuration for a property
router.put('/:id/model3d', protect, async (req, res) => {
  try {
    const prop = await Property.findByIdAndUpdate(
      req.params.id,
      { model3d: req.body },
      { new: true }
    );

    res.json({ success: true, property: prop });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── PUT /api/properties/:id/furniture/landlord ───────────────────
// Save the landlord's furniture layout for a property
router.put('/:id/furniture/landlord', protect, async (req, res) => {
  try {
    const prop = await Property.findById(req.params.id);

    if (!prop)
      return res.status(404).json({ success: false, message: 'Not found.' });

    prop.landlordFurnitureLayout = req.body;
    prop.markModified('landlordFurnitureLayout');
    await prop.save();

    res.json({ success: true, property: prop });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── PUT /api/properties/:id/furniture/tenant ────────────────────
// Save the tenant's furniture layout for a property
router.put('/:id/furniture/tenant', protect, async (req, res) => {
  try {
    const prop = await Property.findById(req.params.id);

    if (!prop)
      return res.status(404).json({ success: false, message: 'Not found.' });

    prop.tenantFurnitureLayout = req.body;
    prop.markModified('tenantFurnitureLayout');
    await prop.save();

    res.json({ success: true, property: prop });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── PUT /api/properties/:id/furniture ───────────────────────────
// Save furniture layout — legacy endpoint kept for compatibility
router.put('/:id/furniture', protect, async (req, res) => {
  try {
    const prop = await Property.findById(req.params.id);

    if (!prop)
      return res.status(404).json({ success: false, message: 'Not found.' });

    prop.furnitureLayout = req.body;
    prop.markModified('furnitureLayout');
    await prop.save();

    res.json({ success: true, property: prop });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── DELETE /api/properties/:id ───────────────────────────────────
// Delete a property — owner landlord or admin only
router.delete('/:id', protect, async (req, res) => {
  try {
    const prop = await Property.findById(req.params.id);

    if (!prop)
      return res.status(404).json({ success: false, message: 'Not found.' });

    // Authorization: must be the owning landlord or admin
    const isOwner = prop.landlordId.toString() === req.user._id.toString();
    if (!req.user?.isAdmin && !isOwner)
      return res.status(403).json({ success: false, message: 'Not authorized.' });

    await Property.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Property deleted.' });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
