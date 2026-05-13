// ─── Lease Model ──────────────────────────────────────────────────────────────
const mongoose = require('mongoose');

const leaseSchema = new mongoose.Schema({
  // Core relations
  tenantId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  landlordId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  propertyId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null },

  // Landlord details
  landlordName:   { type: String, default: '' },
  landlordCnic:   { type: String, default: '' },
  landlordAddr:   { type: String, default: '' },
  landlordPhone:  { type: String, default: '' },
  landlordEmail:  { type: String, default: '' },
  landlordSignature: { type: String, default: '' },

  // Tenant details
  tenantName:     { type: String, default: '' },
  tenantEmail:    { type: String, default: '' },
  tenantCnic:     { type: String, default: '' },
  tenantAddr:     { type: String, default: '' },
  tenantPhone:    { type: String, default: '' },
  tenantOcc:      { type: String, default: '' },
  tenantSignature:{ type: String, default: '' },

  // Property details
  propertyTitle:  { type: String, default: '' },
  propertyAddress:{ type: String, default: '' },
  propertyType:   { type: String, default: '' },
  propertyArea:   { type: String, default: '' },
  propertyRooms:  { type: String, default: '' },
  propertyPlot:   { type: String, default: '' },

  // Financial terms
  rent:           { type: Number, default: 0 },
  deposit:        { type: String, default: '' },
  advance:        { type: String, default: '' },
  startDate:      { type: String, default: '' },
  endDate:        { type: String, default: '' },
  duration:       { type: String, default: '11 months' },
  dueDay:         { type: String, default: '1st of month' },
  annualIncrease: { type: String, default: '' },
  city:           { type: String, default: '' },
  specialConditions: { type: String, default: '' },

  // Terms & status
  terms:          { type: String, default: '' },
  status:         { type: String, enum: ['pending','active','expired','terminated','rejected'], default: 'pending' },
  isLocked:       { type: Boolean, default: false },
  acceptedAt:     { type: Date, default: null },
  signedAt:       { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Lease', leaseSchema);
