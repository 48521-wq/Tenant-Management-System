// Property model — stores all rental property details including 3D config and furniture layouts
const mongoose = require('mongoose');

const propertyDefinition = new mongoose.Schema({
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

  // Owner info
  landlordId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  landlordName: { type: String, default: '' },

  // Assigned tenant info
  tenantId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  tenantName: { type: String, default: '' },

  // 3D Model Config — stored per property so each has unique 3D appearance
  model3d: {
    houseType:  { type: String, enum: ['standard','villa','apartment','bungalow'], default: 'standard' },
    wallColor:  { type: String, default: '#8B7355' },
    roofColor:  { type: String, default: '#5C3A1E' },
    floorColor: { type: String, default: '#D2B48C' },
    floors:     { type: Number, default: 1 },
    hasGarden:  { type: Boolean, default: false },
    hasPool:    { type: Boolean, default: false },
    hasGarage:  { type: Boolean, default: false },
  },

  // Furniture Layouts — landlord and tenant each have their own saved layout
  furnitureLayout:         { type: mongoose.Schema.Types.Mixed, default: {} }, // legacy
  landlordFurnitureLayout: { type: mongoose.Schema.Types.Mixed, default: {} },
  tenantFurnitureLayout:   { type: mongoose.Schema.Types.Mixed, default: {} },

  images: [String],
}, { timestamps: true });

module.exports = mongoose.model('Property', propertyDefinition);
