const productService = require('../services/product.service');
const orderService = require('../services/order.service');

async function renderHome(req, res) {
  // 🛡️ DRY: fungsi yang sama dipake juga di controllers/product.controller.js
  // (GET /api/products), halaman admin, dan bot/handlers/stok.handler.js (/stok)
  const products = await productService.getAllProducts();

  res.render('index', {
    products: products.map((p) => p.toJSON()),
    error: req.query.error || null,
  });
}

/**
 * CHECKOUT MULTIPLE ORDER.
 * Isi keranjang dikirim dari browser (lihat public/js/cart.js) sebagai JSON
 * berisi ARRAY item — jadi satu kali submit = satu invoice dengan banyak
 * jenis produk sekaligus, bukan cuma 1 produk kayak versi lama.
 */
async function checkout(req, res) {
  let items = [];

  try {
    items = typeof req.body.items === 'string' ? JSON.parse(req.body.items) : req.body.items;
  } catch (err) {
    return res.redirect('/?error=' + encodeURIComponent('Format keranjang gak valid'));
  }

  const buyerName = req.body.buyerName || req.session.user?.name;

  // 🛡️ DRY: jalur keranjang web & jalur chat AI sama-sama manggil createOrder()
  const result = await orderService.createOrder({
    items,
    buyerName,
    userId: req.session.user?.id || null,
    source: 'web',
  });

  if (!result.success) {
    return res.redirect('/?error=' + encodeURIComponent(result.message));
  }

  res.redirect(`/invoice/${result.order.id}?baru=1`);
}

module.exports = { renderHome, checkout };
