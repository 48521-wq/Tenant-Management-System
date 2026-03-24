// ═══════════════════════════════════════════════════════════════
//  Complaint Model  —  TMS
//  A complaint is filed by a tenant and reviewed by admin.
//  Status progresses: open → in_progress → resolved / closed
// ═══════════════════════════════════════════════════════════════

const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    // ── Who filed the complaint ──────────────────────────────────
    tenantId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    tenantName: { type: String, default: '' },

    // ── Which landlord / property it concerns ────────────────────
    // Optional — tenant may not know the landlord ID at filing time
    landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'User',     default: null },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null },

    // ── Complaint details ────────────────────────────────────────
    subject: {
      type:     String,
      required: true,
      trim:     true,
    },
    description: { type: String, default: '' },

    // Complaint category — helps admin route and prioritise
    category: {
      type:    String,
      enum:    ['Noise', 'Water', 'Electricity', 'Neighbor', 'Rent', 'Security', 'Other'],
      default: 'Other',
    },

    // ── Priority & status ────────────────────────────────────────
    priority: {
      type:    String,
      enum:    ['low', 'medium', 'high'],
      default: 'medium',
    },
    status: {
      type:    String,
      enum:    ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
    },

    // ── Admin response ───────────────────────────────────────────
    adminNote:  { type: String, default: '' },

    // Timestamp set by the route when status is changed to 'resolved'
    resolvedAt: { type: Date, default: null },
  },
  {
    // Adds createdAt and updatedAt automatically
    timestamps: true,
  }
);

module.exports = mongoose.model('Complaint', complaintSchema);
