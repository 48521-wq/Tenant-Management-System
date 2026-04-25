// ============================================================
// TMS — Complaint Schema
// Tenant-raised issues escalated to admin for resolution
// ============================================================
'use strict';

const mongoose = require('mongoose');

const ObjRef = mongoose.Schema.Types.ObjectId;

/** Valid complaint categories */
const CAT_LIST   = ['Noise','Water','Electricity','Neighbor','Rent','Security','Other'];
/** Valid complaint statuses */
const STATUS_LIST = ['open','in_progress','resolved','closed'];
/** Valid complaint priorities */
const PRIO_LIST   = ['low','medium','high'];

const ComplaintSchema = new mongoose.Schema(
  {
    tenantId:    { type: ObjRef,  ref: 'User',     required: true },
    tenantName:  { type: String,  default: '' },
    landlordId:  { type: ObjRef,  ref: 'User',     default: null },
    propertyId:  { type: ObjRef,  ref: 'Property', default: null },
    subject:     { type: String,  required: true,  trim: true },
    description: { type: String,  default: '' },
    category:    { type: String,  default: 'Other',  enum: CAT_LIST },
    status:      { type: String,  default: 'open',   enum: STATUS_LIST },
    priority:    { type: String,  default: 'medium', enum: PRIO_LIST },
    adminNote:   { type: String,  default: '' },
    resolvedAt:  { type: Date,    default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Complaint', ComplaintSchema);
