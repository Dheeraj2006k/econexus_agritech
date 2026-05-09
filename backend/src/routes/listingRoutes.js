const express = require('express');
const router = express.Router();
const { createListing, getActiveListings } = require('../controllers/listingController');

router.post('/create', createListing);
router.get('/active', getActiveListings);

module.exports = router;