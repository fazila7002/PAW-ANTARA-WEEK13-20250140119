const bcrypt = require('bcrypt');
const { User } = require('../models');

const SALT_ROUNDS = 10;

/**
 * 🛡️ DRY: logic hash & cek password ditulis sekali di sini, dipake
 * controllers/auth.controller.js (login & register) DAN seeders/seed.js.
 */
async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async function registerUser({ username, name, password, role = 'customer' }) {
  const existing = await User.findOne({ where: { username } });
  if (existing) {
    return { success: false, message: 'Username udah dipake, coba yang lain' };
  }

  const user = await User.create({
    username,
    name,
    password: await hashPassword(password),
    role,
  });

  return { success: true, user };
}

async function login({ username, password }) {
  const user = await User.findOne({ where: { username } });

  // pesan errornya sengaja disamain (gak bilang "username gak ada" vs
  // "password salah") biar orang gak bisa nebak username mana yang valid
  const gagal = { success: false, message: 'Username atau password salah' };

  if (!user) return gagal;

  const cocok = await bcrypt.compare(password, user.password);
  if (!cocok) return gagal;

  return { success: true, user };
}

/** Data yang aman disimpen di session (tanpa password hash). */
function toSessionUser(user) {
  return { id: user.id, username: user.username, name: user.name, role: user.role };
}

module.exports = { registerUser, login, hashPassword, toSessionUser };
