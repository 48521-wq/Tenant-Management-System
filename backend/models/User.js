// ═══════════════════════════════════════════════════════════════
//  User Model  —  TMS
//  Represents both tenants and landlords registered in the system.
//
//  Important: The admin account is NOT stored in this collection.
//  Admin identity is managed entirely through environment variables
//  (ADMIN_EMAIL, ADMIN_PASSWORD) and is verified in the auth routes.
//
//  Authentication methods supported:
//    email  — traditional email + password (bcrypt hashed)
//    google — Google OAuth 2.0 via GSI (no password stored)
//
//  Key design decisions:
//    - password has select: false so it is never returned in queries
//      unless explicitly requested with .select('+password').
//    - email is stored lowercase (Mongoose auto-converts) and is
//      unique across the collection — used as the login identifier.
//    - googleId stores the Google subject ID ('sub') from the token
//      payload, used to link returning Google OAuth users.
//    - verified and status are separate concerns: verified means the
//      admin has checked documents; status means the account is active.
// ═══════════════════════════════════════════════════════════════

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const BCRYPT_SALT_ROUNDS = 10;

// ── Schema definition ────────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    // ── Identity fields ──────────────────────────────────────────
    // name is trimmed to remove accidental leading/trailing spaces
    name: {
      type:     String,
      required: true,
      trim:     true,
    },
    // email is the primary login identifier — must be unique
    // Mongoose lowercases it automatically before saving
    email: {
      type:      String,
      required:  true,
      unique:    true,
      lowercase: true,
      trim:      true,
    },

    // ── Authentication fields ────────────────────────────────────
    // password is excluded from all queries by default (select: false)
    // Use .select('+password') when you need it (e.g. login route)
    password: {
      type:      String,
      minlength: 6,
      select:    false,
    },
    // Which provider was used to create this account
    authProvider: {
      type:    String,
      enum:    ['email', 'google'],
      default: 'email',
    },
    // Google subject ID from the JWT payload — stored at first Google login
    // null for email/password accounts
    googleId: {
      type:    String,
      default: null,
    },

    // ── Role & account status ────────────────────────────────────
    // role determines which dashboard the user sees after login
    role: {
      type:     String,
      enum:     ['tenant', 'landlord'],
      required: true,
    },
    // blocked accounts receive 403 Forbidden on all protected routes
    status: {
      type:    String,
      enum:    ['active', 'blocked'],
      default: 'active',
    },
    // verified is set to true by admin after checking documents
    // Does not affect login — only affects trust level in dashboards
    verified: {
      type:    Boolean,
      default: false,
    },

    // ── Optional profile fields ──────────────────────────────────
    // All empty by default — user can fill them from the profile page
    phone:   { type: String, default: '' },
    cnic:    { type: String, default: '' },  // national ID number
    city:    { type: String, default: '' },
    address: { type: String, default: '' },
    avatar:  { type: String, default: '' },  // URL to profile image
  },
  {
    // Mongoose auto-manages createdAt and updatedAt timestamps
    timestamps: true,
  }
);

// ── Pre-save hook: hash password before storing ──────────────────
// Only runs when the password field is modified.
// Skips entirely for Google OAuth users (they have no password).
// Salt rounds = 10 — good balance of security vs. hashing time.
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, BCRYPT_SALT_ROUNDS);
  next();
});

// ── Instance method: verify a plain-text password ────────────────
// Returns a Promise<boolean> — true if the password matches the hash.
// Called in the login route after loading the user with .select('+password').
userSchema.methods.comparePassword = function (plainText) {
  return bcrypt.compare(plainText, this.password);
};

module.exports = mongoose.model('User', userSchema);
