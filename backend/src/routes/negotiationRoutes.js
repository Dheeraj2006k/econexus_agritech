const express = require('express');
const router = express.Router();
const { runNegotiation } = require('../controllers/negotiationController');

router.post('/negotiate', runNegotiation);

module.exports = router;