// ============================================================
// TMS — Maintenance Schema
// Repair and service requests submitted by tenants
// ============================================================
'use strict';

const mongoose = require('mongoose');

const ObjRef = mongoose.Schema.Types.ObjectId;

/** Accepted maintenance request types */
const TYPE_LIST   = ['Plumbing','Electrical','Gas','AC / Cooling','Painting','Structural','Other'];
/** Accepted priority levels */
const PRIO_LIST   = ['low','medium','high','urgent'];
/** Accepted request statuses */
const STATUS_LIST = ['pending','in_progress','resolved','cancelled'];

const MaintenanceSchema = new mongoose.Schema(
  {
    tenantId:      { type: ObjRef,  ref: 'User',     required: true },
    tenantName:    { type: String,  default: '' },
    landlordId:    { type: ObjRef,  ref: 'User',     default: null },
    propertyId:    { type: ObjRef,  ref: 'Property', default: null },
    propertyTitle: { type: String,  default: '' },
    type:          { type: String,  default: 'Other',   enum: TYPE_LIST },
    priority:      { type: String,  default: 'medium',  enum: PRIO_LIST },
    description:   { type: String,  required: true },
    status:        { type: String,  default: 'pending', enum: STATUS_LIST },
    adminNote:     { type: String,  default: '' },
    resolvedAt:    { type: Date,    default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Maintenance', MaintenanceSchema);
