// ─── RentalRequest Model ──────────────────────────────────────────────────────────────
const mongoose = require('mongoose');

const rentalRequestSchema = new mongoose.Schema({
  // Tenant requesting
  tenantId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tenantName:    { type: String, default: '' },
  tenantEmail:   { type: String, default: '' },
  tenantPhone:   { type: String, default: '' },

  // Property being requested
  propertyId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  propertyTitle: { type: String, default: '' },
  propertyAddress:{ type: String, default: '' },
  propertyRent:  { type: Number, default: 0 },

  // Landlord owning the property
  landlordId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  landlordName:  { type: String, default: '' },
  landlordEmail: { type: String, default: '' },

  // Request status
  status:        {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'cancelled'],
    default: 'pending'
  },

  // Optional: Tenant message/reason
  message:       { type: String, default: '' },

  // Timeline
  requestedAt:   { type: Date, default: Date.now },
  respondedAt:   { type: Date, default: null },

}, { timestamps: true });

module.exports = mongoose.model('RentalRequest', rentalRequestSchema);
