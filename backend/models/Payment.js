// ============================================================
// TMS — Payment Schema
// Rent payment records linked to tenant, landlord, property
// ============================================================
'use strict';

const mg = require('mongoose');

const Ref = mg.Schema.Types.ObjectId;

const PAYMENT_METHODS  = ['Cash','Bank Transfer','JazzCash','EasyPaisa','Cheque','Other'];
const PAYMENT_STATUSES = ['paid','pending','overdue'];

const tmsPaymentSchema = new mg.Schema(
  {
    tenantId:      { type: Ref,    ref: 'User',     required: true },
    tenantName:    { type: String, default: '' },
    landlordId:    { type: Ref,    ref: 'User',     default: null },
    propertyId:    { type: Ref,    ref: 'Property', default: null },
    propertyTitle: { type: String, default: '' },
    amount:        { type: Number, required: true },
    month:         { type: String, required: true },  // e.g. "January 2026"
    method:        { type: String, default: 'Cash',    enum: PAYMENT_METHODS },
    status:        { type: String, default: 'pending', enum: PAYMENT_STATUSES },
    note:          { type: String, default: '' },
    paidAt:        { type: Date,   default: null },
  },
  { timestamps: true }
);

module.exports = mg.model('Payment', tmsPaymentSchema);
