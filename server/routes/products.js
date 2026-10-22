const express = require('express');
const productController = require('../controllers/productController');
const requireAuth = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');

const router = express.Router();

router.param('id', productController.validateId);

// 조회는 누구나, 등록/수정/삭제는 어드민만
router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);
router.post('/', requireAuth, requireAdmin, productController.createProduct);
router.put('/:id', requireAuth, requireAdmin, productController.updateProduct);
router.delete('/:id', requireAuth, requireAdmin, productController.deleteProduct);

module.exports = router;
