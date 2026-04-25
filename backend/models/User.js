// ============================================================
// TMS — User Schema
// Supports: email/password login and Google OAuth sign-in
// ============================================================
'use strict';

const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');

/** bcrypt cost factor */
const BCRYPT_ROUNDS = 10;

/** Valid login providers */
const VALID_PROVIDERS = ['email', 'google'];

/** Valid user roles in the system */
const VALID_ROLES = ['tenant', 'landlord'];

/** Valid account states */
const VALID_STATUSES = ['active', 'blocked'];

const UserSchema = new mongoose.Schema(
  {
    name:         { type: String,  required: true,  trim: true },
    email:        { type: String,  required: true,  unique: true, lowercase: true, trim: true },
    password:     { type: String,  minlength: 6,    select: false },
    role:         { type: String,  required: true,  enum: VALID_ROLES },
    authProvider: { type: String,  default: 'email', enum: VALID_PROVIDERS },
    googleId:     { type: String,  default: null },
    status:       { type: String,  default: 'active', enum: VALID_STATUSES },
    verified:     { type: Boolean, default: false },
    phone:        { type: String,  default: '' },
    cnic:         { type: String,  default: '' },
    city:         { type: String,  default: '' },
    address:      { type: String,  default: '' },
    avatar:       { type: String,  default: '' },
  },
  { timestamps: true }
);

// Auto-hash password before saving if modified
UserSchema.pre('save', async function runHashMiddleware(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcryptjs.hash(this.password, BCRYPT_ROUNDS);
  next();
});

// Check a plain password against the stored bcrypt hash
UserSchema.methods.comparePassword = function verifyPassword(rawInput) {
  return require('bcryptjs').compare(rawInput, this.password);
};

module.exports = mongoose.model('User', UserSchema);
