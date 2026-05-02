// ═══════════════════════════════════════════════════════════════
//  Property Model  —  TMS
//  Represents a rental property listing created by a landlord.
//  Supports 3D model configuration and per-role furniture layouts.
//
//  Status values:
//    available  — listed and open for tenants to view / request
//    rented     — currently assigned to a tenant
//    suspended  — hidden by admin (policy review or violation)
//
//  Design notes:
//    - landlordName is denormalised so listing cards render without
//      an extra populate() call and survive landlord deletion.
//    - tenantId / tenantName are null until a lease is signed;
//      they are set when a rental request is accepted.
//    - model3d is an embedded sub-document (not a ref) so the full
//      3D configuration is always included in a single property query.
//    - furnitureLayout (legacy), landlordFurnitureLayout, and
//      tenantFurnitureLayout are Mixed type; always call
//      prop.markModified('fieldName') before save() because Mongoose
//      cannot detect mutations inside Mixed fields automatically.
//    - images is a plain string array — URL overhead is minimal
//      and no sub-document is needed.
// ═══════════════════════════════════════════════════════════════

'use strict';

const mongoose = require('mongoose');

// ── Schema constants ──────────────────────────────────────────
const PROPERTY_TYPES    = ['House', 'Flat', 'Apartment', 'Villa', 'Room'];
const PROPERTY_STATUSES = ['available', 'rented', 'suspended'];
const MODEL3D_TYPES     = ['standard', 'villa', 'apartment', 'bungalow'];

// ── Schema ────────────────────────────────────────────────────
const propertySchema = new mongoose.Schema(
  {
    // ── Basic info ────────────────────────────────────────────
    title: {
      type:     String,
      required: true,
      trim:     true,
    },
    type: {
      type:    String,
      enum:    PROPERTY_TYPES,
      default: 'House',
    },
    area:    { type: String, required: true },  // neighbourhood / sector
    address: { type: String, required: true },  // full street address
    city:    { type: String, default: 'Lahore' },

    // ── Pricing & size ────────────────────────────────────────
    rent:  { type: Number, required: true }, // monthly rent in PKR
    beds:  { type: Number, default: 2 },
    baths: { type: Number, default: 1 },
    sqft:  { type: Number, default: 1000 },

    description: { type: String, default: '' },

    status: {
      type:    String,
      enum:    PROPERTY_STATUSES,
      default: 'available',
    },

    // ── Ownership ─────────────────────────────────────────────
    landlordId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    // Cached to avoid populate() on listing renders
    landlordName: { type: String, default: '' },

    // ── Assigned tenant ───────────────────────────────────────
    tenantId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    tenantName: { type: String, default: '' },

    // ── 3D model configuration ────────────────────────────────
    // Embedded sub-document — always retrieved with the property.
    model3d: {
      houseType:  { type: String, enum: MODEL3D_TYPES, default: 'standard' },
      wallColor:  { type: String, default: '#8B7355' },
      roofColor:  { type: String, default: '#5C3A1E' },
      floorColor: { type: String, default: '#D2B48C' },
      floors:     { type: Number, default: 1 },
      hasGarden:  { type: Boolean, default: false },
      hasPool:    { type: Boolean, default: false },
      hasGarage:  { type: Boolean, default: false },
    },

    // ── Furniture layouts (Mixed) ─────────────────────────────
    // Free-form JSON from the 3D placement tool.
    // Call markModified('fieldName') before save() after any mutation.
    furnitureLayout:         { type: mongoose.Schema.Types.Mixed, default: {} }, // legacy
    landlordFurnitureLayout: { type: mongoose.Schema.Types.Mixed, default: {} },
    tenantFurnitureLayout:   { type: mongoose.Schema.Types.Mixed, default: {} },

    // ── Images ────────────────────────────────────────────────
    images: [String],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Property', propertySchema);
