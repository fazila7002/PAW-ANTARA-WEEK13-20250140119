const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * User punya 2 role: 'admin' & 'customer'.
 * Role ini yang dipake middlewares/auth.middleware.js buat nentuin
 * siapa boleh buka halaman apa (liat requireRole).
 */
const User = sequelize.define(
  'User',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    name: { type: DataTypes.STRING, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false }, // hash bcrypt, bukan plain text
    role: {
      type: DataTypes.ENUM('admin', 'customer'),
      allowNull: false,
      defaultValue: 'customer',
    },
  },
  { tableName: 'users', timestamps: true }
);

module.exports = User;
