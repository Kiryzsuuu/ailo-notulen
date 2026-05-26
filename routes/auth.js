const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { requireAuth, requireRole } = require('../middleware/auth');
const { sendResetPassword, sendWelcome } = require('../services/mailer');

function sign(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { nama, email, password } = req.body;
  if (!nama || !email || !password) return res.status(400).json({ ok: false, message: 'Semua field wajib diisi' });
  if (password.length < 6) return res.status(400).json({ ok: false, message: 'Password minimal 6 karakter' });
  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ ok: false, message: 'Email sudah terdaftar' });
    const user = new User({ nama, email, password, role: 'user' });
    await user.save();
    try { await sendWelcome(user); } catch {}
    res.status(201).json({ ok: true, message: 'Akun berhasil dibuat. Silakan login.' });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ ok: false, message: 'Email dan password wajib diisi' });
  try {
    const user = await User.findOne({ email });
    if (!user || !user.aktif) return res.status(401).json({ ok: false, message: 'Email atau password salah' });
    const valid = await user.cekPassword(password);
    if (!valid) return res.status(401).json({ ok: false, message: 'Email atau password salah' });
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
    res.json({ ok: true, token: sign(user), user });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ ok: true, user: req.user });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ ok: false, message: 'Email wajib diisi' });
  try {
    const user = await User.findOne({ email });
    // Always return OK to prevent email enumeration
    if (!user) return res.json({ ok: true, message: 'Jika email terdaftar, link reset akan dikirim.' });

    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken = token;
    user.resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.APP_URL}/reset-password?token=${token}`;
    await sendResetPassword(user, resetUrl);
    res.json({ ok: true, message: 'Link reset password telah dikirim ke email Anda.' });
  } catch (e) {
    res.status(500).json({ ok: false, message: 'Gagal mengirim email: ' + e.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ ok: false, message: 'Token dan password wajib diisi' });
  if (password.length < 6) return res.status(400).json({ ok: false, message: 'Password minimal 6 karakter' });
  try {
    const user = await User.findOne({ resetToken: token, resetTokenExpiry: { $gt: new Date() } });
    if (!user) return res.status(400).json({ ok: false, message: 'Token tidak valid atau sudah kedaluwarsa' });
    user.password = password;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();
    res.json({ ok: true, message: 'Password berhasil direset. Silakan login.' });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// PUT /api/auth/profile — update own profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { nama, jabatan, divisi, bio } = req.body;
    const user = await User.findById(req.user._id);
    if (nama) user.nama = nama;
    if (jabatan !== undefined) user.jabatan = jabatan;
    if (divisi !== undefined) user.divisi = divisi;
    if (bio !== undefined) user.bio = bio;
    await user.save({ validateBeforeSave: false });
    res.json({ ok: true, user, message: 'Profil berhasil diperbarui' });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// PUT /api/auth/email — change own email (requires password)
router.put('/email', requireAuth, async (req, res) => {
  const { emailBaru, password } = req.body;
  if (!emailBaru || !password) return res.status(400).json({ ok: false, message: 'Email baru dan password wajib diisi' });
  try {
    const user = await User.findById(req.user._id);
    const valid = await user.cekPassword(password);
    if (!valid) return res.status(400).json({ ok: false, message: 'Password salah' });
    const exists = await User.findOne({ email: emailBaru.toLowerCase() });
    if (exists) return res.status(400).json({ ok: false, message: 'Email sudah digunakan' });
    user.email = emailBaru.toLowerCase();
    await user.save({ validateBeforeSave: false });
    res.json({ ok: true, user, token: sign(user), message: 'Email berhasil diperbarui' });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// PUT /api/auth/password — change own password
router.put('/password', requireAuth, async (req, res) => {
  const { passwordLama, passwordBaru } = req.body;
  if (!passwordLama || !passwordBaru) return res.status(400).json({ ok: false, message: 'Semua field wajib diisi' });
  if (passwordBaru.length < 6) return res.status(400).json({ ok: false, message: 'Password minimal 6 karakter' });
  try {
    const user = await User.findById(req.user._id);
    const valid = await user.cekPassword(passwordLama);
    if (!valid) return res.status(400).json({ ok: false, message: 'Password lama salah' });
    user.password = passwordBaru;
    await user.save();
    res.json({ ok: true, message: 'Password berhasil diubah' });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// ── USER MANAGEMENT (admin only) ──

router.get('/users', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ ok: true, data: users });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.post('/users', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { nama, email, password, role, jabatan, divisi } = req.body;
    if (!nama || !email || !password) return res.status(400).json({ ok: false, message: 'Nama, email, dan password wajib diisi' });
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ ok: false, message: 'Email sudah terdaftar' });
    const user = new User({ nama, email, password, role: role || 'user', jabatan, divisi });
    await user.save();
    res.status(201).json({ ok: true, data: user });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
});

router.put('/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { nama, email, role, jabatan, divisi, aktif, password } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ ok: false, message: 'Pengguna tidak ditemukan' });
    if (nama) user.nama = nama;
    if (email) user.email = email;
    if (role) user.role = role;
    if (jabatan !== undefined) user.jabatan = jabatan;
    if (divisi !== undefined) user.divisi = divisi;
    if (aktif !== undefined) user.aktif = aktif;
    if (password) user.password = password;
    await user.save();
    res.json({ ok: true, data: user });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
});

router.delete('/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ ok: false, message: 'Tidak dapat menghapus akun sendiri' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ ok: true, message: 'Pengguna dihapus' });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;
