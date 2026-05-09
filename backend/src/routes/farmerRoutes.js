const express = require('express');
const router = express.Router();
const { registerFarmer, getFarmerProfile, getAllFarmers } = require('../controllers/farmerController');
router.post('/register', registerFarmer);
router.get('/', getAllFarmers);
router.get('/:id', getFarmerProfile);
module.exports = router;
