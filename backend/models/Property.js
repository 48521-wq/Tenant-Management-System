<<<<<<< HEAD
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
=======
const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  // Basic Info
  title:       { type: String, required: true, trim: true },
  type:        { type: String, enum: ['House','Flat','Apartment','Villa','Room'], default: 'House' },
  area:        { type: String, required: true },
  address:     { type: String, required: true },
  city:        { type: String, default: 'Lahore' },
  rent:        { type: Number, required: true },
  beds:        { type: Number, default: 2 },
  baths:       { type: Number, default: 1 },
  sqft:        { type: Number, default: 1000 },
  description: { type: String, default: '' },
  status:      { type: String, enum: ['available','rented','suspended'], default: 'available' },
  
  // Owner
  landlordId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  landlordName:{ type: String, default: '' },
  
  // Tenant assigned
  tenantId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  tenantName:  { type: String, default: '' },

  // 3D Model Config — Mixed type so any config can be saved freely
  model3d: { type: mongoose.Schema.Types.Mixed, default: {
    houseType: 'standard', wallColor: '#8B7355', roofColor: '#5C3A1E',
    floorColor: '#D2B48C', floors: 1, hasGarden: false, hasPool: false, hasGarage: false
  }},

  // Furniture Layouts — separate for landlord and tenant
  furnitureLayout:         { type: mongoose.Schema.Types.Mixed, default: {} }, // legacy
  landlordFurnitureLayout: { type: mongoose.Schema.Types.Mixed, default: {} },
  tenantFurnitureLayout:   { type: mongoose.Schema.Types.Mixed, default: {} },

  images: [String],
}, { timestamps: true });
>>>>>>> 17a4da6032e965253aaaaa7e291f867a3df0f14b

module.exports = mongoose.model('Property', propertySchema);
