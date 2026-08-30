const productService = require('../services/product.service');
const orderService = require('../services/order.service');
const { STATUS_LIST } = require('../utils/orderStatus');

/**
 * Semua handler khusus admin. Proteksinya gak ditulis di sini, tapi
 * dipasang sebagai middleware di routes/admin.routes.js
 * (requireLogin + requireRole('admin')) — biar aturan aksesnya
 * kelihatan jelas di satu tempat & gak berulang di tiap fungsi.
 */

async function dashboard(req, res) {
  const [produkStats, orderStats, orderTerbaru] = await Promise.all([
    productService.getProductStats(),
    orderService.getOrderStats(),
    orderService.getAllOrders(),
  ]);

  res.render('admin/dashboard', {
    produkStats,
    orderStats,
    orderTerbaru: orderTerbaru.slice(0, 5),
  });
}

// ── CRUD PRODUK ────────────────────────────────────────────────
async function listProducts(req, res) {
  const products = await productService.getAllProducts();
  res.render('admin/products', {
    products,
    notice: req.query.notice || null,
  });
}

function showCreateForm(req, res) {
  res.render('admin/product-form', {
    mode: 'create',
    product: { name: '', description: '', price: '', stock: '' },
    errors: [],
  });
}

async function createProduct(req, res) {
  const result = await productService.createProduct(req.body);

  if (!result.success) {
    return res.status(400).render('admin/product-form', {
      mode: 'create',
      product: req.body,
      errors: result.errors,
    });
  }

  res.redirect(`/admin/produk?notice=${encodeURIComponent(`Produk "${result.product.name}" berhasil ditambahkan`)}`);
}

async function showEditForm(req, res) {
  const product = await productService.getProductById(req.params.id);
  if (!product) return res.redirect('/admin/produk?notice=' + encodeURIComponent('Produk gak ditemukan'));

  res.render('admin/product-form', { mode: 'edit', product, errors: [] });
}

async function updateProduct(req, res) {
  const result = await productService.updateProduct(req.params.id, req.body);

  if (!result.success) {
    return res.status(400).render('admin/product-form', {
      mode: 'edit',
      product: { ...req.body, id: req.params.id },
      errors: result.errors,
    });
  }

  res.redirect(`/admin/produk?notice=${encodeURIComponent(`Produk "${result.product.name}" berhasil diupdate`)}`);
}

async function deleteProduct(req, res) {
  const result = await productService.deleteProduct(req.params.id);
  res.redirect(`/admin/produk?notice=${encodeURIComponent(result.message)}`);
}

// ── INVOICE & STATUS PESANAN ───────────────────────────────────
async function listInvoices(req, res) {
  const orders = await orderService.getAllOrders();
  res.render('admin/invoices', {
    orders,
    notice: req.query.notice || null,
  });
}

async function invoiceDetail(req, res) {
  const order = await orderService.getOrderById(req.params.id);
  if (!order) return res.redirect('/admin/invoice?notice=' + encodeURIComponent('Pesanan gak ditemukan'));

  res.render('admin/invoice-detail', {
    order,
    statusList: STATUS_LIST,
    notice: req.query.notice || null,
  });
}

async function updateStatus(req, res) {
  const result = await orderService.updateOrderStatus(req.params.id, req.body.status);
  res.redirect(`/admin/invoice/${req.params.id}?notice=${encodeURIComponent(result.message)}`);
}

module.exports = {
  dashboard,
  listProducts,
  showCreateForm,
  createProduct,
  showEditForm,
  updateProduct,
  deleteProduct,
  listInvoices,
  invoiceDetail,
  updateStatus,
};
