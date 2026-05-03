const mongoose = require('mongoose');

// ══════════════════════════════════════════════════════════════
//  Model3DRequest — Landlord sends 3D model request to Admin
//  Flow:
//    1. Landlord submits request with requirements after adding house
//    2. Admin reviews → proposes amount
//    3. Landlord accepts/counters amount  (negotiation)
//    4. Admin marks 'agreed' → sets final amount
//    5. Admin builds 3D model and attaches it → status: 'completed'
// ══════════════════════════════════════════════════════════════

const messageSchema = new mongoose.Schema({
  from:       { type: String, enum: ['landlord','admin'], required: true },
  text:       { type: String, required: true },
  amount:     { type: Number, default: null }, // if this message proposes an amount
  createdAt:  { type: Date, default: Date.now }
}, { _id: false });

const model3DRequestSchema = new mongoose.Schema({

  // — Linked property
  propertyId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  propertyTitle: { type: String, default: '' },

  // — Landlord who made the request
  landlordId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  landlordName:  { type: String, default: '' },

  // — Requirements landlord specified
  requirements: {
    houseType:     { type: String, default: 'standard' },   // standard / modern / villa / bungalow
    floors:        { type: Number, default: 1 },
    wallColor:     { type: String, default: '#C9A96E' },
    roofColor:     { type: String, default: '#7A4F2A' },
    floorColor:    { type: String, default: '#D2B48C' },
    hasGarden:     { type: Boolean, default: false },
    hasPool:       { type: Boolean, default: false },
    hasGarage:     { type: Boolean, default: false },
    extraNotes:    { type: String, default: '' },           // free-text requirements
  },

  // — Status flow
  // pending → admin_reviewed → negotiating → agreed → completed  |  rejected
  status: {
    type: String,
    enum: ['pending','admin_reviewed','negotiating','agreed','completed','rejected'],
    default: 'pending'
  },

  // — Amount negotiation
  proposedAmount:  { type: Number, default: null }, // admin's first proposal
  landlordCounter: { type: Number, default: null }, // landlord's counter (optional)
  agreedAmount:    { type: Number, default: null }, // final agreed price

  // — Chat / negotiation messages between landlord & admin
  messages: [messageSchema],

  // — Admin rejection reason
  rejectionReason: { type: String, default: '' },

  // — Final 3D config attached by admin when completed
  finalModel3d: { type: mongoose.Schema.Types.Mixed, default: null },

}, { timestamps: true });

module.exports = mongoose.model('Model3DRequest', model3DRequestSchema);
