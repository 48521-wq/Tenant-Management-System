// ============================================================
// TMS Property Model
// Stores rental property info, 3D config, and furniture layouts
// ============================================================
const mongoose = require('mongoose');

const MixedType = mongoose.Schema.Types.Mixed;
const ObjIdType = mongoose.Schema.Types.ObjectId;

const propertySchema = new mongoose.Schema(
  {
    // ── Basic Details ──────────────────────────────────────
    title:       { type: String, required: true, trim: true },
    type:        { type: String, default: 'House', enum: ['House','Flat','Apartment','Villa','Room'] },
    area:        { type: String, required: true },
    address:     { type: String, required: true },
    city:        { type: String, default: 'Lahore' },
    rent:        { type: Number, required: true },
    beds:        { type: Number, default: 2 },
    baths:       { type: Number, default: 1 },
    sqft:        { type: Number, default: 1000 },
    description: { type: String, default: '' },
    status:      { type: String, default: 'available', enum: ['available','rented','suspended'] },

    // ── Owner ──────────────────────────────────────────────
    landlordId:   { type: ObjIdType, ref: 'User', required: true },
    landlordName: { type: String, default: '' },

    // ── Assigned Tenant ────────────────────────────────────
    tenantId:   { type: ObjIdType, ref: 'User', default: null },
    tenantName: { type: String, default: '' },

    // ── 3D Model Configuration ─────────────────────────────
    model3d: {
      houseType:  { type: String, default: 'standard', enum: ['standard','villa','apartment','bungalow'] },
      wallColor:  { type: String, default: '#8B7355' },
      roofColor:  { type: String, default: '#5C3A1E' },
      floorColor: { type: String, default: '#D2B48C' },
      floors:     { type: Number,  default: 1 },
      hasGarden:  { type: Boolean, default: false },
      hasPool:    { type: Boolean, default: false },
      hasGarage:  { type: Boolean, default: false },
    },

    // ── Furniture Layouts (per-role) ───────────────────────
    furnitureLayout:         { type: MixedType, default: {} }, // legacy
    landlordFurnitureLayout: { type: MixedType, default: {} },
    tenantFurnitureLayout:   { type: MixedType, default: {} },

    images: [String],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Property', propertySchema);
