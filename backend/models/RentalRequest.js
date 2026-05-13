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
    enum: ['pending', 'accepted', 'rejected', 'cancelled', 'negotiating'],
    default: 'pending'
  },

  // Optional: Tenant message/reason
  message:       { type: String, default: '' },

  // Negotiation: proposed rent by tenant
  proposedRent:  { type: Number, default: null },

  // Negotiation chat messages
  negotiationMessages: [{
    senderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    senderName: { type: String },
    senderRole: { type: String, enum: ['tenant', 'landlord'] },
    text:       { type: String },
    proposedRent: { type: Number, default: null },
    sentAt:     { type: Date, default: Date.now }
  }],

  // Final agreed rent (set when landlord accepts negotiation)
  agreedRent:    { type: Number, default: null },

  // Timeline
  requestedAt:   { type: Date, default: Date.now },
  respondedAt:   { type: Date, default: null },

}, { timestamps: true });

module.exports = mongoose.model('RentalRequest', rentalRequestSchema);
