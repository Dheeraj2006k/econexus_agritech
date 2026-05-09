const express = require('express');
const {
  startDemoNegotiation,
  getDemoNegotiation,
  streamDemoNegotiation,
  approveDemoNegotiation,
  demoOverview,
  registerDemoFarmer,
  createBuyerRequest,
  runAggregation,
  optimizeLogistics,
  runRedistribution,
  semanticSearch,
  communityFeed,
  parseVoiceIntent
} = require('../controllers/demoController');

const router = express.Router();

router.post('/negotiations/start', startDemoNegotiation);
router.get('/negotiations/:id', getDemoNegotiation);
router.get('/negotiations/:id/events', streamDemoNegotiation);
router.post('/negotiations/:id/approve', approveDemoNegotiation);
router.get('/overview', demoOverview);
router.post('/farmers/register', registerDemoFarmer);
router.post('/buyers/request', createBuyerRequest);
router.post('/aggregation/run', runAggregation);
router.post('/logistics/optimize', optimizeLogistics);
router.post('/redistribution/run', runRedistribution);
router.post('/semantic/search', semanticSearch);
router.get('/community/feed', communityFeed);
router.post('/voice/intent', parseVoiceIntent);

module.exports = router;
