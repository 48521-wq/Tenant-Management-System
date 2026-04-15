// ═══════════════════════════════════════════════════════════════
//  Maintenance Model  —  TMS
//  Repair and maintenance requests submitted by tenants.
//
//  Status lifecycle:
//    pending → in_progress → resolved
//    pending → cancelled   (admin or landlord cancels the request)
//
//  Key design decisions:
//    - tenantName and propertyTitle are cached strings so that
//      dashboard tables remain readable without populate() calls,
//      even if the referenced User or Property is later deleted.
//    - description is the only required field — type and priority
//      fall back to schema defaults ('Other' and 'medium').
//    - resolvedAt is stamped only when the route sets status to
//      'resolved'; it stays null for cancelled requests.
// ═══════════════════════════════════════════════════════════════

const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema(
  {
    // ── Who submitted the request ────────────────────────────────
    // Required ObjectId reference to the submitting tenant
    tenantId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    // Cached display name — avoids populate() on every dashboard read
    tenantName: { type: String, default: '' },

    // ── Related landlord / property ──────────────────────────────
    // Both are optional ObjectId references
    landlordId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',     default: null },
    propertyId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null },

    // Property title cached so the record stays readable if the
    // property document is later deleted
    propertyTitle: { type: String, default: '' },

    // ── Request details ──────────────────────────────────────────

    // Broad category of the issue — helps route to the right contractor
    type: {
      type:    String,
      enum:    ['Plumbing', 'Electrical', 'Gas', 'AC / Cooling', 'Painting', 'Structural', 'Other'],
      default: 'Other',
    },

    // How urgently the issue needs to be addressed
    // 'urgent' should trigger immediate admin attention
    priority: {
      type:    String,
      enum:    ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },

    // Full description of the problem — the only required field
    description: {
      type:     String,
      required: true,
    },

    // ── Status ───────────────────────────────────────────────────
    // All new requests start as 'pending' until admin acts
    status: {
      type:    String,
      enum:    ['pending', 'in_progress', 'resolved', 'cancelled'],
      default: 'pending',
    },

    // ── Admin response ───────────────────────────────────────────
    // Admin note explaining the repair carried out or cancellation reason
    adminNote: { type: String, default: '' },

    // Stamped by the route when status transitions to 'resolved'
    // Remains null for pending, in_progress, and cancelled requests
    resolvedAt: { type: Date, default: null },
  },
  {
    // Mongoose auto-manages createdAt and updatedAt timestamps
    timestamps: true,
  }
);

module.exports = mongoose.model('Maintenance', maintenanceSchema);
