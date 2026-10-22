const mongoose = require('mongoose');
const Product = require('../models/Product');

const DEFAULT_LIMIT = 2;
const MAX_LIMIT = 50;

const ALLOWED_FIELDS = ['sku', 'name', 'price', 'listPrice', 'category', 'image', 'description'];

const pickFields = (body) =>
  Object.fromEntries(ALLOWED_FIELDS.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));

// 에러를 상태코드로 변환
const handleError = (err, res) => {
  if (err.code === 11000) {
    return res.status(409).json({ message: '이미 등록된 SKU입니다.' });
  }
  if (err.name === 'ValidationError') {
    const errors = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
    return res.status(400).json({ message: '입력값이 올바르지 않습니다.', errors });
  }
  console.error(err);
  return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
};

// :id 검증 (router.param 용)
exports.validateId = (req, res, next, id) => {
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: '유효하지 않은 id 입니다.' });
  }
  next();
};

// Create
exports.createProduct = async (req, res) => {
  try {
    const product = await Product.create(pickFields(req.body));
    res.status(201).json(product);
  } catch (err) {
    handleError(err, res);
  }
};

// Read (목록) - ?category=완성품 필터, ?page=1&limit=2 페이지 지원 (기본 2개씩)
exports.getProducts = async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) filter.category = String(req.query.category);

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Product.countDocuments(filter),
    ]);

    res.json({ products, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    handleError(err, res);
  }
};

// Read (단건)
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
    res.json(product);
  } catch (err) {
    handleError(err, res);
  }
};

// Update
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, pickFields(req.body), {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!product) return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
    res.json(product);
  } catch (err) {
    handleError(err, res);
  }
};

// Delete
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
    res.json({ message: '삭제되었습니다.', id: product._id });
  } catch (err) {
    handleError(err, res);
  }
};
