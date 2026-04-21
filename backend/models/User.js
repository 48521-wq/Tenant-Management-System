// ============================================================
// TMS User Model
// Supports email/password login and Google OAuth
// ============================================================
const mongoose  = require('mongoose');
const bcryptLib = require('bcryptjs');

const SALT_ROUNDS = 10;

const userSchema = new mongoose.Schema(
  {
    name:         { type: String, required: true,  trim: true },
    email:        { type: String, required: true,  unique: true, lowercase: true, trim: true },
    password:     { type: String, minlength: 6,    select: false },
    role:         { type: String, required: true,  enum: ['tenant', 'landlord'] },
    authProvider: { type: String, default: 'email', enum: ['email', 'google'] },
    googleId:     { type: String, default: null },
    status:       { type: String, default: 'active', enum: ['active', 'blocked'] },
    verified:     { type: Boolean, default: false },
    phone:        { type: String, default: '' },
    cnic:         { type: String, default: '' },
    city:         { type: String, default: '' },
    address:      { type: String, default: '' },
    avatar:       { type: String, default: '' },
  },
  { timestamps: true }
);

// Auto-hash password whenever it is set or changed
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcryptLib.hash(this.password, SALT_ROUNDS);
  next();
});

// Instance method — compare plain password against stored hash
userSchema.methods.comparePassword = function (plainPwd) {
  return require('bcryptjs').compare(plainPwd, this.password);
};

module.exports = mongoose.model('User', userSchema);
