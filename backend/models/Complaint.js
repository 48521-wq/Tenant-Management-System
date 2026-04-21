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

module.exports = mongoose.model('Complaint', complaintSchema);
