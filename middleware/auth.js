const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
  if (!token) return res.status(401).json({ ok: false, message: 'Tidak terautentikasi' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select('-password');
    if (!user || !user.aktif) return res.status(401).json({ ok: false, message: 'Sesi tidak valid' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ ok: false, message: 'Token tidak valid atau kedaluwarsa' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ ok: false, message: 'Tidak terautentikasi' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ ok: false, message: 'Akses ditolak: izin tidak cukup' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
