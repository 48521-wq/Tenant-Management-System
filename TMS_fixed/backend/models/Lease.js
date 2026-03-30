// ═══════════════════════════════════════════════════════════════
//  Lease Model  —  TMS
//  A lease agreement is created when a tenant signs a contract.
//  Status: draft → active → expired / terminated
// ═══════════════════════════════════════════════════════════════

const mongoose = require('mongoose');

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
      enum:    ['draft', 'active', 'expired', 'terminated'],
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
