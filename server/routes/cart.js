const express = require('express');
const cartController = require('../controllers/cartController');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// 장바구니는 로그인한 유저만 사용
router.use(requireAuth);

router.get('/', cartController.getCart);
router.post('/items', cartController.addItem);
router.put('/items/:productId', cartController.updateItem);
router.delete('/items/:productId', cartController.removeItem);

module.exports = router;
