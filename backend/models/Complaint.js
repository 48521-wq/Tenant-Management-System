<<<<<<< HEAD
// ============================================================
// TMS Complaint Model
// Tenant complaints directed to admin for resolution
// ============================================================
const mongoose = require('mongoose');

const ObjId = mongoose.Schema.Types.ObjectId;

const complaintSchema = new mongoose.Schema(
  {
    tenantId:    { type: ObjId,   ref: 'User',     required: true },
    tenantName:  { type: String,  default: '' },
    landlordId:  { type: ObjId,   ref: 'User',     default: null },
    propertyId:  { type: ObjId,   ref: 'Property', default: null },
    subject:     { type: String,  required: true, trim: true },
    description: { type: String,  default: '' },
    category:    { type: String,  default: 'Other', enum: ['Noise','Water','Electricity','Neighbor','Rent','Security','Other'] },
    status:      { type: String,  default: 'open',  enum: ['open','in_progress','resolved','closed'] },
    priority:    { type: String,  default: 'medium', enum: ['low','medium','high'] },
    adminNote:   { type: String,  default: '' },
    resolvedAt:  { type: Date,    default: null },
  },
  { timestamps: true }
);
=======
const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  tenantId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tenantName:    { type: String, default: '' },
  landlordId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  landlordName:  { type: String, default: '' },
  propertyId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null },
  subject:       { type: String, required: true, trim: true },
  description:   { type: String, default: '' },
  category:      { type: String, enum: ['Noise','Water','Electricity','Neighbor','Rent','Security','Other'], default: 'Other' },
  status:        { type: String, enum: ['open','in_progress','resolved','closed'], default: 'open' },
  priority:      { type: String, enum: ['low','medium','high'], default: 'medium' },
  adminNote:     { type: String, default: '' },
  resolvedAt:    { type: Date, default: null },
}, { timestamps: true });
>>>>>>> 17a4da6032e965253aaaaa7e291f867a3df0f14b

module.exports = mongoose.model('Complaint', complaintSchema);
