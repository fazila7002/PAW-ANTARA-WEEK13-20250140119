const orderService = require('../services/order.service');

/**
 * Invoice sisi CUSTOMER: cuma nampilin pesanan milik user yang lagi login.
 * Versi admin (semua pesanan + ubah status) ada di controllers/admin.controller.js.
 */
async function renderInvoices(req, res) {
  const orders = await orderService.getOrdersByUser(req.session.user.id);
  res.render('invoices', { orders });
}

async function renderInvoiceDetail(req, res) {
  const order = await orderService.getOrderById(req.params.id);

  if (!order) {
    return res.status(404).render('error', {
      title: 'Invoice gak ditemukan',
      message: 'Pesanan yang kamu cari gak ada.',
      backUrl: '/invoice',
    });
  }

  // customer cuma boleh liat invoice miliknya sendiri; admin boleh semua
  const user = req.session.user;
  if (user.role !== 'admin' && order.userId !== user.id) {
    return res.status(403).render('error', {
      title: 'Akses ditolak',
      message: 'Invoice ini bukan punya kamu.',
      backUrl: '/invoice',
    });
  }

  res.render('invoice-detail', { order, baru: req.query.baru === '1' });
}

module.exports = { renderInvoices, renderInvoiceDetail };
