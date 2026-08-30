const mongoose = require('mongoose');

const rentalRequestSchema = new mongoose.Schema({
  tenantId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tenantName:     { type: String, default: '' },
  tenantEmail:    { type: String, default: '' },
  tenantPhone:    { type: String, default: '' },

  propertyId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  propertyTitle:  { type: String, default: '' },
  propertyAddress:{ type: String, default: '' },
  propertyRent:   { type: Number, default: 0 },

  landlordId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  landlordName:   { type: String, default: '' },
  landlordEmail:  { type: String, default: '' },

  status: {
    type: String,
    enum: ['pending','accepted','rejected','cancelled','negotiating',
           'docs_pending','docs_submitted','docs_rejected','docs_expired'],
    default: 'pending'
  },

  message:      { type: String, default: '' },
  proposedRent: { type: Number, default: null },

  negotiationMessages: [{
    senderId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    senderName:   { type: String },
    senderRole:   { type: String, enum: ['tenant','landlord'] },
    text:         { type: String },
    proposedRent: { type: Number, default: null },
    sentAt:       { type: Date, default: Date.now }
  }],

  agreedRent:  { type: Number, default: null },
  requestedAt: { type: Date, default: Date.now },
  respondedAt: { type: Date, default: null },

  // ── Document verification ──
  docsDeadline:  { type: Date, default: null },
  documents: {
    idCard:       { type: String, default: '' },
    policeCert:   { type: String, default: '' },
    birthCert:    { type: String, default: '' },
    submittedAt:  { type: Date, default: null }
  },
  docsRejectReason: { type: String, default: '' }

}, { timestamps: true });

module.exports = mongoose.model('RentalRequest', rentalRequestSchema);
