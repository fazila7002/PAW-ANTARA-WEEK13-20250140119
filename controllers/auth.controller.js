const authService = require('../services/auth.service');

function showLogin(req, res) {
  res.render('auth/login', { error: null, old: { username: '' } });
}

async function handleLogin(req, res) {
  const { username, password } = req.body;

  const result = await authService.login({
    username: String(username || '').trim(),
    password: String(password || ''),
  });

  if (!result.success) {
    return res.status(401).render('auth/login', {
      error: result.message,
      old: { username: String(username || '').trim() },
    });
  }

  req.session.user = authService.toSessionUser(result.user);

  // BEDA ROLE, BEDA TUJUAN: admin masuk ke dashboard admin,
  // customer masuk ke katalog belanja.
  return res.redirect(result.user.role === 'admin' ? '/admin' : '/');
}

function showRegister(req, res) {
  res.render('auth/register', { errors: [], old: { username: '', name: '' } });
}

async function handleRegister(req, res) {
  const { username, name, password } = req.body;
  const errors = [];

  const u = String(username || '').trim();
  const n = String(name || '').trim();
  const p = String(password || '');

  if (u.length < 3) errors.push('Username minimal 3 karakter');
  if (!n) errors.push('Nama wajib diisi');
  if (p.length < 6) errors.push('Password minimal 6 karakter');

  if (errors.length === 0) {
    // pendaftaran publik SELALU jadi customer — role admin cuma dari seeder,
    // biar orang gak bisa daftar terus tiba-tiba jadi admin
    const result = await authService.registerUser({ username: u, name: n, password: p });

    if (!result.success) errors.push(result.message);
    else {
      req.session.user = authService.toSessionUser(result.user);
      return res.redirect('/');
    }
  }

  return res.status(400).render('auth/register', { errors, old: { username: u, name: n } });
}

function logout(req, res) {
  req.session.destroy(() => res.redirect('/login'));
}

module.exports = { showLogin, handleLogin, showRegister, handleRegister, logout };
