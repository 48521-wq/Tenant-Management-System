/**
 * @file properties.js
 * @route /api/properties
 * @description Property listing CRUD + 3D model & furniture layout routes.
 *
 * Route overview:
 *   GET  /my                      — landlord's own listings         (auth)
 *   GET  /                        — public listing with filters     (public)
 *   GET  /:id                     — single property detail          (public)
 *   POST /                        — create a listing                (landlord)
 *   PUT  /:id                     — update listing details          (owner | admin)
 *   PUT  /:id/model3d             — save 3D house config            (auth)
 *   PUT  /:id/furniture/landlord  — save landlord layout            (auth)
 *   PUT  /:id/furniture/tenant    — save tenant layout              (auth)
 *   PUT  /:id/furniture           — legacy layout save              (auth)
 *   DELETE /:id                   — delete listing                  (owner | admin)
 */

'use strict';

const express  = require('express');
const mongoose = require('mongoose');
const Property = require('../models/Property');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// ── HTTP status codes ──────────────────────────────────────────
const STATUS_CREATED      = 201;
const STATUS_FORBIDDEN    = 403;
const STATUS_NOT_FOUND    = 404;
const STATUS_SERVER_ERROR = 500;

// ── Helpers ────────────────────────────────────────────────────

/**
 * Safely casts a query-string value to a Mongoose ObjectId.
 * Returns the raw string on failure — Mongoose will then match nothing.
 *
 * @param {string} raw
 * @returns {mongoose.Types.ObjectId|string}
 */
function toObjectId(raw) {
  try {
    return new mongoose.Types.ObjectId(raw);
  } catch {
    return raw;
  }
}

// ── GET /api/properties/my ─────────────────────────────────────
/**
 * Returns listings owned by the logged-in landlord only.
 * landlordId is taken from the JWT — client cannot override it.
 *
 * @middleware protect
 * @returns {200} { success, count, properties }
 * @returns {500} Server error
 */
router.get('/my', protect, async (req, res) => {
  try {
    const listings = await Property
      .find({ landlordId: req.user._id })
      .sort({ createdAt: -1 });

    res.json({ success: true, count: listings.length, properties: listings });

  } catch (_err) {
    res.status(STATUS_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ── GET /api/properties ────────────────────────────────────────
/**
 * Public listing — no auth required.
 * Supported query filters:
 *   ?status, ?area, ?type   — exact match
 *   ?beds                   — minimum beds ($gte)
 *   ?maxRent                — maximum rent in PKR ($lte)
 *   ?landlordId             — filter by landlord ObjectId
 *
 * @returns {200} { success, count, properties }
 * @returns {500} Server error
 */
router.get('/', async (req, res) => {
  try {
    const filter = {};

    if (req.query.status) filter.status = req.query.status;
    if (req.query.area)   filter.area   = req.query.area;
    if (req.query.type)   filter.type   = req.query.type;

    if (req.query.beds)    filter.beds = { $gte: Number(req.query.beds) };
    if (req.query.maxRent) filter.rent = { $lte: Number(req.query.maxRent) };

    if (req.query.landlordId)
      filter.landlordId = toObjectId(req.query.landlordId);

    const listings = await Property.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, count: listings.length, properties: listings });

  } catch (err) {
    console.error('Properties list error:', err);
    res.status(STATUS_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ── GET /api/properties/:id ────────────────────────────────────
/**
 * Returns a single property by ObjectId. Public — no auth required.
 *
 * @returns {200} { success, property }
 * @returns {404} Not found
 * @returns {500} Server error
 */
router.get('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property)
      return res.status(STATUS_NOT_FOUND).json({ success: false, message: 'Property not found.' });

    res.json({ success: true, property });

  } catch (_err) {
    res.status(STATUS_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ── POST /api/properties ───────────────────────────────────────
/**
 * Creates a new property listing. Landlords only.
 * landlordId and landlordName are injected from the JWT.
 *
 * @middleware protect
 * @returns {201} { success, property }
 * @returns {403} Admin or non-landlord caller
 * @returns {500} Server error
 */
router.post('/', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin)
      return res.status(STATUS_FORBIDDEN).json({ success: false, message: 'Admin cannot add properties.' });

    if (req.user.role !== 'landlord')
      return res.status(STATUS_FORBIDDEN).json({ success: false, message: 'Only landlords can add properties.' });

    const property = await Property.create({
      ...req.body,
      landlordId:   req.user._id,
      landlordName: req.user.name,
    });

    res.status(STATUS_CREATED).json({ success: true, property });

  } catch (err) {
    console.error('Create property error:', err);
    res.status(STATUS_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ── PUT /api/properties/:id ────────────────────────────────────
/**
 * Updates a property's core details. Owner or admin only.
 *
 * @middleware protect
 * @returns {200} { success, property }
 * @returns {403} Not owner and not admin
 * @returns {404} Not found
 * @returns {500} Server error
 */
router.put('/:id', protect, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property)
      return res.status(STATUS_NOT_FOUND).json({ success: false, message: 'Not found.' });

    const isOwner = property.landlordId.toString() === req.user._id?.toString();
    if (!req.user?.isAdmin && !isOwner)
      return res.status(STATUS_FORBIDDEN).json({ success: false, message: 'Not authorized.' });

    const updated = await Property.findByIdAndUpdate(req.params.id, req.body, { new: true });

    res.json({ success: true, property: updated });

  } catch (_err) {
    res.status(STATUS_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ── PUT /api/properties/:id/model3d ───────────────────────────
/**
 * Replaces the 3D house model configuration sub-document.
 *
 * @middleware protect
 * @returns {200} { success, property }
 * @returns {500} Server error
 */
router.put('/:id/model3d', protect, async (req, res) => {
  try {
    const updated = await Property.findByIdAndUpdate(
      req.params.id,
      { model3d: req.body },
      { new: true }
    );

    res.json({ success: true, property: updated });

  } catch (_err) {
    res.status(STATUS_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ── PUT /api/properties/:id/furniture/landlord ────────────────
/**
 * Saves the landlord's furniture layout (Mixed field — markModified required).
 *
 * @middleware protect
 * @returns {200} { success, property }
 * @returns {404} Not found
 * @returns {500} Server error
 */
router.put('/:id/furniture/landlord', protect, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property)
      return res.status(STATUS_NOT_FOUND).json({ success: false, message: 'Not found.' });

    property.landlordFurnitureLayout = req.body;
    property.markModified('landlordFurnitureLayout');
    await property.save();

    res.json({ success: true, property });

  } catch (_err) {
    res.status(STATUS_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ── PUT /api/properties/:id/furniture/tenant ──────────────────
/**
 * Saves the tenant's furniture layout (Mixed field — markModified required).
 *
 * @middleware protect
 * @returns {200} { success, property }
 * @returns {404} Not found
 * @returns {500} Server error
 */
router.put('/:id/furniture/tenant', protect, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property)
      return res.status(STATUS_NOT_FOUND).json({ success: false, message: 'Not found.' });

    property.tenantFurnitureLayout = req.body;
    property.markModified('tenantFurnitureLayout');
    await property.save();

    res.json({ success: true, property });

  } catch (_err) {
    res.status(STATUS_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ── PUT /api/properties/:id/furniture (legacy) ────────────────
/**
 * Legacy furniture save — kept for backward compatibility.
 * Use /furniture/landlord or /furniture/tenant for new clients.
 *
 * @middleware protect
 * @returns {200} { success, property }
 * @returns {404} Not found
 * @returns {500} Server error
 */
router.put('/:id/furniture', protect, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property)
      return res.status(STATUS_NOT_FOUND).json({ success: false, message: 'Not found.' });

    property.furnitureLayout = req.body;
    property.markModified('furnitureLayout');
    await property.save();

    res.json({ success: true, property });

  } catch (_err) {
    res.status(STATUS_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

// ── DELETE /api/properties/:id ─────────────────────────────────
/**
 * Permanently deletes a property listing. Owner or admin only.
 *
 * @middleware protect
 * @returns {200} { success, message }
 * @returns {403} Not owner and not admin
 * @returns {404} Not found
 * @returns {500} Server error
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property)
      return res.status(STATUS_NOT_FOUND).json({ success: false, message: 'Not found.' });

    const isOwner = property.landlordId.toString() === req.user._id?.toString();
    if (!req.user?.isAdmin && !isOwner)
      return res.status(STATUS_FORBIDDEN).json({ success: false, message: 'Not authorized.' });

    await Property.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Property deleted.' });

  } catch (_err) {
    res.status(STATUS_SERVER_ERROR).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
