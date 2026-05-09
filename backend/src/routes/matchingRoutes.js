const express = require('express');
const router = express.Router();
const { findMatchingBuyers } = require('../controllers/matchingController');

router.post('/find-buyers', findMatchingBuyers);

module.exports = router;