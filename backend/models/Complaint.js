const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  tenantId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tenantName:    { type: String, default: '' },
  landlordId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  landlordName:  { type: String, default: '' },
  propertyId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null },
  subject:       { type: String, required: true, trim: true },
  description:   { type: String, default: '' },
  category:      { type: String, enum: ['Noise','Water','Electricity','Neighbor','Rent','Security','Other'], default: 'Other' },
  status:        { type: String, enum: ['open','in_progress','resolved','closed'], default: 'open' },
  priority:      { type: String, enum: ['low','medium','high'], default: 'medium' },
  adminNote:     { type: String, default: '' },
  resolvedAt:    { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Complaint', complaintSchema);
