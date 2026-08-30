const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { STATUS_LIST, STATUS_DEFAULT } = require('../utils/orderStatus');

/**
 * Order sekarang jadi "header" invoice: siapa pembelinya, statusnya apa,
 * totalnya berapa. Rincian produknya pindah ke models/orderItem.model.js
 * (1 order bisa punya banyak item) — relasinya didaftarin di models/index.js.
 */
const Order = sequelize.define(
  'Order',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: true }, // null kalau order lahir dari chat AI tanpa login
    buyerName: { type: DataTypes.STRING, allowNull: false },
    total: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    status: {
      type: DataTypes.ENUM(...STATUS_LIST),
      allowNull: false,
      defaultValue: STATUS_DEFAULT,
    },
    source: { type: DataTypes.STRING, allowNull: false, defaultValue: 'web' }, // 'web' | 'chat-ai'
  },
  { tableName: 'orders', timestamps: true }
);

module.exports = Order;
