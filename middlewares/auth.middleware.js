/**
 * 🛡️ DRY — PROTEKSI ROUTE DITULIS SEKALI DI SINI
 * ============================================================
 * Sebelumnya tiap controller harus ngecek sendiri "user udah login belum?"
 * dan "dia admin bukan?". Sekarang cek-nya dibungkus jadi middleware,
 * tinggal dipasang di route:
 *
 *   router.get('/admin/produk', requireLogin, requireRole('admin'), ...)
 *
 * requireRole() sengaja dibikin "factory" (fungsi yang balikin middleware)
 * biar satu fungsi bisa dipake buat role apapun, gak perlu bikin
 * requireAdmin + requireCustomer yang isinya mirip-mirip.
 * ============================================================
 */

// Nempelin data user ke res.locals biar SEMUA view bisa langsung baca
// `user` tanpa tiap controller harus ngoper variabel itu satu-satu.
function attachUser(req, res, next) {
  res.locals.user = req.session?.user || null;
  res.locals.storeName = process.env.STORE_NAME || 'Toko Kita';
  next();
}

function requireLogin(req, res, next) {
  if (!req.session?.user) {
    return res.redirect('/login');
  }
  next();
}

function requireRole(...roles) {
  return function (req, res, next) {
    const user = req.session?.user;

    if (!user) return res.redirect('/login');

    if (!roles.includes(user.role)) {
      return res.status(403).render('error', {
        title: 'Akses ditolak',
        message: `Halaman ini cuma buat ${roles.join(' / ')}. Kamu login sebagai ${user.role}.`,
        backUrl: user.role === 'admin' ? '/admin' : '/',
      });
    }

    next();
  };
}

// Kalau udah login, jangan balik ke halaman login/register lagi —
// langsung lempar ke halaman sesuai role-nya.
function redirectIfLoggedIn(req, res, next) {
  const user = req.session?.user;
  if (user) return res.redirect(user.role === 'admin' ? '/admin' : '/');
  next();
}

module.exports = { attachUser, requireLogin, requireRole, redirectIfLoggedIn };
