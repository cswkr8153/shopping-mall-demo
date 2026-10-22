const express = require('express');
const statsController = require('../controllers/statsController');
const requireAuth = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');

const router = express.Router();

// 통계는 어드민만 조회
router.get('/dashboard', requireAuth, requireAdmin, statsController.getDashboard);

module.exports = router;
