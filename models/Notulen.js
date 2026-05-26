const mongoose = require('mongoose');

const actionItemSchema = new mongoose.Schema({
  tugas: { type: String, required: true },
  pic: { type: String, required: true },
  tenggat: { type: Date },
  status: { type: String, enum: ['open', 'done'], default: 'open' }
});

const notulenSchema = new mongoose.Schema({
  judul: { type: String, required: true, trim: true },
  tanggal: { type: Date, required: true },
  waktuMulai: { type: String },
  waktuSelesai: { type: String },
  lokasi: { type: String },
  pemimpinRapat: { type: String },
  notulis: { type: String },
  divisi: { type: String },
  peserta: { type: String },
  agenda: [{ type: String }],
  keputusan: { type: String },
  catatan: { type: String },
  actionItems: [actionItemSchema],
  penerima: [{ nama: String, email: String }],
  status: { type: String, enum: ['draft', 'sent'], default: 'draft' },
  sentAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Notulen', notulenSchema);
