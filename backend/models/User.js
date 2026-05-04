// ─── User Model ──────────────────────────────────────────────────────────────
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:     { type: String, minlength: 6, select: false },
  role:         { type: String, enum: ['tenant','landlord'], required: true },
  authProvider: { type: String, enum: ['email','google'], default: 'email' },
  googleId:     { type: String, default: null },
  status:       { type: String, enum: ['active','blocked'], default: 'active' },
  verified:     { type: Boolean, default: false },
  phone:        { type: String, default: '' },
  cnic:         { type: String, default: '' },
  city:         { type: String, default: '' },
  address:      { type: String, default: '' },
  avatar:       { type: String, default: '' },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});
userSchema.methods.comparePassword = function(p) { return require('bcryptjs').compare(p, this.password); };

module.exports = mongoose.model('User', userSchema);
