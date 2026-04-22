<<<<<<< HEAD
// ============================================================
// TMS Lease Model
// Rental agreements signed between tenant and landlord
// ============================================================
const mongoose = require('mongoose');

const ObjId = mongoose.Schema.Types.ObjectId;

const leaseSchema = new mongoose.Schema(
  {
    tenantId:        { type: ObjId,   ref: 'User',     required: true },
    tenantName:      { type: String,  default: '' },
    tenantEmail:     { type: String,  default: '' },
    landlordId:      { type: ObjId,   ref: 'User',     default: null },
    landlordName:    { type: String,  default: '' },
    propertyId:      { type: ObjId,   ref: 'Property', default: null },
    propertyTitle:   { type: String,  default: '' },
    propertyAddress: { type: String,  default: '' },
    rent:            { type: Number,  default: 0 },
    startDate:       { type: String,  default: '' },
    endDate:         { type: String,  default: '' },
    duration:        { type: String,  default: '12 months' },
    terms:           { type: String,  default: '' },
    status:          { type: String,  default: 'active', enum: ['draft','active','expired','terminated'] },
    signedAt:        { type: Date,    default: Date.now },
  },
  { timestamps: true }
);
=======
const mongoose = require('mongoose');

const leaseSchema = new mongoose.Schema({
  tenantId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tenantName:    { type: String, default: '' },
  tenantEmail:   { type: String, default: '' },
  landlordId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  landlordName:  { type: String, default: '' },
  propertyId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null },
  propertyTitle: { type: String, default: '' },
  propertyAddress:{ type: String, default: '' },
  rent:          { type: Number, default: 0 },
  startDate:     { type: String, default: '' },
  endDate:       { type: String, default: '' },
  duration:      { type: String, default: '12 months' },
  terms:         { type: String, default: '' },
  status:        { type: String, enum: ['pending','active','expired','terminated','rejected'], default: 'pending' },
  acceptedAt:    { type: Date, default: null },
  signedAt:      { type: Date, default: Date.now },
}, { timestamps: true });
>>>>>>> 17a4da6032e965253aaaaa7e291f867a3df0f14b

module.exports = mongoose.model('Lease', leaseSchema);
