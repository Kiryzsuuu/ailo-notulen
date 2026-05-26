const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  nama: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'executive', 'user'], default: 'user' },
  aktif: { type: Boolean, default: true },
  jabatan: { type: String, default: '' },
  divisi: { type: String, default: '' },
  bio: { type: String, default: '' },
  lastLogin: { type: Date },
  resetToken: { type: String },
  resetTokenExpiry: { type: Date }
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.cekPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.set('toJSON', {
  transform(doc, ret) { delete ret.password; delete ret.resetToken; return ret; }
});

module.exports = mongoose.model('User', userSchema);
