const express = require('express');
const {
  startDemoNegotiation,
  getDemoNegotiation,
  streamDemoNegotiation,
  approveDemoNegotiation
} = require('../controllers/demoController');

const router = express.Router();

router.post('/negotiations/start', startDemoNegotiation);
router.get('/negotiations/:id', getDemoNegotiation);
router.get('/negotiations/:id/events', streamDemoNegotiation);
router.post('/negotiations/:id/approve', approveDemoNegotiation);

module.exports = router;
