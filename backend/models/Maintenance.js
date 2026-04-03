// ═══════════════════════════════════════════════════════════════
//  Maintenance Model  —  TMS
//  Maintenance requests submitted by tenants.
//  Status progresses: pending → in_progress → resolved / cancelled
// ═══════════════════════════════════════════════════════════════

const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema(
  {
    // ── Who submitted the request ────────────────────────────────
    tenantId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    tenantName: { type: String, default: '' },

    // ── Related landlord / property ──────────────────────────────
    landlordId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',     default: null },
    propertyId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null },

    // Property title cached for display even if property is deleted
    propertyTitle: { type: String, default: '' },

    // ── Request details ──────────────────────────────────────────

    // Category of the maintenance issue
    type: {
      type:    String,
      enum:    ['Plumbing', 'Electrical', 'Gas', 'AC / Cooling', 'Painting', 'Structural', 'Other'],
      default: 'Other',
    },

    // How urgently the issue needs attention
    priority: {
      type:    String,
      enum:    ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },

    // Full description of the problem — required field
    description: {
      type:     String,
      required: true,
    },

    // ── Status ───────────────────────────────────────────────────
    status: {
      type:    String,
      enum:    ['pending', 'in_progress', 'resolved', 'cancelled'],
      default: 'pending',
    },

    // ── Admin response ───────────────────────────────────────────
    adminNote:  { type: String, default: '' },

    // Timestamp set by the route when status changes to 'resolved'
    resolvedAt: { type: Date, default: null },
  },
  {
    // Adds createdAt and updatedAt automatically
    timestamps: true,
  }
);

module.exports = mongoose.model('Maintenance', maintenanceSchema);
