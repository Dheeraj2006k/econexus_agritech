const express = require('express');
const router = express.Router();
const { runNegotiation, getNegotiationStatus } = require('../controllers/negotiationController');

router.get('/:id/status', getNegotiationStatus);
router.post('/negotiate', runNegotiation);

module.exports = router;
