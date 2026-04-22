// ============================================================
// TMS — User Schema
// Login: email/password  |  OAuth: Google
// ============================================================
'use strict';

const mg      = require('mongoose');
const bcrypt  = require('bcryptjs');

/** Number of bcrypt salt rounds */
const HASH_ROUNDS = 10;

/** Allowed login providers */
const AUTH_PROVIDERS = ['email', 'google'];

/** Allowed user roles */
const USER_ROLES = ['tenant', 'landlord'];

/** Allowed account statuses */
const ACCOUNT_STATUS = ['active', 'blocked'];

const tmsUserSchema = new mg.Schema(
  {
    name:         { type: String,  required: true,  trim: true },
    email:        { type: String,  required: true,  unique: true, lowercase: true, trim: true },
    password:     { type: String,  minlength: 6,    select: false },
    role:         { type: String,  required: true,  enum: USER_ROLES },
    authProvider: { type: String,  default: 'email', enum: AUTH_PROVIDERS },
    googleId:     { type: String,  default: null },
    status:       { type: String,  default: 'active', enum: ACCOUNT_STATUS },
    verified:     { type: Boolean, default: false },
    phone:        { type: String,  default: '' },
    cnic:         { type: String,  default: '' },
    city:         { type: String,  default: '' },
    address:      { type: String,  default: '' },
    avatar:       { type: String,  default: '' },
  },
  { timestamps: true }
);

// Hash password on create or update
tmsUserSchema.pre('save', async function hashBeforeSave(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, HASH_ROUNDS);
  next();
});

// Compare a plain-text password with the stored hash
tmsUserSchema.methods.comparePassword = function checkPassword(inputPwd) {
  return require('bcryptjs').compare(inputPwd, this.password);
};

module.exports = mg.model('User', tmsUserSchema);
