// ─── Maintenance Model ──────────────────────────────────────────────────────────────
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

module.exports = mongoose.model('Maintenance', maintenanceSchema);
