const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

const { MAX_QUANTITY } = Cart;

// 수량 검증: 1 ~ MAX_QUANTITY 사이의 정수 (유효하지 않으면 null)
const parseQuantity = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= MAX_QUANTITY ? n : null;
};

const badQuantity = (res) =>
  res.status(400).json({ message: `수량은 1~${MAX_QUANTITY} 사이의 정수여야 합니다.` });

// 장바구니를 응답 형태로 변환 (삭제된 상품은 제외, 가격은 현재 상품 가격 기준)
const toResponse = async (cart) => {
  if (cart) await cart.populate('items.product');
  const items = (cart?.items || [])
    .filter((item) => item.product)
    .map((item) => ({ product: item.product, quantity: item.quantity }));

  return {
    items,
    totalQuantity: items.reduce((sum, i) => sum + i.quantity, 0),
    totalPrice: items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
  };
};

const handleError = (err, res) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: '입력값이 올바르지 않습니다.' });
  }
  console.error(err);
  return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
};

// Read: 내 장바구니
exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.auth.id });
    res.json(await toResponse(cart));
  } catch (err) {
    handleError(err, res);
  }
};

// Create: 상품 담기 (이미 담긴 상품이면 수량을 더함)
exports.addItem = async (req, res) => {
  try {
    const { productId } = req.body;
    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: '유효하지 않은 상품 id 입니다.' });
    }
    const quantity = parseQuantity(req.body.quantity ?? 1);
    if (!quantity) return badQuantity(res);

    if (!(await Product.exists({ _id: productId }))) {
      return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
    }

    const cart = (await Cart.findOne({ user: req.auth.id })) || new Cart({ user: req.auth.id });
    const existing = cart.items.find((item) => String(item.product) === String(productId));
    if (existing) existing.quantity = Math.min(existing.quantity + quantity, MAX_QUANTITY);
    else cart.items.push({ product: productId, quantity });
    await cart.save();

    res.status(201).json(await toResponse(cart));
  } catch (err) {
    handleError(err, res);
  }
};

// Update: 수량 변경
exports.updateItem = async (req, res) => {
  try {
    const quantity = parseQuantity(req.body.quantity);
    if (!quantity) return badQuantity(res);

    const cart = await Cart.findOne({ user: req.auth.id });
    const item = cart?.items.find((i) => String(i.product) === req.params.productId);
    if (!item) return res.status(404).json({ message: '장바구니에 없는 상품입니다.' });

    item.quantity = quantity;
    await cart.save();
    res.json(await toResponse(cart));
  } catch (err) {
    handleError(err, res);
  }
};

// Delete: 항목 삭제
exports.removeItem = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.auth.id });
    const before = cart?.items.length ?? 0;
    if (cart) cart.items = cart.items.filter((i) => String(i.product) !== req.params.productId);
    if (!cart || cart.items.length === before) {
      return res.status(404).json({ message: '장바구니에 없는 상품입니다.' });
    }

    await cart.save();
    res.json(await toResponse(cart));
  } catch (err) {
    handleError(err, res);
  }
};
