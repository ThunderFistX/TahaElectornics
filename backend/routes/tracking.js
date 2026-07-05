const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/trackingController');
const authenticate = require('../middleware/auth');
const permit = require('../middleware/role');

router.get('/:trackingId', trackingController.getByTrackingId);
router.patch('/:trackingId', authenticate, permit('Admin'), trackingController.updateTrackingStatus);

module.exports = router;
