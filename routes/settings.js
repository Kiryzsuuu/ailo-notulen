const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/settings/kop — any authenticated user (needed for PDF)
router.get('/kop', async (req, res) => {
  try {
    const s = await Setting.findOne({ key: 'kop' });
    res.json({ ok: true, data: s?.value || {} });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// PUT /api/settings/kop — admin only
router.put('/kop', requireRole('admin'), async (req, res) => {
  try {
    await Setting.findOneAndUpdate(
      { key: 'kop' },
      { key: 'kop', value: req.body },
      { upsert: true, new: true, runValidators: false }
    );
    res.json({ ok: true, message: 'Kop surat disimpan' });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;
