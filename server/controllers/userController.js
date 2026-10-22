const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const Cart = require('../models/Cart');
const UserCoupon = require('../models/UserCoupon');
const couponService = require('../services/couponService');

const SALT_ROUNDS = 10;
const ALLOWED_FIELDS = ['email', 'name', 'password', 'user_type'];
const SIGNUP_TYPES = ['customer', 'seller']; // 회원가입 시 선택할 수 있는 유형

// 응답에서 password 제거
const toSafe = (user) => {
  const obj = user.toObject();
  delete obj.password;
  return obj;
};

const pickFields = (body) =>
  Object.fromEntries(ALLOWED_FIELDS.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));

// 에러를 상태코드로 변환
const handleError = (err, res) => {
  if (err.code === 11000) {
    return res.status(409).json({ message: '이미 사용 중인 이메일입니다.' });
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
exports.createUser = async (req, res) => {
  try {
    const data = pickFields(req.body);
    if (!data.password) {
      return res.status(400).json({ message: '입력값이 올바르지 않습니다.', errors: { password: '비밀번호는 필수입니다.' } });
    }
    // 공개 회원가입에서는 어드민 계정을 만들 수 없음 (어드민 권한은 어드민이 회원 관리에서 부여)
    if (data.user_type !== undefined && !SIGNUP_TYPES.includes(data.user_type)) {
      return res.status(400).json({ message: '입력값이 올바르지 않습니다.', errors: { user_type: '가입할 수 없는 회원 유형입니다.' } });
    }
    data.password = await bcrypt.hash(String(data.password), SALT_ROUNDS);
    const user = await User.create(data);

    // 가입 축하 쿠폰 발급. 실패해도 가입은 성공 처리 (쿠폰은 스크립트로 나중에 발급 가능)
    try {
      await couponService.issueToUser(user._id);
    } catch (couponErr) {
      console.error('[coupon] 가입 쿠폰 발급 실패', couponErr.message);
    }

    res.status(201).json(toSafe(user));
  } catch (err) {
    handleError(err, res);
  }
};


// Read (목록) - ?user_type=customer 필터 지원
exports.getUsers = async (req, res) => {
  try {
    const filter = {};
    if (req.query.user_type) filter.user_type = String(req.query.user_type);
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    handleError(err, res);
  }
};

// Read (단건)
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: '유저를 찾을 수 없습니다.' });
    res.json(user);
  } catch (err) {
    handleError(err, res);
  }
};

// Update
exports.updateUser = async (req, res) => {
  try {
    const data = pickFields(req.body);

    // 어드민이 자기 권한을 스스로 내려서 관리자가 없어지는 일을 막음
    if (req.params.id === req.auth.id && data.user_type !== undefined && data.user_type !== 'admin') {
      return res.status(400).json({ message: '본인의 권한은 변경할 수 없습니다.' });
    }

    if (data.password) data.password = await bcrypt.hash(String(data.password), SALT_ROUNDS);
    const user = await User.findByIdAndUpdate(req.params.id, data, {
      returnDocument: 'after',
      runValidators: true,
    }).select('-password');
    if (!user) return res.status(404).json({ message: '유저를 찾을 수 없습니다.' });
    res.json(user);
  } catch (err) {
    handleError(err, res);
  }
};

// Delete
exports.deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.auth.id) {
      return res.status(400).json({ message: '본인 계정은 삭제할 수 없습니다.' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: '유저를 찾을 수 없습니다.' });

    // 회원이 쓰던 장바구니와 쿠폰도 함께 정리 (주문 내역은 기록으로 남김)
    await Promise.all([Cart.deleteOne({ user: user._id }), UserCoupon.deleteMany({ user: user._id })]);

    res.json({ message: '삭제되었습니다.', id: user._id });
  } catch (err) {
    handleError(err, res);
  }
};
