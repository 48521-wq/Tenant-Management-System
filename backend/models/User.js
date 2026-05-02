// ═══════════════════════════════════════════════════════════════
//  User Model  —  TMS
//  Represents tenant and landlord accounts registered in the system.
//
//  Note: The admin account is NOT stored in this collection.
//  Admin identity is managed entirely through environment variables
//  (ADMIN_EMAIL / ADMIN_PASSWORD) and verified inside the auth routes.
//
//  Supported authentication methods:
//    email  — traditional email + password (bcrypt hashed)
//    google — Google OAuth 2.0 via GSI (no password stored)
//
//  Design notes:
//    - password uses select:false so it is never returned in queries
//      unless the caller explicitly adds .select('+password').
//    - email is stored lowercase and enforced unique — it is the
//      primary login identifier across the whole collection.
//    - googleId holds the Google subject ('sub') from the ID-token
//      payload; used to match returning Google OAuth users.
//    - verified and status are independent: verified reflects admin
//      document review; status reflects whether the account is active.
// ═══════════════════════════════════════════════════════════════

'use strict';

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// ── Schema constants ──────────────────────────────────────────
/** bcrypt work factor — increase for stronger hashing at login cost */
const BCRYPT_ROUNDS = 10;

/** OAuth providers a user account may be linked to */
const AUTH_PROVIDERS = ['email', 'google'];

/** Roles assignable to regular users — admin is env-var only */
const USER_ROLES = ['tenant', 'landlord'];

/** Account lifecycle states */
const ACCOUNT_STATUSES = ['active', 'blocked'];

// ── Schema ────────────────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    // ── Identity ─────────────────────────────────────────────
    name: {
      type:     String,
      required: true,
      trim:     true,
    },
    // Primary login key — unique and stored in lowercase
    email: {
      type:      String,
      required:  true,
      unique:    true,
      lowercase: true,
      trim:      true,
    },

    // ── Authentication ────────────────────────────────────────
    // Hidden from queries by default; use .select('+password') when needed
    password: {
      type:      String,
      minlength: 6,
      select:    false,
    },
    authProvider: {
      type:    String,
      enum:    AUTH_PROVIDERS,
      default: 'email',
    },
    // Google subject ID stored on first OAuth sign-in; null for email accounts
    googleId: {
      type:    String,
      default: null,
    },

    // ── Role & status ─────────────────────────────────────────
    // Determines which dashboard the user sees after authentication
    role: {
      type:     String,
      enum:     USER_ROLES,
      required: true,
    },
    // Blocked accounts receive 403 on all protected routes
    status: {
      type:    String,
      enum:    ACCOUNT_STATUSES,
      default: 'active',
    },
    // Set to true by admin after reviewing uploaded documents
    verified: {
      type:    Boolean,
      default: false,
    },

    // ── Optional profile fields ────────────────────────────────
    phone:   { type: String, default: '' },
    cnic:    { type: String, default: '' }, // national identity number
    city:    { type: String, default: '' },
    address: { type: String, default: '' },
    avatar:  { type: String, default: '' }, // URL to profile picture
  },
  {
    timestamps: true, // auto-adds createdAt and updatedAt
  }
);

// ── Pre-save: hash password when changed ──────────────────────
// Skips hashing when password is absent (Google OAuth users have none).
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
  next();
});

// ── Instance method: verify plain-text password ───────────────
// Returns Promise<boolean> — true when the plain text matches the stored hash.
userSchema.methods.comparePassword = function (plainText) {
  return bcrypt.compare(plainText, this.password);
};

module.exports = mongoose.model('User', userSchema);
