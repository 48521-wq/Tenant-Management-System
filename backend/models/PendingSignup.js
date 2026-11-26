const mongoose = require('mongoose');

const pendingSignupSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  userData: {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: ['tenant', 'landlord'], required: true },
  },
}, { timestamps: true });

module.exports = mongoose.model('PendingSignup', pendingSignupSchema);
