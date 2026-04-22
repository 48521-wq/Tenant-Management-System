// ============================================================
// TMS — Complaint Schema
// Tenant-raised issues escalated to admin
// ============================================================
'use strict';

const mg = require('mongoose');

const Ref = mg.Schema.Types.ObjectId;

const COMPLAINT_CATEGORIES = ['Noise','Water','Electricity','Neighbor','Rent','Security','Other'];
const COMPLAINT_STATUSES   = ['open','in_progress','resolved','closed'];
const COMPLAINT_PRIORITIES = ['low','medium','high'];

const tmsComplaintSchema = new mg.Schema(
  {
    tenantId:    { type: Ref,    ref: 'User',     required: true },
    tenantName:  { type: String, default: '' },
    landlordId:  { type: Ref,    ref: 'User',     default: null },
    propertyId:  { type: Ref,    ref: 'Property', default: null },
    subject:     { type: String, required: true,  trim: true },
    description: { type: String, default: '' },
    category:    { type: String, default: 'Other',  enum: COMPLAINT_CATEGORIES },
    status:      { type: String, default: 'open',   enum: COMPLAINT_STATUSES },
    priority:    { type: String, default: 'medium', enum: COMPLAINT_PRIORITIES },
    adminNote:   { type: String, default: '' },
    resolvedAt:  { type: Date,   default: null },
  },
  { timestamps: true }
);

module.exports = mg.model('Complaint', tmsComplaintSchema);
