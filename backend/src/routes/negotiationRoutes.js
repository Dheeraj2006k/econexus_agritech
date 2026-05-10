const express = require('express');
const router = express.Router();
const { createBuyerOffer, runNegotiation, getNegotiationStatus } = require('../controllers/negotiationController');

router.get('/:id/status', getNegotiationStatus);
router.post('/offer', createBuyerOffer);
router.post('/negotiate', runNegotiation);

module.exports = router;
