<<<<<<< HEAD
// ============================================================
// TMS Maintenance Model
// Repair and service requests submitted by tenants
// ============================================================
const mongoose = require('mongoose');

const ObjId = mongoose.Schema.Types.ObjectId;

const maintenanceSchema = new mongoose.Schema(
  {
    tenantId:      { type: ObjId,  ref: 'User',     required: true },
    tenantName:    { type: String, default: '' },
    landlordId:    { type: ObjId,  ref: 'User',     default: null },
    propertyId:    { type: ObjId,  ref: 'Property', default: null },
    propertyTitle: { type: String, default: '' },
    type:          { type: String, default: 'Other', enum: ['Plumbing','Electrical','Gas','AC / Cooling','Painting','Structural','Other'] },
    priority:      { type: String, default: 'medium', enum: ['low','medium','high','urgent'] },
    description:   { type: String, required: true },
    status:        { type: String, default: 'pending', enum: ['pending','in_progress','resolved','cancelled'] },
    adminNote:     { type: String, default: '' },
    resolvedAt:    { type: Date,   default: null },
  },
  { timestamps: true }
);
=======
const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema({
  tenantId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tenantName:  { type: String, default: '' },
  landlordId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  landlordName:{ type: String, default: '' },
  propertyId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null },
  propertyTitle:{ type: String, default: '' },
  type:        { type: String, enum: ['Plumbing','Electrical','Gas','AC / Cooling','Painting','Structural','Other'], default: 'Other' },
  priority:    { type: String, enum: ['low','medium','high','urgent'], default: 'medium' },
  description: { type: String, required: true },
  status:      { type: String, enum: ['pending','in_progress','resolved','cancelled'], default: 'pending' },
  adminNote:   { type: String, default: '' },
  resolvedAt:  { type: Date, default: null },
}, { timestamps: true });
>>>>>>> 17a4da6032e965253aaaaa7e291f867a3df0f14b

module.exports = mongoose.model('Maintenance', maintenanceSchema);
