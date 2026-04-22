// ============================================================
// TMS — Property Schema
// Covers listing info, 3D config, furniture layouts per role
// ============================================================
'use strict';

const mg = require('mongoose');

const Ref   = mg.Schema.Types.ObjectId;
const Mixed = mg.Schema.Types.Mixed;

/** Allowed property types */
const PROP_TYPES   = ['House', 'Flat', 'Apartment', 'Villa', 'Room'];

/** Allowed listing statuses */
const PROP_STATUSES = ['available', 'rented', 'suspended'];

/** Allowed 3D house types */
const HOUSE_TYPES  = ['standard', 'villa', 'apartment', 'bungalow'];

const tmsPropertySchema = new mg.Schema(
  {
    // ── Listing Details ────────────────────────────────────
    title:       { type: String, required: true,  trim: true },
    type:        { type: String, default: 'House', enum: PROP_TYPES },
    area:        { type: String, required: true },
    address:     { type: String, required: true },
    city:        { type: String, default: 'Lahore' },
    rent:        { type: Number, required: true },
    beds:        { type: Number, default: 2 },
    baths:       { type: Number, default: 1 },
    sqft:        { type: Number, default: 1000 },
    description: { type: String, default: '' },
    status:      { type: String, default: 'available', enum: PROP_STATUSES },

    // ── Landlord ───────────────────────────────────────────
    landlordId:   { type: Ref,    ref: 'User', required: true },
    landlordName: { type: String, default: '' },

    // ── Tenant ─────────────────────────────────────────────
    tenantId:   { type: Ref,    ref: 'User', default: null },
    tenantName: { type: String, default: '' },

    // ── 3D Visual Config ───────────────────────────────────
    model3d: {
      houseType:  { type: String,  default: 'standard', enum: HOUSE_TYPES },
      wallColor:  { type: String,  default: '#8B7355' },
      roofColor:  { type: String,  default: '#5C3A1E' },
      floorColor: { type: String,  default: '#D2B48C' },
      floors:     { type: Number,  default: 1 },
      hasGarden:  { type: Boolean, default: false },
      hasPool:    { type: Boolean, default: false },
      hasGarage:  { type: Boolean, default: false },
    },

    // ── Furniture Layouts ──────────────────────────────────
    furnitureLayout:         { type: Mixed, default: {} }, // legacy
    landlordFurnitureLayout: { type: Mixed, default: {} },
    tenantFurnitureLayout:   { type: Mixed, default: {} },

    images: [String],
  },
  { timestamps: true }
);

module.exports = mg.model('Property', tmsPropertySchema);
