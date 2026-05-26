const express = require('express');
const router = express.Router();
const Notulen = require('../models/Notulen');
const { sendNotulen } = require('../services/mailer');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

// GET all — admin/executive sees all, user sees own
router.get('/', async (req, res) => {
  try {
    const filter = req.user.role === 'user' ? { createdBy: req.user._id } : {};
    const list = await Notulen.find(filter)
      .sort({ createdAt: -1 })
      .select('judul tanggal status penerima createdBy createdAt')
      .populate('createdBy', 'nama email');
    res.json({ ok: true, data: list });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// GET single
router.get('/:id', async (req, res) => {
  try {
    const doc = await Notulen.findById(req.params.id).populate('createdBy', 'nama email');
    if (!doc) return res.status(404).json({ ok: false, message: 'Notulen tidak ditemukan' });
    if (req.user.role === 'user' && String(doc.createdBy?._id || doc.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ ok: false, message: 'Akses ditolak' });
    }
    res.json({ ok: true, data: doc });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// POST create — admin & user only (executive read-only)
router.post('/', requireRole('admin', 'user'), async (req, res) => {
  try {
    const doc = new Notulen({ ...req.body, createdBy: req.user._id });
    await doc.save();
    res.status(201).json({ ok: true, data: doc });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
});

// PUT update
router.put('/:id', requireRole('admin', 'user'), async (req, res) => {
  try {
    const doc = await Notulen.findById(req.params.id);
    if (!doc) return res.status(404).json({ ok: false, message: 'Notulen tidak ditemukan' });
    if (req.user.role === 'user' && String(doc.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ ok: false, message: 'Akses ditolak' });
    }
    Object.assign(doc, req.body);
    await doc.save();
    res.json({ ok: true, data: doc });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
});

// DELETE
router.delete('/:id', requireRole('admin', 'user'), async (req, res) => {
  try {
    const doc = await Notulen.findById(req.params.id);
    if (!doc) return res.status(404).json({ ok: false, message: 'Notulen tidak ditemukan' });
    if (req.user.role === 'user' && String(doc.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ ok: false, message: 'Akses ditolak' });
    }
    await doc.deleteOne();
    res.json({ ok: true, message: 'Notulen dihapus' });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// POST send via email — admin & user
router.post('/:id/send', requireRole('admin', 'user'), async (req, res) => {
  try {
    const doc = await Notulen.findById(req.params.id);
    if (!doc) return res.status(404).json({ ok: false, message: 'Notulen tidak ditemukan' });
    if (req.user.role === 'user' && String(doc.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ ok: false, message: 'Akses ditolak' });
    }
    const { ccPemimpin = false } = req.body;
    await sendNotulen(doc, { ccPemimpin });
    doc.status = 'sent';
    doc.sentAt = new Date();
    await doc.save();
    res.json({ ok: true, message: `Notulen berhasil dikirim ke ${doc.penerima.length} penerima` });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;
