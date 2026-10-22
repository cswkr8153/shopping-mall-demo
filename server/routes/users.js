const express = require('express');
const userController = require('../controllers/userController');
const requireAuth = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');

const router = express.Router();

router.param('id', userController.validateId);

// 회원가입은 누구나, 조회/수정/삭제는 어드민만
router.post('/', userController.createUser);
router.get('/', requireAuth, requireAdmin, userController.getUsers);
router.get('/:id', requireAuth, requireAdmin, userController.getUserById);
router.put('/:id', requireAuth, requireAdmin, userController.updateUser);
router.delete('/:id', requireAuth, requireAdmin, userController.deleteUser);

module.exports = router;
