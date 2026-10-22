const express = require('express');
const couponController = require('../controllers/couponController');
const requireAuth = require('../middleware/auth');

const router = express.Router();

router.get('/my', requireAuth, couponController.getMyCoupons);

module.exports = router;
