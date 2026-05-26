const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  nama: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  jabatan: { type: String },
  divisi: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Contact', contactSchema);
