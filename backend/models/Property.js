// ─── Property Model ──────────────────────────────────────────────────────────────
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

  // 360 / 3D viewer config — Mixed type so any config can be saved freely
  model3d: { type: mongoose.Schema.Types.Mixed, default: null },

  // Furniture Layouts — separate for landlord and tenant
  furnitureLayout:         { type: mongoose.Schema.Types.Mixed, default: {} }, // legacy
  landlordFurnitureLayout: { type: mongoose.Schema.Types.Mixed, default: {} },
  tenantFurnitureLayout:   { type: mongoose.Schema.Types.Mixed, default: {} },

  images: [String],
}, { timestamps: true });

module.exports = mongoose.model('Property', propertySchema);
