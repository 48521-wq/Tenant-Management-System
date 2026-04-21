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

module.exports = mongoose.model('Maintenance', maintenanceSchema);
