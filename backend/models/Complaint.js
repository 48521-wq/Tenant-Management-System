// ═══════════════════════════════════════════════════════════════
//  Complaint Model  —  TMS
//  A complaint is filed by a tenant and reviewed by admin.
//
//  Status lifecycle:
//    open → in_progress → resolved
//    open → closed  (admin closes without resolving)
//
//  Key design decisions:
//    - tenantName is cached so the record is readable even if the
//      User document is later deleted or anonymised.
//    - landlordId and propertyId are optional ObjectId references —
//      a tenant may not know the landlord ID at the time of filing.
//    - resolvedAt is stamped by the route, not the model, so it only
//      appears when the admin explicitly marks status as 'resolved'.
// ═══════════════════════════════════════════════════════════════

const mongoose = require('mongoose');

// ── Schema constants ─────────────────────────────────────────────
const COMPLAINT_CATEGORIES = ['Noise', 'Water', 'Electricity', 'Neighbor', 'Rent', 'Security', 'Other'];
const COMPLAINT_PRIORITIES = ['low', 'medium', 'high'];
const COMPLAINT_STATUSES   = ['open', 'in_progress', 'resolved', 'closed'];

const complaintSchema = new mongoose.Schema(
  {
    // ── Who filed the complaint ──────────────────────────────────
    // tenantId links to the User document that owns this complaint
    tenantId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    // Cached display name — avoids a populate() call on every read
    tenantName: { type: String, default: '' },

    // ── Which landlord / property it concerns ────────────────────
    // Both are optional — tenant may not know IDs at filing time
    landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'User',     default: null },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null },

    // ── Complaint details ────────────────────────────────────────
    // Subject is the short headline; description is the full narrative
    subject: {
      type:     String,
      required: true,
      trim:     true,
    },
    description: { type: String, default: '' },

    // Category helps admin route and prioritise the complaint
    category: {
      type:    String,
      enum:    COMPLAINT_CATEGORIES,
      default: 'Other',
    },

    // ── Priority & status ────────────────────────────────────────
    // Priority set by tenant; status updated by admin
    priority: {
      type:    String,
      enum:    COMPLAINT_PRIORITIES,
      default: 'medium',
    },
    status: {
      type:    String,
      enum:    COMPLAINT_STATUSES,
      default: 'open',   // all new complaints start as open
    },

    // ── Admin response ───────────────────────────────────────────
    // Admin can leave a note explaining the action taken
    adminNote: { type: String, default: '' },

    // Set by PUT /:id/status route when status becomes 'resolved'
    // null until the complaint is officially resolved
    resolvedAt: { type: Date, default: null },
  },
  {
    // Mongoose auto-manages createdAt and updatedAt timestamps
    timestamps: true,
  }
);

module.exports = mongoose.model('Complaint', complaintSchema);
