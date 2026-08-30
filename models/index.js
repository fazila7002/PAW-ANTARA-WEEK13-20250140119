const sequelize = require('../config/database');
const Product = require('./product.model');
const Order = require('./order.model');
const OrderItem = require('./orderItem.model');
const User = require('./user.model');

/**
 * 🛡️ Semua relasi dikumpulin di SATU tempat (bukan nyebar di tiap file model),
 * biar gampang dibaca & gak ada relasi yang kedefinisi dobel.
 *
 *   User (1) ──< Order (1) ──< OrderItem >── Product
 */
Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

Product.hasMany(OrderItem, { foreignKey: 'productId', as: 'orderItems' });
OrderItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = { sequelize, Product, Order, OrderItem, User };
