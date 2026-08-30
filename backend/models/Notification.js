const mongoose = require('mongoose');

// `to` holds the raw audience list exactly as chosen by the sender:
//   - ['all']                → everyone (tenants + landlords + admin)
//   - ['tenant'] / ['landlord'] → every user with that role
//   - ['a@x.com','b@x.com']  → specific people, by email
// `readBy` stores the identifier (email, or 'admin') of everyone who has
// already seen it, so read/unread is tracked per-recipient, not globally.
const notificationSchema = new mongoose.Schema({
  title:   { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  color:   { type: String, default: 'blue' },
  fromName:  { type: String, default: 'Admin' },
  fromEmail: { type: String, default: '' },
  fromRole:  { type: String, enum: ['admin', 'landlord', 'tenant'], default: 'admin' },
  to:      { type: [String], default: ['all'] },
  toLabel: { type: String, default: 'Everyone' },
  readBy:  { type: [String], default: [] },
}, { timestamps: true });

notificationSchema.index({ to: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
