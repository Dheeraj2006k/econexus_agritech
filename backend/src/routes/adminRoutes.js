const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { adminLogin, registerFarmer, submitSurvey, approveFarmer, getPendingFarmers, getDashboardStats } = require('../controllers/adminController');

router.post('/login', adminLogin);
router.get('/dashboard', protect, getDashboardStats);
router.post('/farmers/register', protect, registerFarmer);
router.post('/farmers/survey', protect, submitSurvey);
router.post('/farmers/approve/:farmer_id', protect, approveFarmer);
router.get('/farmers/pending', protect, getPendingFarmers);

module.exports = router;
