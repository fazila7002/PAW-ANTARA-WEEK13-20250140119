require('dotenv').config();
const { sequelize, Product, User } = require('../models');
const { hashPassword } = require('../services/auth.service');

const PRODUK = [
  // Atasan
  { name: 'Kaos Polos Cotton Combed A', description: 'Cotton combed 30s, adem, warna hitam & putih. Cocok harian, harga terjangkau.', price: 75000, stock: 50 },
  { name: 'Kaos Polos Cotton Combed B', description: 'Cotton combed 24s, lebih tebal & premium dari versi A, warna navy & maroon.', price: 95000, stock: 30 },
  { name: 'Kaos Oversize Basic', description: 'Potongan oversize, bahan cotton combed 24s, unisex.', price: 110000, stock: 25 },
  { name: 'Kemeja Flanel Kotak', description: 'Motif kotak-kotak, bahan tebal, cocok buat cuaca dingin.', price: 150000, stock: 20 },
  { name: 'Kemeja Putih Formal', description: 'Bahan katun premium, cocok buat kerja & acara formal.', price: 185000, stock: 18 },
  { name: 'Kemeja Denim Casual', description: 'Bahan denim ringan, bisa dipake outer atau kemeja biasa.', price: 210000, stock: 12 },
  { name: 'Hoodie Fleece Polos', description: 'Bahan fleece tebal, ada kantong depan, unisex.', price: 195000, stock: 22 },
  { name: 'Sweater Rajut Basic', description: 'Rajut halus, hangat tapi gak gerah, banyak pilihan warna.', price: 165000, stock: 16 },
  { name: 'Jaket Bomber Hitam', description: 'Bahan tebal anti angin, resleting YKK, gaya kasual.', price: 250000, stock: 8 },
  { name: 'Jaket Denim Wash', description: 'Denim wash effect, potongan regular fit.', price: 275000, stock: 6 },

  // Bawahan
  { name: 'Celana Chino Slim Fit', description: 'Warna khaki, bahan stretch, nyaman dipake seharian.', price: 180000, stock: 15 },
  { name: 'Celana Jeans Regular', description: 'Denim 12oz, potongan regular, warna biru gelap.', price: 220000, stock: 20 },
  { name: 'Celana Cargo Pants', description: 'Banyak kantong, bahan ripstop, cocok buat outdoor.', price: 235000, stock: 10 },
  { name: 'Celana Pendek Chino', description: 'Selutut, bahan chino stretch, cocok buat santai.', price: 125000, stock: 28 },
  { name: 'Jogger Pants Fleece', description: 'Karet di pergelangan, bahan fleece adem.', price: 145000, stock: 24 },

  // Sepatu & aksesoris
  { name: 'Sepatu Sneakers Canvas', description: 'Cocok buat kasual, tersedia banyak ukuran.', price: 220000, stock: 30 },
  { name: 'Sepatu Running Mesh', description: 'Bahan mesh breathable, sol empuk buat lari.', price: 320000, stock: 14 },
  { name: 'Sepatu Formal Kulit', description: 'Kulit sintetis premium, cocok buat kerja.', price: 385000, stock: 9 },
  { name: 'Sandal Slide Casual', description: 'Sol empuk anti slip, ringan dipake.', price: 85000, stock: 40 },
  { name: 'Topi Baseball Polos', description: 'Adjustable strap, banyak pilihan warna.', price: 65000, stock: 45 },
  { name: 'Tas Selempang Kanvas', description: 'Muat tablet 10 inch, bahan kanvas tebal.', price: 135000, stock: 17 },
  { name: 'Tas Ransel Laptop 15 inch', description: 'Kompartemen laptop empuk, bahan tahan air.', price: 265000, stock: 11 },
  { name: 'Ikat Pinggang Kulit', description: 'Kulit asli, gesper metal, panjang bisa dipotong.', price: 95000, stock: 26 },
  { name: 'Kaos Kaki Sport 3 Pasang', description: 'Bahan katun, isi 3 pasang per paket.', price: 45000, stock: 60 },
  { name: 'Dompet Kulit Bifold', description: 'Slot kartu 6, bahan kulit sapi asli.', price: 115000, stock: 3 },
];

const USERS = [
  { username: 'admin', name: 'Admin Toko', password: 'admin123', role: 'admin' },
  { username: 'budi', name: 'Budi Santoso', password: 'budi123', role: 'customer' },
  { username: 'sari', name: 'Sari Wulandari', password: 'sari123', role: 'customer' },
];

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Koneksi database berhasil');
    await sequelize.sync();

    // ── user 2 role: admin & customer ──
    for (const u of USERS) {
      const [user, dibuat] = await User.findOrCreate({
        where: { username: u.username },
        defaults: { ...u, password: await hashPassword(u.password) },
      });
      console.log(`${dibuat ? '✅ dibuat' : 'ℹ️  udah ada'}: ${user.username} (${user.role})`);
    }

    // ── produk (banyak, bukan cuma 1-2 dummy) ──
    const existingProducts = await Product.count();
    if (existingProducts === 0) {
      await Product.bulkCreate(PRODUK);
      console.log(`✅ ${PRODUK.length} produk berhasil ditambahin`);
    } else {
      console.log(`ℹ️  Produk udah ada (${existingProducts}), skip supaya gak dobel`);
    }

    console.log('\nSeeding selesai ✅');
    console.log('Login admin    : admin / admin123');
    console.log('Login customer : budi / budi123');
    process.exit(0);
  } catch (err) {
    console.error('Gagal seeding:', err.message);
    process.exit(1);
  }
}

seed();
