const express = require('express');
const router = express.Router();
const { approvalDecision, getApprovalContext, counterOffer } = require('../controllers/approvalController');

router.get('/:negotiation_id/context', getApprovalContext);
router.post('/counter', counterOffer);
router.post('/decide', approvalDecision);

module.exports = router;
