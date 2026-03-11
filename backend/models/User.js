// ═══════════════════════════════════════════════
//  User Model — MongoDB Schema
//  Stores all registered users: Tenants & Landlords
// ═══════════════════════════════════════════════
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: 2,
    maxlength: 60
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    minlength: 6,
    select: false  // Never returned in queries by default
  },
  role: {
    type: String,
    enum: ['tenant', 'landlord'],
    required: [true, 'Role is required']
  },
  authProvider: {
    type: String,
    enum: ['email', 'google'],
    default: 'email'
  },
  googleId: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'blocked', 'pending'],
    default: 'active'
  },
  verified: {
    type: Boolean,
    default: false
  },
  // Profile fields (optional, filled later in dashboard)
  phone:   { type: String, default: '' },
  cnic:    { type: String, default: '' },
  city:    { type: String, default: '' },
  address: { type: String, default: '' },
  avatar:  { type: String, default: '' },
}, {
  timestamps: true  // Adds createdAt and updatedAt automatically
});

// ── Hash password before saving ──────────────────────
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Compare password method ──────────────────────────
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
