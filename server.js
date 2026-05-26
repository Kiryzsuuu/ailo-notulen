require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/notulen', require('./routes/notulen'));
app.use('/api/contacts', require('./routes/contacts'));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB terhubung');
    app.listen(PORT, () => console.log(`Ailo Notulen berjalan di http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('Gagal terhubung ke MongoDB:', err.message);
    process.exit(1);
  });
