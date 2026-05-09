const express = require('express');
const router = express.Router();
const { registerBuyer } = require('../controllers/buyerController');

router.post('/register', registerBuyer);

module.exports = router;