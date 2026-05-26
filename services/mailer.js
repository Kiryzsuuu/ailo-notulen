const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT || '587'),
  secure: process.env.MAIL_SECURE === 'true',
  auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
});

// ── Email HTML base ───────────────────────
function baseHtml(content) {
  return `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
  <tr><td style="background:linear-gradient(135deg,#1A7C8D,#135F6D);padding:28px 32px;text-align:center;">
    <div style="font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.5px;">Ailo Notulen</div>
    <div style="font-size:12px;color:rgba(255,255,255,0.75);margin-top:4px;">Telkom University's Center of Excellence</div>
  </td></tr>
  <tr><td style="background:#E8701E;height:4px;"></td></tr>
  ${content}
  <tr><td style="padding:20px 32px;border-top:1px solid #f0f0f0;text-align:center;">
    <div style="font-size:12px;color:#888;">Email otomatis dari <strong>Ailo Notulen</strong>. Jangan balas email ini.</div>
  </td></tr>
</table>
</td></tr></table></body></html>`;
}

// ── Notulen email ─────────────────────────
function buildNotulenHtml(notulen) {
  const tanggal = new Date(notulen.tanggal).toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const agendaRows = (notulen.agenda || [])
    .map((a, i) => `<tr><td style="padding:6px 12px;color:#888;font-size:13px;">${i+1}.</td><td style="padding:6px 12px;font-size:13px;">${a}</td></tr>`)
    .join('');

  const actionRows = (notulen.actionItems || []).map(a => {
    const tgl = a.tenggat ? new Date(a.tenggat).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' }) : '-';
    const sc = a.status === 'done' ? '#3B6D11' : '#854F0B';
    const sb = a.status === 'done' ? '#EAF3DE' : '#FAEEDA';
    return `<tr>
      <td style="padding:8px 12px;font-size:13px;border-bottom:1px solid #f0f0f0;">${a.tugas}</td>
      <td style="padding:8px 12px;font-size:13px;color:#1A7C8D;border-bottom:1px solid #f0f0f0;">${a.pic}</td>
      <td style="padding:8px 12px;font-size:12px;color:#888;border-bottom:1px solid #f0f0f0;">${tgl}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;"><span style="background:${sb};color:${sc};padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;">${a.status === 'done' ? 'Selesai' : 'Buka'}</span></td>
    </tr>`;
  }).join('');

  const content = `
  <tr><td style="padding:28px 32px 16px;">
    <div style="font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#1A7C8D;margin-bottom:6px;">Notulen Rapat</div>
    <h1 style="margin:0;font-size:20px;font-weight:700;color:#111;line-height:1.3;">${notulen.judul}</h1>
  </td></tr>
  <tr><td style="padding:0 32px 20px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafb;border-radius:8px;border:1px solid #e8e8e8;">
      <tr><td style="padding:11px 16px;font-size:12px;color:#888;width:110px;">Tanggal</td><td style="padding:11px 16px;font-size:13px;font-weight:500;">${tanggal}</td></tr>
      <tr style="border-top:1px solid #f0f0f0;"><td style="padding:11px 16px;font-size:12px;color:#888;">Waktu</td><td style="padding:11px 16px;font-size:13px;font-weight:500;">${notulen.waktuMulai||''}${notulen.waktuSelesai ? ' – '+notulen.waktuSelesai : ''} WIB</td></tr>
      <tr style="border-top:1px solid #f0f0f0;"><td style="padding:11px 16px;font-size:12px;color:#888;">Lokasi</td><td style="padding:11px 16px;font-size:13px;font-weight:500;">${notulen.lokasi||'-'}</td></tr>
      <tr style="border-top:1px solid #f0f0f0;"><td style="padding:11px 16px;font-size:12px;color:#888;">Pemimpin</td><td style="padding:11px 16px;font-size:13px;font-weight:500;">${notulen.pemimpinRapat||'-'}</td></tr>
    </table>
  </td></tr>
  ${agendaRows ? `<tr><td style="padding:0 32px 20px;">
    <div style="font-size:12px;font-weight:700;color:#1A7C8D;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:10px;">Agenda</div>
    <table width="100%">${agendaRows}</table>
  </td></tr>` : ''}
  ${notulen.keputusan ? `<tr><td style="padding:0 32px 20px;">
    <div style="font-size:12px;font-weight:700;color:#1A7C8D;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:10px;">Poin Keputusan</div>
    <div style="font-size:13px;color:#333;line-height:1.7;background:#f8fafb;border-left:3px solid #1A7C8D;padding:12px 16px;border-radius:0 6px 6px 0;">${notulen.keputusan.replace(/\n/g,'<br>')}</div>
  </td></tr>` : ''}
  ${actionRows ? `<tr><td style="padding:0 32px 20px;">
    <div style="font-size:12px;font-weight:700;color:#1A7C8D;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:10px;">Tindak Lanjut</div>
    <table width="100%" style="border:1px solid #e8e8e8;border-radius:8px;overflow:hidden;">
      <thead><tr style="background:#f8fafb;">
        <th style="padding:8px 12px;font-size:10px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#888;text-align:left;">Tugas</th>
        <th style="padding:8px 12px;font-size:10px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#888;text-align:left;">PIC</th>
        <th style="padding:8px 12px;font-size:10px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#888;text-align:left;">Tenggat</th>
        <th style="padding:8px 12px;font-size:10px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#888;text-align:left;">Status</th>
      </tr></thead>
      <tbody>${actionRows}</tbody>
    </table>
  </td></tr>` : ''}`;

  return baseHtml(content);
}

// ── Reset password email ──────────────────
function buildResetHtml(user, resetUrl) {
  const content = `
  <tr><td style="padding:32px 32px 20px;text-align:center;">
    <div style="width:56px;height:56px;border-radius:50%;background:#FEF3EA;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
      <span style="font-size:28px;">🔒</span>
    </div>
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111;">Reset Password</h2>
    <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 24px;">
      Hai <strong>${user.nama}</strong>,<br>kami menerima permintaan reset password untuk akun Anda.
    </p>
    <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#E8701E,#D4631A);color:#fff;text-decoration:none;padding:13px 32px;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:0.01em;">Reset Password Saya</a>
    <p style="font-size:12px;color:#888;margin:20px 0 0;">Link ini berlaku selama <strong>1 jam</strong>.<br>Jika Anda tidak meminta reset, abaikan email ini.</p>
  </td></tr>`;
  return baseHtml(content);
}

// ── Welcome email ─────────────────────────
function buildWelcomeHtml(user) {
  const content = `
  <tr><td style="padding:32px 32px 20px;text-align:center;">
    <div style="width:56px;height:56px;border-radius:50%;background:#E6F5F7;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
      <span style="font-size:28px;">👋</span>
    </div>
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111;">Selamat datang, ${user.nama}!</h2>
    <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 24px;">
      Akun Ailo Notulen Anda telah berhasil dibuat.<br>
      Mulai buat dan distribusikan notulen rapat secara efisien.
    </p>
    <a href="${process.env.APP_URL}" style="display:inline-block;background:linear-gradient(135deg,#1A7C8D,#135F6D);color:#fff;text-decoration:none;padding:13px 32px;border-radius:8px;font-size:14px;font-weight:600;">Buka Ailo Notulen</a>
  </td></tr>`;
  return baseHtml(content);
}

// ── Exported functions ────────────────────
async function sendNotulen(notulen, options = {}) {
  const { ccPemimpin = false } = options;
  const recipients = notulen.penerima || [];
  if (!recipients.length) throw new Error('Tidak ada penerima');
  const toList = recipients.map(r => `"${r.nama}" <${r.email}>`).join(', ');
  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: toList,
    subject: `📋 Notulen — ${notulen.judul}`,
    html: buildNotulenHtml(notulen)
  });
}

async function sendResetPassword(user, resetUrl) {
  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: `"${user.nama}" <${user.email}>`,
    subject: '🔒 Reset Password — Ailo Notulen',
    html: buildResetHtml(user, resetUrl)
  });
}

async function sendWelcome(user) {
  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: `"${user.nama}" <${user.email}>`,
    subject: '👋 Selamat datang di Ailo Notulen!',
    html: buildWelcomeHtml(user)
  });
}

module.exports = { sendNotulen, sendResetPassword, sendWelcome };
