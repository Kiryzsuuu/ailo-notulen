# Ailo Notulen

Sistem pencatatan dan distribusi notulen rapat otomatis — Telkom University's Center of Excellence.

## Prasyarat

- Node.js v18+
- MongoDB (lokal atau Atlas)
- Akun email (Gmail / SMTP lain)

## Instalasi

```bash
npm install
```

## Konfigurasi

Edit file `.env`:

```env
MONGODB_URI=mongodb://localhost:27017/ailo-notulen

MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=email@gmail.com
MAIL_PASS=app-password-gmail
MAIL_FROM="Ailo Notulen <email@gmail.com>"
```

> **Gmail**: Aktifkan 2FA lalu buat **App Password** di myaccount.google.com → Security → App Passwords.

## Menjalankan

```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

Buka `http://localhost:3000`

## Fitur

- Buat notulen terstruktur: informasi rapat, peserta, agenda, keputusan, action items
- Kelola daftar kontak penerima
- Kirim notulen ke semua penerima sekaligus dengan satu klik
- Template email HTML profesional dengan branding AILO
- Riwayat notulen tersimpan di MongoDB
- Responsif untuk desktop dan mobile

## Struktur

```
├── server.js          # Express server
├── models/            # Mongoose models
├── routes/            # API routes
├── services/mailer.js # Nodemailer service
└── public/            # Frontend (HTML, CSS, JS)
```
