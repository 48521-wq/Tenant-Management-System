const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  tenantId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tenantName:    { type: String, default: '' },
  landlordId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  propertyId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null },
  propertyTitle: { type: String, default: '' },
  amount:        { type: Number, required: true },
  month:         { type: String, required: true },   // e.g. "January 2026"
  method:        { type: String, enum: ['Cash','Bank Transfer','JazzCash','EasyPaisa','Cheque','Other'], default: 'Cash' },
  status:        { type: String, enum: ['paid','pending','overdue'], default: 'pending' },
  note:          { type: String, default: '' },
  paidAt:        { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
