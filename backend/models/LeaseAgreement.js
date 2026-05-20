const mongoose = require('mongoose');

const LeaseAgreementSchema = new mongoose.Schema({
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  landlord: {
    name: String,
    cnic: String,
    address: String,
    phone: String,
    email: String
  },
  tenant: {
    name: String,
    cnic: String,
    address: String,
    phone: String,
    occupation: String
  },
  propertyDetails: {
    address: String,
    type: String,
    area: String,
    rooms: String,
    plot: String
  },
  financials: {
    rent: String,
    deposit: String,
    advance: String,
    startDate: String,
    endDate: String,
    dueDay: String,
    incPct: String,
    city: String,
    special: String
  },
  signatures: {
    landlord: String, // base64 image
    tenant: String   // base64 image
  },
  status: { type: String, enum: ['draft', 'sent', 'signed'], default: 'draft' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LeaseAgreement', LeaseAgreementSchema);