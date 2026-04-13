// ═══════════════════════════════════════════════════════════════
//  Payment Model  —  TMS
//  Records rent payments made by tenants to landlords.
//
//  Status values:
//    paid    — payment recorded and confirmed (set at creation)
//    pending — payment expected but not yet recorded
//    overdue — payment was due but not made in time
//
//  Key design decisions:
//    - tenantName and propertyTitle are cached strings so
//      payment history remains readable without populate() calls,
//      even if the User or Property is later deleted.
//    - landlordId is optional — it may not be known at the time
//      the tenant records the payment.
//    - paidAt is stamped at creation time by the route (new Date())
//      when a tenant records a payment with status 'paid'.
//    - month is a human-readable string (e.g. "January 2026") rather
//      than a Date, so it is easy to display without formatting.
// ═══════════════════════════════════════════════════════════════

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    // ── Who made the payment ─────────────────────────────────────
    tenantId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    tenantName: { type: String, default: '' },

    // ── Who received the payment ─────────────────────────────────
    // landlordId is optional — populated when lease data is available
    landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'User',     default: null },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null },

    // Property title cached here so records remain readable
    // even if the property is later deleted
    propertyTitle: { type: String, default: '' },

    // ── Payment details ──────────────────────────────────────────
    amount: {
      type:     Number,
      required: true,
    },

    // Human-readable month label, e.g. "January 2026"
    month: {
      type:     String,
      required: true,
    },

    // Payment channel used by the tenant
    method: {
      type:    String,
      enum:    ['Cash', 'Bank Transfer', 'JazzCash', 'EasyPaisa', 'Cheque', 'Other'],
      default: 'Cash',
    },

    // ── Status ───────────────────────────────────────────────────
    status: {
      type:    String,
      enum:    ['paid', 'pending', 'overdue'],
      default: 'pending',
    },

    // Optional note from tenant (e.g. "paid via JazzCash ref#123")
    note: { type: String, default: '' },

    // Timestamp set when status is marked 'paid'
    paidAt: { type: Date, default: null },
  },
  {
    // Adds createdAt and updatedAt automatically
    timestamps: true,
  }
);

module.exports = mongoose.model('Payment', paymentSchema);
