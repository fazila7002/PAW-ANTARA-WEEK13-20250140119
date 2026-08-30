const express = require('express');
const router = express.Router();
const asyncHandler = require('../middlewares/asyncHandler');
const { requireLogin, requireRole } = require('../middlewares/auth.middleware');
const { renderHome, checkout } = require('../controllers/page.controller');
const { renderInvoices, renderInvoiceDetail } = require('../controllers/invoice.controller');

// katalog & checkout: khusus customer (admin punya dashboard sendiri)
router.get('/', requireLogin, requireRole('customer'), asyncHandler(renderHome));
router.post('/checkout', requireLogin, requireRole('customer'), asyncHandler(checkout));

// invoice sisi customer
router.get('/invoice', requireLogin, asyncHandler(renderInvoices));
router.get('/invoice/:id', requireLogin, asyncHandler(renderInvoiceDetail));

module.exports = router;
