// ═══════════════════════════════════════════════════════════════
//  Property Model  —  TMS
//  Represents a rental property listed by a landlord
//  Supports 3D model configuration and furniture layout storage
// ═══════════════════════════════════════════════════════════════

const mongoose = require('mongoose');

// ── Schema definition ────────────────────────────────────────────
const propertySchema = new mongoose.Schema(
  {
    // ── Basic property info ──────────────────────────────────────
    title: {
      type:     String,
      required: true,
      trim:     true,
    },
    type: {
      type:    String,
      enum:    ['House', 'Flat', 'Apartment', 'Villa', 'Room'],
      default: 'House',
    },
    area:    { type: String, required: true },
    address: { type: String, required: true },
    city:    { type: String, default: 'Lahore' },

    // ── Pricing and size ─────────────────────────────────────────
    rent:  { type: Number, required: true },
    beds:  { type: Number, default: 2 },
    baths: { type: Number, default: 1 },
    sqft:  { type: Number, default: 1000 },

    description: { type: String, default: '' },

    // Availability status of the property
    status: {
      type:    String,
      enum:    ['available', 'rented', 'suspended'],
      default: 'available',
    },

    // ── Ownership ────────────────────────────────────────────────
    landlordId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    landlordName: { type: String, default: '' },

    // ── Assigned tenant ──────────────────────────────────────────
    // Populated when a tenant rents this property
    tenantId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    tenantName: { type: String, default: '' },

    // ── 3D Model Configuration ───────────────────────────────────
    // Stored per-property so each listing can have its own 3D look
    model3d: {
      houseType:  { type: String, enum: ['standard', 'villa', 'apartment', 'bungalow'], default: 'standard' },
      wallColor:  { type: String, default: '#8B7355' },
      roofColor:  { type: String, default: '#5C3A1E' },
      floorColor: { type: String, default: '#D2B48C' },
      floors:     { type: Number, default: 1 },
      hasGarden:  { type: Boolean, default: false },
      hasPool:    { type: Boolean, default: false },
      hasGarage:  { type: Boolean, default: false },
    },

    // ── Furniture Layouts ────────────────────────────────────────
    // Landlord and tenant each have their own separate layout
    furnitureLayout:         { type: mongoose.Schema.Types.Mixed, default: {} }, // legacy
    landlordFurnitureLayout: { type: mongoose.Schema.Types.Mixed, default: {} },
    tenantFurnitureLayout:   { type: mongoose.Schema.Types.Mixed, default: {} },

    // ── Property images ──────────────────────────────────────────
    images: [String],
  },
  {
    // Automatically adds createdAt and updatedAt timestamps
    timestamps: true,
  }
);

module.exports = mongoose.model('Property', propertySchema);
