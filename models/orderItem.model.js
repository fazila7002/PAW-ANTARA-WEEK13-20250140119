const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * INI KUNCI MULTIPLE ORDER.
 * Dulu 1 order = 1 produk (kolom productId nempel langsung di tabel orders),
 * jadi beli 2 jenis barang sekaligus mustahil. Sekarang dipecah:
 *
 *   Order (1) ──< OrderItem (banyak) >── Product
 *
 * Satu Order bisa punya banyak OrderItem, tiap item nyimpen produk +
 * jumlah + harga SAAT DIBELI (price snapshot), biar invoice lama gak
 * ikut berubah kalau harga produknya nanti diupdate admin.
 */
const OrderItem = sequelize.define(
  'OrderItem',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    orderId: { type: DataTypes.INTEGER, allowNull: false },
    productId: { type: DataTypes.INTEGER, allowNull: false },
    productName: { type: DataTypes.STRING, allowNull: false }, // snapshot nama
    price: { type: DataTypes.INTEGER, allowNull: false }, // snapshot harga satuan
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  },
  { tableName: 'order_items', timestamps: true }
);

// subtotal gak disimpen di database, cukup dihitung dari price * quantity
OrderItem.prototype.getSubtotal = function () {
  return this.price * this.quantity;
};

module.exports = OrderItem;
