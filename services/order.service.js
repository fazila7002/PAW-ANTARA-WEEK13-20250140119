const { sequelize, Order, OrderItem, Product, User } = require('../models');
const { formatRupiah } = require('../utils/formatRupiah');
const { getStatusLabel, isValidStatus, STATUS_CANCELLED } = require('../utils/orderStatus');
const bot = require('../config/telegram');

/**
 * 🛡️ DRY - SERVICE LAYER
 * ============================================================
 * createOrder() adalah SATU-SATUNYA tempat logic pemesanan ditulis, dan
 * dipanggil dari beberapa jalur masuk yang beda:
 *   1. Keranjang di web           -> controllers/page.controller.js (checkout)
 *   2. Chat AI (function calling) -> services/gemini.service.js
 *   3. Kalau nanti nambah jalur baru, tinggal panggil fungsi yang sama
 *
 * Semua langkah — validasi stok, potong stok, simpan order + itemnya,
 * hitung total, notifikasi admin ke Telegram — cukup ditulis SEKALI.
 *
 * SEKARANG SUPPORT MULTIPLE ORDER: parameter `items` berupa array, jadi
 * 1 transaksi bisa banyak jenis produk sekaligus. Semua dibungkus dalam
 * DATABASE TRANSACTION: kalau salah satu item stoknya kurang, SEMUA
 * dibatalkan (gak ada order setengah jadi / stok kepotong sebagian).
 * ============================================================
 */
async function createOrder({ items, buyerName, userId = null, source = 'web' }) {
  if (!Array.isArray(items) || items.length === 0) {
    return { success: false, message: 'Keranjang masih kosong' };
  }

  if (!buyerName || !String(buyerName).trim()) {
    return { success: false, message: 'Nama pembeli wajib diisi' };
  }

  // gabungin item dobel (produk sama dipesan 2x) biar stoknya kehitung bener
  const merged = new Map();
  for (const item of items) {
    const productId = parseInt(item.productId, 10);
    const quantity = parseInt(item.quantity, 10);

    if (!productId || !quantity || quantity < 1) {
      return { success: false, message: 'Ada item pesanan yang gak valid' };
    }
    merged.set(productId, (merged.get(productId) || 0) + quantity);
  }

  const transaction = await sequelize.transaction();

  try {
    const produkTervalidasi = [];

    // 1) cek dulu SEMUA item sebelum nyentuh stok satupun
    for (const [productId, quantity] of merged) {
      const product = await Product.findByPk(productId, { transaction });

      if (!product) {
        await transaction.rollback();
        return { success: false, message: `Produk dengan ID ${productId} gak ditemukan` };
      }

      if (product.stock < quantity) {
        await transaction.rollback();
        return {
          success: false,
          message: `Stok "${product.name}" gak cukup. Tersedia: ${product.stock}, diminta: ${quantity}`,
        };
      }

      produkTervalidasi.push({ product, quantity });
    }

    // 2) semua aman -> bikin header order
    const total = produkTervalidasi.reduce((sum, p) => sum + p.product.price * p.quantity, 0);

    const order = await Order.create(
      { buyerName: String(buyerName).trim(), userId, total, source },
      { transaction }
    );

    // 3) simpan tiap item + potong stoknya
    for (const { product, quantity } of produkTervalidasi) {
      await OrderItem.create(
        {
          orderId: order.id,
          productId: product.id,
          productName: product.name, // snapshot, biar invoice lama tetep utuh
          price: product.price,
          quantity,
        },
        { transaction }
      );

      product.stock -= quantity;
      await product.save({ transaction });
    }

    await transaction.commit();

    const orderLengkap = await getOrderById(order.id);

    // 🛡️ DRY: notifikasi admin otomatis ke-trigger dari sini, apapun jalur ordernya
    await notifyAdminNewOrder(orderLengkap);

    return { success: true, order: orderLengkap };
  } catch (err) {
    await transaction.rollback();
    return { success: false, message: `Gagal memproses pesanan: ${err.message}` };
  }
}

/** Ambil 1 order lengkap sama item & pembelinya (dipake invoice detail + notifikasi). */
async function getOrderById(id) {
  return Order.findByPk(id, {
    include: [
      { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
      { model: User, as: 'user', attributes: ['id', 'username', 'name'] },
    ],
    order: [[{ model: OrderItem, as: 'items' }, 'id', 'ASC']],
  });
}

async function getAllOrders() {
  return Order.findAll({
    include: [
      { model: OrderItem, as: 'items' },
      { model: User, as: 'user', attributes: ['id', 'name'] },
    ],
    order: [['createdAt', 'DESC']],
  });
}

/** Order milik 1 customer aja — dipake halaman invoice sisi customer. */
async function getOrdersByUser(userId) {
  return Order.findAll({
    where: { userId },
    include: [{ model: OrderItem, as: 'items' }],
    order: [['createdAt', 'DESC']],
  });
}

/**
 * Admin ubah status pesanan. Kalau dibatalkan, stok produknya DIKEMBALIIN
 * (dan cuma sekali — kalau statusnya udah 'dibatalkan', gak diproses lagi).
 */
async function updateOrderStatus(orderId, newStatus) {
  if (!isValidStatus(newStatus)) {
    return { success: false, message: `Status "${newStatus}" gak dikenal` };
  }

  const order = await getOrderById(orderId);
  if (!order) return { success: false, message: 'Pesanan gak ditemukan' };

  const statusLama = order.status;
  if (statusLama === newStatus) {
    return { success: true, order, message: 'Status gak berubah' };
  }

  const transaction = await sequelize.transaction();
  try {
    // balikin stok cuma pas transisi ke 'dibatalkan' dari status non-batal
    if (newStatus === STATUS_CANCELLED && statusLama !== STATUS_CANCELLED) {
      for (const item of order.items) {
        const product = await Product.findByPk(item.productId, { transaction });
        if (product) {
          product.stock += item.quantity;
          await product.save({ transaction });
        }
      }
    }

    order.status = newStatus;
    await order.save({ transaction });
    await transaction.commit();

    return {
      success: true,
      order: await getOrderById(orderId),
      message: `Status berubah dari "${getStatusLabel(statusLama)}" jadi "${getStatusLabel(newStatus)}"`,
    };
  } catch (err) {
    await transaction.rollback();
    return { success: false, message: `Gagal ubah status: ${err.message}` };
  }
}

/**
 * Kirim notifikasi ke admin lewat Telegram tiap ada order baru, APAPUN
 * sumbernya (keranjang web atau chat AI). Isi pesannya sekarang nampilin
 * SEMUA item dalam 1 pesanan, bukan cuma 1 produk.
 */
async function notifyAdminNewOrder(order) {
  const adminChatId = process.env.ADMIN_TELEGRAM_CHAT_ID;

  if (!bot || !adminChatId || adminChatId === 'isi-chat-id-admin') {
    console.log('ℹ️  Notifikasi admin dilewati (bot/ADMIN_TELEGRAM_CHAT_ID belum diset)');
    return;
  }

  const barisItem = order.items.map((item) => {
    const sisa = item.product ? item.product.stock : '-';
    const peringatan = item.product && item.product.stock <= 5 ? ' ⚠️ MENIPIS' : '';
    return `• ${item.productName} x${item.quantity} = ${formatRupiah(item.price * item.quantity)}\n  (sisa stok: ${sisa}${peringatan})`;
  });

  const text = [
    '🔔 Order baru masuk!',
    '',
    `Invoice: INV-${String(order.id).padStart(5, '0')}`,
    `Pembeli: ${order.buyerName}`,
    `Sumber: ${order.source === 'chat-ai' ? 'Chat AI' : 'Web'}`,
    '',
    `Rincian (${order.items.length} jenis produk):`,
    ...barisItem,
    '',
    `Total: ${formatRupiah(order.total)}`,
    `Status: ${getStatusLabel(order.status)}`,
  ].join('\n');

  try {
    await bot.sendMessage(adminChatId, text);
  } catch (err) {
    console.error('Gagal kirim notifikasi ke admin:', err.message);
  }
}

/** Ringkasan buat dashboard admin. */
async function getOrderStats() {
  const orders = await Order.findAll();
  const totalPendapatan = orders
    .filter((o) => o.status !== STATUS_CANCELLED)
    .reduce((sum, o) => sum + o.total, 0);

  return {
    totalOrder: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    selesai: orders.filter((o) => o.status === 'selesai').length,
    totalPendapatan,
  };
}

module.exports = {
  createOrder,
  getOrderById,
  getAllOrders,
  getOrdersByUser,
  updateOrderStatus,
  notifyAdminNewOrder,
  getOrderStats,
};
