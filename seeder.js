require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB terhubung');

  const existing = await User.findOne({ email: 'maskiryz23@gmail.com' });
  if (existing) {
    // Update role to admin just in case
    existing.role = 'admin';
    existing.nama = 'Admin Ailo';
    existing.aktif = true;
    existing.password = 'opet123';
    await existing.save();
    console.log('Admin diperbarui: maskiryz23@gmail.com');
  } else {
    await User.create({
      nama: 'Admin Ailo',
      email: 'maskiryz23@gmail.com',
      password: 'opet123',
      role: 'admin',
      jabatan: 'Administrator',
      divisi: 'IT'
    });
    console.log('Admin dibuat: maskiryz23@gmail.com');
  }

  console.log('Seeder selesai. Silakan login dengan:');
  console.log('  Email   : maskiryz23@gmail.com');
  console.log('  Password: opet123');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
