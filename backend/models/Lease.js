// ═══════════════════════════════════════════════════════════════
//  Lease Model  —  TMS
//  Represents a signed rental lease agreement between a tenant
//  and a landlord for a specific property.
//
//  Status lifecycle:
//    draft      — agreement created but not yet signed
//    active     — signed and currently in effect
//    expired    — end date has passed naturally
//    terminated — cancelled early by admin or mutual agreement
//
//  Key design decisions:
//    - Property details (title, address) and both party names are
//      cached at signing time. This makes the lease record fully
//      self-contained — readable even if the property or user
//      documents are later deleted or modified.
//    - signedAt defaults to Date.now (function reference) so each
//      new document gets the timestamp at insertion time, not at
//      schema definition time.
//    - startDate and endDate are stored as strings (not Date objects)
//      so they can be displayed directly without date formatting.
//    - New leases created via POST /api/leases start as 'active'.
// ═══════════════════════════════════════════════════════════════

const mongoose = require('mongoose');

// ── Schema constants ─────────────────────────────────────────────
// Status lifecycle: draft → active → expired | terminated
const LEASE_STATUSES = ['draft', 'active', 'expired', 'terminated'];

const leaseSchema = new mongoose.Schema(
  {
    // ── Tenant details ───────────────────────────────────────────
    tenantId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    tenantName:  { type: String, default: '' },
    tenantEmail: { type: String, default: '' },

    // ── Landlord details ─────────────────────────────────────────
    // landlordId is optional — may not be linked when created
    landlordId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    landlordName: { type: String, default: '' },

    // ── Property details ─────────────────────────────────────────
    // Cached at signing time so record is self-contained
    propertyId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null },
    propertyTitle:   { type: String, default: '' },
    propertyAddress: { type: String, default: '' },

    // ── Lease terms ──────────────────────────────────────────────
    rent:      { type: Number, default: 0 },
    startDate: { type: String, default: '' },
    endDate:   { type: String, default: '' },
    duration:  { type: String, default: '12 months' },

    // Full text of any agreed terms and conditions
    terms: { type: String, default: '' },

    // ── Status ───────────────────────────────────────────────────
    status: {
      type:    String,
      enum:    LEASE_STATUSES,
      default: 'active',
    },

    // When the tenant digitally signed the lease
    signedAt: { type: Date, default: Date.now },
  },
  {
    // Adds createdAt and updatedAt automatically
    timestamps: true,
  }
);

module.exports = mongoose.model('Lease', leaseSchema);
