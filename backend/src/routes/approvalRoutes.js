const express = require('express');
const router = express.Router();
const { approvalDecision } = require('../controllers/approvalController');

router.post('/decide', approvalDecision);

module.exports = router;