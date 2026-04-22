// ============================================================
// TMS — Maintenance Schema
// Repair/service requests raised by tenants
// ============================================================
'use strict';

const mg = require('mongoose');

const Ref = mg.Schema.Types.ObjectId;

const MAINT_TYPES      = ['Plumbing','Electrical','Gas','AC / Cooling','Painting','Structural','Other'];
const MAINT_PRIORITIES = ['low','medium','high','urgent'];
const MAINT_STATUSES   = ['pending','in_progress','resolved','cancelled'];

const tmsMaintenanceSchema = new mg.Schema(
  {
    tenantId:      { type: Ref,    ref: 'User',     required: true },
    tenantName:    { type: String, default: '' },
    landlordId:    { type: Ref,    ref: 'User',     default: null },
    propertyId:    { type: Ref,    ref: 'Property', default: null },
    propertyTitle: { type: String, default: '' },
    type:          { type: String, default: 'Other',   enum: MAINT_TYPES },
    priority:      { type: String, default: 'medium',  enum: MAINT_PRIORITIES },
    description:   { type: String, required: true },
    status:        { type: String, default: 'pending', enum: MAINT_STATUSES },
    adminNote:     { type: String, default: '' },
    resolvedAt:    { type: Date,   default: null },
  },
  { timestamps: true }
);

module.exports = mg.model('Maintenance', tmsMaintenanceSchema);
