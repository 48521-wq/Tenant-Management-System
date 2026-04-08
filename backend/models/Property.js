// ═══════════════════════════════════════════════════════════════
//  Property Model  —  TMS
//  Represents a rental property listing created by a landlord.
//  Supports 3D model configuration and per-role furniture layouts.
//
//  Status values:
//    available  — listed and open for tenants to view / rent
//    rented     — currently occupied by a tenant
//    suspended  — hidden by admin (policy violation or review)
//
//  Key design decisions:
//    - landlordName is cached so property cards render without a
//      populate() call — survives landlord account deletion.
//    - tenantId / tenantName are null/empty until a tenant is
//      assigned. They are populated when a lease is signed.
//    - model3d is a nested sub-document (not a ref) so the 3D
//      configuration is always retrieved with the property in a
//      single query — no separate lookup needed.
//    - furnitureLayout (legacy), landlordFurnitureLayout, and
//      tenantFurnitureLayout are Mixed type so they can hold any
//      JSON object. markModified() must be called before save()
//      when these fields are updated, because Mongoose cannot
//      detect changes to Mixed fields automatically.
//    - images is a plain array of strings (URLs or paths).
//      No sub-document overhead needed for a simple string list.
// ═══════════════════════════════════════════════════════════════

const mongoose = require('mongoose');

// ── Schema definition ────────────────────────────────────────────
const propertySchema = new mongoose.Schema(
  {
    // ── Basic property info ──────────────────────────────────────
    // title is the display name shown on listing cards
    title: {
      type:     String,
      required: true,
      trim:     true,
    },
    // Property category — used for filtering in the public listing
    type: {
      type:    String,
      enum:    ['House', 'Flat', 'Apartment', 'Villa', 'Room'],
      default: 'House',
    },
    area:    { type: String, required: true },   // neighbourhood / sector
    address: { type: String, required: true },   // full street address
    city:    { type: String, default: 'Lahore' },

    // ── Pricing and size ─────────────────────────────────────────
    rent:  { type: Number, required: true },   // monthly rent in PKR
    beds:  { type: Number, default: 2 },
    baths: { type: Number, default: 1 },
    sqft:  { type: Number, default: 1000 },

    description: { type: String, default: '' },

    // Availability status — controls visibility in tenant search
    status: {
      type:    String,
      enum:    ['available', 'rented', 'suspended'],
      default: 'available',
    },

    // ── Ownership ────────────────────────────────────────────────
    // landlordId is required — a property must have an owner
    landlordId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    // landlordName cached for display without populate()
    landlordName: { type: String, default: '' },

    // ── Assigned tenant ──────────────────────────────────────────
    // null until a lease is signed and a tenant is assigned
    tenantId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    tenantName: { type: String, default: '' },

    // ── 3D Model Configuration ───────────────────────────────────
    // Stored as a nested sub-document — always fetched with the property.
    // Saved via PUT /api/properties/:id/model3d (replaces whole object).
    model3d: {
      houseType:  { type: String, enum: ['standard', 'villa', 'apartment', 'bungalow'], default: 'standard' },
      wallColor:  { type: String, default: '#8B7355' },  // hex color string
      roofColor:  { type: String, default: '#5C3A1E' },
      floorColor: { type: String, default: '#D2B48C' },
      floors:     { type: Number, default: 1 },
      hasGarden:  { type: Boolean, default: false },
      hasPool:    { type: Boolean, default: false },
      hasGarage:  { type: Boolean, default: false },
    },

    // ── Furniture Layouts (Mixed type) ───────────────────────────
    // Each layout is a free-form JSON object from the 3D placement tool.
    // Mixed type requires prop.markModified('fieldName') before save().
    furnitureLayout:         { type: mongoose.Schema.Types.Mixed, default: {} }, // legacy — use role-specific fields below
    landlordFurnitureLayout: { type: mongoose.Schema.Types.Mixed, default: {} },
    tenantFurnitureLayout:   { type: mongoose.Schema.Types.Mixed, default: {} },

    // ── Property images ──────────────────────────────────────────
    // Simple array of URL strings — no sub-document overhead needed
    images: [String],
  },
  {
    // Mongoose auto-manages createdAt and updatedAt timestamps
    timestamps: true,
  }
);

module.exports = mongoose.model('Property', propertySchema);
