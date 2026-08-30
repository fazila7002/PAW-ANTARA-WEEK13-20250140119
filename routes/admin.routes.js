const express = require('express');
const router = express.Router();
const asyncHandler = require('../middlewares/asyncHandler');
const { requireLogin, requireRole } = require('../middlewares/auth.middleware');
const admin = require('../controllers/admin.controller');

// 🛡️ DRY: proteksi dipasang SEKALI buat semua route di bawah,
// gak perlu ditulis ulang di tiap baris route.
router.use(requireLogin, requireRole('admin'));

router.get('/', asyncHandler(admin.dashboard));

// CRUD produk
router.get('/produk', asyncHandler(admin.listProducts));
router.get('/produk/baru', admin.showCreateForm);
router.post('/produk', asyncHandler(admin.createProduct));
router.get('/produk/:id/edit', asyncHandler(admin.showEditForm));
router.post('/produk/:id', asyncHandler(admin.updateProduct));
router.post('/produk/:id/hapus', asyncHandler(admin.deleteProduct));

// invoice & status pesanan
router.get('/invoice', asyncHandler(admin.listInvoices));
router.get('/invoice/:id', asyncHandler(admin.invoiceDetail));
router.post('/invoice/:id/status', asyncHandler(admin.updateStatus));

module.exports = router;
