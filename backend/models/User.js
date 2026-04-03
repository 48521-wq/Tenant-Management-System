// ═══════════════════════════════════════════════════════════════
//  User Model  —  TMS
//  Represents both tenants and landlords in the system
//  Admin is NOT stored in DB — handled via env variables
// ═══════════════════════════════════════════════════════════════

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// ── Schema definition ────────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    // ── Identity fields ──────────────────────────────────────────
    name: {
      type:     String,
      required: true,
      trim:     true,
    },
    email: {
      type:      String,
      required:  true,
      unique:    true,
      lowercase: true,
      trim:      true,
    },

    // ── Authentication fields ────────────────────────────────────
    // password is excluded from queries by default (select: false)
    password: {
      type:      String,
      minlength: 6,
      select:    false,
    },
    authProvider: {
      type:    String,
      enum:    ['email', 'google'],
      default: 'email',
    },
    // Google OAuth subject ID — stored when user signs in via Google
    googleId: {
      type:    String,
      default: null,
    },

    // ── Role & status ────────────────────────────────────────────
    role: {
      type:     String,
      enum:     ['tenant', 'landlord'],
      required: true,
    },
    status: {
      type:    String,
      enum:    ['active', 'blocked'],
      default: 'active',
    },
    verified: {
      type:    Boolean,
      default: false,
    },

    // ── Optional profile fields ──────────────────────────────────
    phone:   { type: String, default: '' },
    cnic:    { type: String, default: '' },
    city:    { type: String, default: '' },
    address: { type: String, default: '' },
    avatar:  { type: String, default: '' },
  },
  {
    // Automatically adds createdAt and updatedAt fields
    timestamps: true,
  }
);

// ── Pre-save hook: hash password before storing ──────────────────
// Only runs when the password field has been modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// ── Instance method: compare a plain-text password with the hash ─
userSchema.methods.comparePassword = function (plainText) {
  return bcrypt.compare(plainText, this.password);
};

module.exports = mongoose.model('User', userSchema);
