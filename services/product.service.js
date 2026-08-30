const { Product } = require('../models');
const { formatRupiah } = require('../utils/formatRupiah');

/**
 * 🛡️ DRY - SERVICE LAYER
 * ============================================================
 * Semua fungsi di file ini dipanggil dari 2 tempat beda:
 * 1. controllers/product.controller.js (buat REST API / web)
 * 2. bot/handlers/produk.handler.js   (buat bot Telegram)
 *
 * Tanpa layer ini, query "ambil semua produk" bakal ditulis 2 kali
 * di 2 tempat beda - kalo suatu saat query-nya perlu diubah (misal
 * nambah filter stok), kita harus inget ubah di 2 tempat. Gampang
 * lupa salah satu, jadi sumber bug.
 *
 * Dengan service layer: query cukup ditulis SEKALI di sini,
 * controller & bot handler tinggal MEMANGGIL fungsi ini.
 * ============================================================
 */

async function getAllProducts() {
  return Product.findAll({ order: [['id', 'ASC']] });
}

async function getProductById(id) {
  return Product.findByPk(id);
}

/**
 * Format daftar produk jadi teks siap kirim - dipake bot Telegram
 * buat balesan /produk. Sengaja dipisah dari getAllProducts() biar
 * fungsi query & fungsi format gak nyampur (single responsibility).
 */
function formatProductListText(products) {
  if (products.length === 0) {
    return 'Belum ada produk tersedia.';
  }

  const lines = products.map((p) => {
    const stockInfo = p.stock > 0 ? `Stok: ${p.stock}` : 'HABIS';
    return `#${p.id} — ${p.name}\n${formatRupiah(p.price)} | ${stockInfo}`;
  });

  return lines.join('\n\n');
}

/**
 * 🛡️ CRUD ADMIN — validasi & normalisasi input ditaruh di service (SATU tempat),
 * bukan diulang di tiap controller. Jadi kalau nanti produk juga bisa
 * ditambah lewat API atau bot, aturannya tetep sama persis.
 */
function validateProductInput({ name, price, stock, description }) {
  const errors = [];

  if (!name || !String(name).trim()) errors.push('Nama produk wajib diisi');
  if (String(name || '').trim().length > 100) errors.push('Nama produk maksimal 100 karakter');

  const hargaAngka = Number(price);
  if (!Number.isFinite(hargaAngka) || hargaAngka <= 0) errors.push('Harga harus angka lebih dari 0');

  const stokAngka = Number(stock);
  if (!Number.isInteger(stokAngka) || stokAngka < 0) errors.push('Stok harus angka bulat minimal 0');

  return {
    errors,
    data: {
      name: String(name || '').trim(),
      description: String(description || '').trim(),
      price: Math.round(hargaAngka) || 0,
      stock: stokAngka || 0,
    },
  };
}

async function createProduct(input) {
  const { errors, data } = validateProductInput(input);
  if (errors.length) return { success: false, errors };

  const product = await Product.create(data);
  return { success: true, product };
}

async function updateProduct(id, input) {
  const product = await Product.findByPk(id);
  if (!product) return { success: false, errors: ['Produk gak ditemukan'] };

  const { errors, data } = validateProductInput(input);
  if (errors.length) return { success: false, errors };

  await product.update(data);
  return { success: true, product };
}

async function deleteProduct(id) {
  const product = await Product.findByPk(id);
  if (!product) return { success: false, message: 'Produk gak ditemukan' };

  const nama = product.name;
  await product.destroy();
  return { success: true, message: `Produk "${nama}" berhasil dihapus` };
}

/** Ringkasan stok buat dashboard admin. */
async function getProductStats() {
  const products = await getAllProducts();
  return {
    total: products.length,
    habis: products.filter((p) => p.stock === 0).length,
    menipis: products.filter((p) => p.stock > 0 && p.stock <= 5).length,
  };
}

module.exports = {
  getAllProducts,
  getProductById,
  formatProductListText,
  validateProductInput,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStats,
};
