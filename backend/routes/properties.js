/**
 * @file properties.js
 * @route /api/properties
 * @description Property listing CRUD + 3D model & furniture layout saves.
 *
 * Route overview:
 *   GET  /my                     → landlord's own listings          (auth)
 *   GET  /                       → public listing with query filters (public)
 *   GET  /:id                    → single property detail           (public)
 *   POST /                       → create a listing                 (landlord)
 *   PUT  /:id                    → update listing details           (owner | admin)
 *   PUT  /:id/model3d            → save 3D house config             (auth)
 *   PUT  /:id/furniture/landlord → save landlord layout             (auth)
 *   PUT  /:id/furniture/tenant   → save tenant layout               (auth)
 *   PUT  /:id/furniture          → legacy layout save               (auth)
 *   DELETE /:id                  → delete listing                   (owner | admin)
 */

const express  = require('express');
const mongoose = require('mongoose');
const Property = require('../models/Property');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

/**
 * Safely casts a query-string value to a MongoDB ObjectId.
 * Query strings always arrive as plain strings; Mongoose needs ObjectId
 * instances for _id / ref field comparisons to work correctly.
 * Falls back to the raw string if the value is not a valid ObjectId —
 * Mongoose will then return no results (which is the correct behaviour).
 *
 * @param {string} rawValue - Query-string segment to cast
 * @returns {mongoose.Types.ObjectId|string}
 */
function castToObjectId(rawValue) {
  try {
    return new mongoose.Types.ObjectId(rawValue);
  } catch {
    return rawValue; // let Mongoose handle the mismatch — it will match nothing
  }
}

// ─────────────────────────────────────────────────────────────────
// GET /api/properties/my
// ─────────────────────────────────────────────────────────────────
/**
 * Returns only the listings owned by the currently logged-in landlord.
 * The landlord ID comes from the verified JWT — no client-supplied ID is trusted.
 *
 * @middleware protect - Valid JWT required
 * @returns {200} { success, count, properties }
 * @returns {500} Unexpected server error
 */
router.get('/my', protect, async (req, res) => {
  try {
    const ownListings = await Property
      .find({ landlordId: req.user._id })
      .sort({ createdAt: -1 }); // newest listing first

    res.json({ success: true, count: ownListings.length, properties: ownListings });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/properties
// ─────────────────────────────────────────────────────────────────
/**
 * Public listing endpoint — no authentication required.
 * Supports optional query-string filters:
 *   ?status=available      → exact match on availability status
 *   ?area=DHA              → exact match on area name
 *   ?type=Apartment        → exact match on property type
 *   ?beds=2                → minimum bedroom count ($gte)
 *   ?maxRent=50000         → maximum monthly rent in PKR ($lte)
 *   ?landlordId=<objectId> → listings from a specific landlord
 *
 * @returns {200} { success, count, properties }
 * @returns {500} Unexpected server error
 */
router.get('/', async (req, res) => {
  try {
    const queryFilter = {};

    // Equality filters — direct string match against stored values
    if (req.query.status) queryFilter.status = req.query.status;
    if (req.query.area)   queryFilter.area   = req.query.area;
    if (req.query.type)   queryFilter.type   = req.query.type;

    // Numeric range filters — cast from string first
    if (req.query.beds)    queryFilter.beds = { $gte: Number(req.query.beds) };
    if (req.query.maxRent) queryFilter.rent = { $lte: Number(req.query.maxRent) };

    // landlordId must be an ObjectId for Mongoose to match the ref field
    if (req.query.landlordId)
      queryFilter.landlordId = castToObjectId(req.query.landlordId);

    const listings = await Property.find(queryFilter).sort({ createdAt: -1 });

    res.json({ success: true, count: listings.length, properties: listings });

  } catch (err) {
    console.error('Properties list error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/properties/:id
// ─────────────────────────────────────────────────────────────────
/**
 * Retrieves a single property by its MongoDB ObjectId.
 * Public — no authentication required.
 * Used by the property detail view and the 3D viewer.
 *
 * @returns {200} { success, property }
 * @returns {404} Property not found
 * @returns {500} Unexpected server error
 */
router.get('/:id', async (req, res) => {
  try {
    const foundProperty = await Property.findById(req.params.id);

    if (!foundProperty)
      return res.status(404).json({ success: false, message: 'Property not found.' });

    res.json({ success: true, property: foundProperty });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/properties
// ─────────────────────────────────────────────────────────────────
/**
 * Creates a new property listing (landlords only).
 * landlordId and landlordName are taken from the verified JWT —
 * the client cannot inject a different landlord identity in the body.
 *
 * @middleware protect - Valid JWT required
 * @returns {201} { success, property }
 * @returns {403} Caller is admin or not a landlord
 * @returns {500} Unexpected server error
 */
router.post('/', protect, async (req, res) => {
  try {
    // Admin accounts cannot create listings — this is a landlord action
    if (req.user?.isAdmin)
      return res.status(403).json({ success: false, message: 'Admin cannot add properties.' });

    // Tenant role is also blocked — must be landlord
    if (req.user.role !== 'landlord')
      return res.status(403).json({ success: false, message: 'Only landlords can add properties.' });

    const createdProperty = await Property.create({
      ...req.body,                    // spread all client-supplied fields (title, rent, beds …)
      landlordId:   req.user._id,    // overwrite any spoofed landlordId from the body
      landlordName: req.user.name,   // cached so cards render without a populate() join
    });

    res.status(201).json({ success: true, property: createdProperty });

  } catch (err) {
    console.error('Create property error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// PUT /api/properties/:id
// ─────────────────────────────────────────────────────────────────
/**
 * Updates a property's core details (owning landlord or admin only).
 * Ownership is checked manually: ObjectIds are compared as strings to
 * avoid type-mismatch false negatives.
 * A landlord who does not own the listing receives 403.
 *
 * @middleware protect - Valid JWT required
 * @returns {200} { success, property }
 * @returns {403} Not the owner and not an admin
 * @returns {404} Property not found
 * @returns {500} Unexpected server error
 */
router.put('/:id', protect, async (req, res) => {
  try {
    const targetProperty = await Property.findById(req.params.id);

    if (!targetProperty)
      return res.status(404).json({ success: false, message: 'Not found.' });

    // Compare as strings — ObjectId strict-equality fails across Mongoose instances
    const callerIsOwner = targetProperty.landlordId.toString() === req.user._id.toString();
    if (!req.user?.isAdmin && !callerIsOwner)
      return res.status(403).json({ success: false, message: 'Not authorized.' });

    // { new: true } returns the post-update document
    const updatedProperty = await Property.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json({ success: true, property: updatedProperty });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// PUT /api/properties/:id/model3d
// ─────────────────────────────────────────────────────────────────
/**
 * Saves the 3D house model configuration for a property.
 * The entire model3d sub-document is replaced with the request body.
 * Called from the landlord dashboard 3D configurator panel.
 *
 * @middleware protect - Valid JWT required
 * @returns {200} { success, property }
 * @returns {500} Unexpected server error
 */
router.put('/:id/model3d', protect, async (req, res) => {
  try {
    const updatedProperty = await Property.findByIdAndUpdate(
      req.params.id,
      { model3d: req.body }, // full replacement of the model3d sub-document
      { new: true }
    );

    res.json({ success: true, property: updatedProperty });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// PUT /api/properties/:id/furniture/landlord
// ─────────────────────────────────────────────────────────────────
/**
 * Saves the landlord's furniture placement layout for a property.
 * Landlord and tenant each maintain independent layouts so they can
 * rearrange furniture without overwriting each other's configuration.
 *
 * Note: markModified() is mandatory for Mixed-type Mongoose fields.
 * Without it, Mongoose skips the save because it cannot detect the change.
 *
 * @middleware protect - Valid JWT required
 * @returns {200} { success, property }
 * @returns {404} Property not found
 * @returns {500} Unexpected server error
 */
router.put('/:id/furniture/landlord', protect, async (req, res) => {
  try {
    const targetProperty = await Property.findById(req.params.id);

    if (!targetProperty)
      return res.status(404).json({ success: false, message: 'Not found.' });

    targetProperty.landlordFurnitureLayout = req.body;
    targetProperty.markModified('landlordFurnitureLayout'); // required for Mixed schema type
    await targetProperty.save();

    res.json({ success: true, property: targetProperty });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// PUT /api/properties/:id/furniture/tenant
// ─────────────────────────────────────────────────────────────────
/**
 * Saves the tenant's furniture placement layout for a property.
 * Independent of the landlord layout — same markModified() requirement.
 *
 * @middleware protect - Valid JWT required
 * @returns {200} { success, property }
 * @returns {404} Property not found
 * @returns {500} Unexpected server error
 */
router.put('/:id/furniture/tenant', protect, async (req, res) => {
  try {
    const targetProperty = await Property.findById(req.params.id);

    if (!targetProperty)
      return res.status(404).json({ success: false, message: 'Not found.' });

    targetProperty.tenantFurnitureLayout = req.body;
    targetProperty.markModified('tenantFurnitureLayout'); // required for Mixed schema type
    await targetProperty.save();

    res.json({ success: true, property: targetProperty });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// PUT /api/properties/:id/furniture  (legacy)
// ─────────────────────────────────────────────────────────────────
/**
 * Legacy furniture layout endpoint — kept for backward compatibility.
 * New clients should use /furniture/landlord or /furniture/tenant instead.
 *
 * @middleware protect - Valid JWT required
 * @returns {200} { success, property }
 * @returns {404} Property not found
 * @returns {500} Unexpected server error
 */
router.put('/:id/furniture', protect, async (req, res) => {
  try {
    const targetProperty = await Property.findById(req.params.id);

    if (!targetProperty)
      return res.status(404).json({ success: false, message: 'Not found.' });

    targetProperty.furnitureLayout = req.body;
    targetProperty.markModified('furnitureLayout'); // required for Mixed schema type
    await targetProperty.save();

    res.json({ success: true, property: targetProperty });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// DELETE /api/properties/:id
// ─────────────────────────────────────────────────────────────────
/**
 * Permanently deletes a property listing (owning landlord or admin only).
 * Same ownership check as PUT /:id — only the creating landlord or an
 * admin may remove it. Hard delete — this cannot be undone.
 *
 * @middleware protect - Valid JWT required
 * @returns {200} { success, message }
 * @returns {403} Not the owner and not an admin
 * @returns {404} Property not found
 * @returns {500} Unexpected server error
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const targetProperty = await Property.findById(req.params.id);

    if (!targetProperty)
      return res.status(404).json({ success: false, message: 'Not found.' });

    const callerIsOwner = targetProperty.landlordId.toString() === req.user._id.toString();
    if (!req.user?.isAdmin && !callerIsOwner)
      return res.status(403).json({ success: false, message: 'Not authorized.' });

    await Property.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Property deleted.' });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
