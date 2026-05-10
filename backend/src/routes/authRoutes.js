const express = require('express');
const router = express.Router();
const { login, buyerRegister, getPassport } = require('../controllers/authController');

router.post('/login', login);
router.post('/buyer-register', buyerRegister);
router.get('/passport/:userId/:role', getPassport);

module.exports = router;