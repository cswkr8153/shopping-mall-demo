const express = require('express');
const orderController = require('../controllers/orderController');
const requireAuth = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');

const router = express.Router();

router.param('id', orderController.validateId);

// 주문은 로그인한 유저만 사용
router.use(requireAuth);

router.post('/', orderController.createOrder);
router.post('/payment/complete', orderController.completePayment);
router.get('/', orderController.getMyOrders);

// '/:id' 보다 먼저 등록해야 'admin'이 id로 해석되지 않음
router.get('/admin', requireAdmin, orderController.getAllOrders);

router.get('/:id', orderController.getOrderById);
router.put('/:id/cancel', orderController.cancelOrder);
router.put('/:id/status', requireAdmin, orderController.updateStatus);

module.exports = router;
