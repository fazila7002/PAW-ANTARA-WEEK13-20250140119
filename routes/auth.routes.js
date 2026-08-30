const express = require('express');
const router = express.Router();
const asyncHandler = require('../middlewares/asyncHandler');
const { redirectIfLoggedIn } = require('../middlewares/auth.middleware');
const auth = require('../controllers/auth.controller');

router.get('/login', redirectIfLoggedIn, auth.showLogin);
router.post('/login', asyncHandler(auth.handleLogin));

router.get('/register', redirectIfLoggedIn, auth.showRegister);
router.post('/register', asyncHandler(auth.handleRegister));

router.post('/logout', auth.logout);

module.exports = router;
