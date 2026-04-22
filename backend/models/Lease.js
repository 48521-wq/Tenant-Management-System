// ============================================================
// TMS — Lease Schema
// Rental agreements between tenant and landlord
// ============================================================
'use strict';

const mg = require('mongoose');

const Ref = mg.Schema.Types.ObjectId;

const LEASE_STATUSES = ['draft', 'active', 'expired', 'terminated'];

const tmsLeaseSchema = new mg.Schema(
  {
    tenantId:        { type: Ref,    ref: 'User',     required: true },
    tenantName:      { type: String, default: '' },
    tenantEmail:     { type: String, default: '' },
    landlordId:      { type: Ref,    ref: 'User',     default: null },
    landlordName:    { type: String, default: '' },
    propertyId:      { type: Ref,    ref: 'Property', default: null },
    propertyTitle:   { type: String, default: '' },
    propertyAddress: { type: String, default: '' },
    rent:            { type: Number, default: 0 },
    startDate:       { type: String, default: '' },
    endDate:         { type: String, default: '' },
    duration:        { type: String, default: '12 months' },
    terms:           { type: String, default: '' },
    status:          { type: String, default: 'active', enum: LEASE_STATUSES },
    signedAt:        { type: Date,   default: Date.now },
  },
  { timestamps: true }
);

module.exports = mg.model('Lease', tmsLeaseSchema);
