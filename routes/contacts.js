const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const q = req.query.q;
    const filter = q ? { $or: [{ nama: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }] } : {};
    const list = await Contact.find(filter).sort({ nama: 1 });
    res.json({ ok: true, data: list });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.post('/', requireRole('admin', 'user'), async (req, res) => {
  try {
    const doc = new Contact(req.body);
    await doc.save();
    res.status(201).json({ ok: true, data: doc });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
});

router.put('/:id', requireRole('admin', 'user'), async (req, res) => {
  try {
    const doc = await Contact.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ ok: false, message: 'Kontak tidak ditemukan' });
    res.json({ ok: true, data: doc });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await Contact.findByIdAndDelete(req.params.id);
    res.json({ ok: true, message: 'Kontak dihapus' });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;
