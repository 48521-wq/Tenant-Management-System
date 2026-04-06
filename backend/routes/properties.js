// ═══════════════════════════════════════════════════════════════
//  Property Routes  —  /api/properties
//  Landlords create and manage their rental listings.
//  Tenants and the general public can browse listings.
//  Admin can view, edit, and remove any property.
//
//  Route overview:
//    GET  /my                     — landlord's own listings (auth)
//    GET  /                       — public listing with filters
//    GET  /:id                    — single property (public)
//    POST /                       — create listing (landlord only)
//    PUT  /:id                    — update property (owner or admin)
//    PUT  /:id/model3d            — save 3D config (authenticated)
//    PUT  /:id/furniture/landlord — save landlord layout (auth)
//    PUT  /:id/furniture/tenant   — save tenant layout (auth)
//    PUT  /:id/furniture          — legacy layout save (auth)
//    DELETE /:id                  — delete property (owner or admin)
//
//  Base path: /api/properties
// ═══════════════════════════════════════════════════════════════

const express  = require('express');
const mongoose = require('mongoose');
const Property = require('../models/Property');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// ── Helper: safely cast a string to MongoDB ObjectId ─────────────
// MongoDB stores IDs as ObjectId — query string values arrive as
// plain strings and must be cast before use in a filter.
// Falls back to the raw string if the value is not a valid ObjectId.
//
// @param {string} value - query string value to cast
// @returns {mongoose.Types.ObjectId|string}
function toObjectId(value) {
  try {
    return new mongoose.Types.ObjectId(value);
  } catch {
    return value; // not a valid ObjectId — return as-is and let Mongoose handle it
  }
}

// ── GET /api/properties/my ───────────────────────────────────────
// Return only the properties owned by the currently logged-in landlord.
// Landlord identity comes from the JWT — no landlordId in the URL
// means a landlord cannot accidentally fetch another landlord's listings.
router.get('/my', protect, async (req, res) => {
  try {
    const props = await Property
      .find({ landlordId: req.user._id })
      .sort({ createdAt: -1 }); // newest listing first

    res.json({ success: true, count: props.length, properties: props });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── GET /api/properties ──────────────────────────────────────────
// Public listing endpoint — no authentication required.
// Supports optional query filters to narrow results:
//   ?status=available      — filter by availability status
//   ?area=DHA              — filter by area name
//   ?type=Apartment        — filter by property type
//   ?beds=2                — minimum number of bedrooms ($gte)
//   ?maxRent=50000         — maximum monthly rent ($lte)
//   ?landlordId=<objectId> — show listings from a specific landlord
router.get('/', async (req, res) => {
  try {
    const filter = {};

    // Equality filters — exact string match
    if (req.query.status) filter.status = req.query.status;
    if (req.query.area)   filter.area   = req.query.area;
    if (req.query.type)   filter.type   = req.query.type;

    // Range filters — convert query string numbers before using
    if (req.query.beds)    filter.beds = { $gte: Number(req.query.beds) };
    if (req.query.maxRent) filter.rent = { $lte: Number(req.query.maxRent) };

    // landlordId must be cast from string to ObjectId for Mongoose to match
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
// Retrieve a single property by its MongoDB ObjectId.
// Public — no authentication required. Used by the property detail
// view and by the 3D viewer when loading a specific listing.
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
// Create a new property listing (landlords only).
//
// landlordId and landlordName are taken from the verified JWT —
// the client cannot pass a different landlord ID in the request body.
// The spread operator copies all other property fields from req.body.
router.post('/', protect, async (req, res) => {
  try {
    // Admin accounts cannot create listings — this is a landlord action
    if (req.user?.isAdmin)
      return res.status(403).json({ success: false, message: 'Admin cannot add properties.' });

    // Tenants also cannot create listings — must be a landlord role
    if (req.user.role !== 'landlord')
      return res.status(403).json({ success: false, message: 'Only landlords can add properties.' });

    const prop = await Property.create({
      ...req.body,              // all fields from the form (title, rent, beds, etc.)
      landlordId:   req.user._id,   // overwrite any landlordId from body with real JWT identity
      landlordName: req.user.name,  // cached so dashboard does not need a separate join
    });

    res.status(201).json({ success: true, property: prop });

  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── PUT /api/properties/:id ──────────────────────────────────────
// Update a property's details (owning landlord or admin only).
//
// Authorization is checked manually: the owning landlord is the only
// regular user who can edit their own listing. Admin can edit any property.
// A different landlord cannot edit another landlord's listing.
router.put('/:id', protect, async (req, res) => {
  try {
    const prop = await Property.findById(req.params.id);

    if (!prop)
      return res.status(404).json({ success: false, message: 'Not found.' });

    // Compare MongoDB ObjectId as strings for reliable equality check
    const isOwner = prop.landlordId.toString() === req.user._id.toString();
    if (!req.user?.isAdmin && !isOwner)
      return res.status(403).json({ success: false, message: 'Not authorized.' });

    // { new: true } returns the updated document rather than the old one
    const updated = await Property.findByIdAndUpdate(req.params.id, req.body, { new: true });

    res.json({ success: true, property: updated });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── PUT /api/properties/:id/model3d ─────────────────────────────
// Save the 3D house model configuration for a property.
// The entire model3d sub-document is replaced with the request body.
// Called from the landlord dashboard 3D configurator panel.
router.put('/:id/model3d', protect, async (req, res) => {
  try {
    const prop = await Property.findByIdAndUpdate(
      req.params.id,
      { model3d: req.body }, // replace the whole model3d object
      { new: true }
    );

    res.json({ success: true, property: prop });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── PUT /api/properties/:id/furniture/landlord ───────────────────
// Save the landlord's furniture placement layout for a property.
//
// Landlord and tenant each have a separate layout so they can
// independently arrange furniture without overwriting each other.
// markModified() is required for Mixed-type fields in Mongoose —
// without it Mongoose does not detect the change and skips the save.
router.put('/:id/furniture/landlord', protect, async (req, res) => {
  try {
    const prop = await Property.findById(req.params.id);

    if (!prop)
      return res.status(404).json({ success: false, message: 'Not found.' });

    prop.landlordFurnitureLayout = req.body;
    prop.markModified('landlordFurnitureLayout'); // required for Mixed schema type
    await prop.save();

    res.json({ success: true, property: prop });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── PUT /api/properties/:id/furniture/tenant ────────────────────
// Save the tenant's furniture placement layout for a property.
// Same markModified() requirement as the landlord layout above.
router.put('/:id/furniture/tenant', protect, async (req, res) => {
  try {
    const prop = await Property.findById(req.params.id);

    if (!prop)
      return res.status(404).json({ success: false, message: 'Not found.' });

    prop.tenantFurnitureLayout = req.body;
    prop.markModified('tenantFurnitureLayout'); // required for Mixed schema type
    await prop.save();

    res.json({ success: true, property: prop });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── PUT /api/properties/:id/furniture ───────────────────────────
// Save furniture layout — legacy endpoint kept for backward compatibility.
// New code should use the /furniture/landlord or /furniture/tenant routes.
router.put('/:id/furniture', protect, async (req, res) => {
  try {
    const prop = await Property.findById(req.params.id);

    if (!prop)
      return res.status(404).json({ success: false, message: 'Not found.' });

    prop.furnitureLayout = req.body;
    prop.markModified('furnitureLayout'); // required for Mixed schema type
    await prop.save();

    res.json({ success: true, property: prop });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── DELETE /api/properties/:id ───────────────────────────────────
// Permanently delete a property listing (owning landlord or admin only).
//
// Same ownership check as PUT /:id — only the landlord who created
// the listing or an admin can remove it. Hard delete — cannot be undone.
router.delete('/:id', protect, async (req, res) => {
  try {
    const prop = await Property.findById(req.params.id);

    if (!prop)
      return res.status(404).json({ success: false, message: 'Not found.' });

    // Verify the caller owns this listing or is an admin
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
