const crypto = require('crypto');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');
const UserCoupon = require('../models/UserCoupon');
const portone = require('../utils/portone');
const { confirmWithPayment, reconcileOrder, reconcileRecentPending } = require('../services/orderPayment');

const { STATUSES, PAID_ORDERS } = Order; // PAID_ORDERS: 결제가 이루어진 주문만 (결제 대기, 결제 전 취소 제외)
const { MAX_QUANTITY } = Cart;

const FREE_SHIPPING_FROM = 100000;
const SHIPPING_FEE = 3000;

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const pickShipping = (body = {}) =>
  Object.fromEntries(
    ['recipient', 'phone', 'zip_code', 'address1', 'address2', 'memo'].filter((k) => body[k] !== undefined).map((k) => [k, body[k]])
  );

const generateOrderNumber = () => {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `ORD-${date}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
};

const fail = (res, status, message) => res.status(status).json({ message });

const handleError = (err, res) => {
  if (err.name === 'ValidationError') {
    const errors = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
    return res.status(400).json({ message: '입력값이 올바르지 않습니다.', errors });
  }
  console.error(err);
  return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
};

// :id 검증 (router.param 용)
exports.validateId = (req, res, next, id) => {
  if (!mongoose.isValidObjectId(id)) return fail(res, 400, '유효하지 않은 id 입니다.');
  next();
};

// 주문할 상품 목록 결정: body.items(바로 구매)가 있으면 그것을, 없으면 장바구니 전체를 사용
const resolveSource = async (req) => {
  if (Array.isArray(req.body.items) && req.body.items.length > 0) {
    const merged = new Map();
    for (const { productId, quantity } of req.body.items) {
      const q = Number(quantity ?? 1);
      if (!mongoose.isValidObjectId(productId)) return { error: '유효하지 않은 상품 id 입니다.' };
      if (!Number.isInteger(q) || q < 1) return { error: `수량은 1~${MAX_QUANTITY} 사이의 정수여야 합니다.` };
      merged.set(String(productId), Math.min((merged.get(String(productId)) || 0) + q, MAX_QUANTITY));
    }
    return { source: [...merged].map(([productId, quantity]) => ({ productId, quantity })), fromCart: false };
  }

  const cart = await Cart.findOne({ user: req.auth.id });
  if (!cart || cart.items.length === 0) return { error: '장바구니가 비어 있습니다.' };
  return { source: cart.items.map((i) => ({ productId: String(i.product), quantity: i.quantity })), fromCart: true };
};

// 결제된 주문이면 포트원에 취소(환불)를 요청. 실패하면 예외를 던져 주문 상태를 바꾸지 않음
const refundIfPaid = async (order, reason) => {
  if (order.payment?.impUid && order.status !== 'pending' && order.status !== 'cancelled') {
    await portone.cancelPayment(order.payment.impUid, reason);
  }
};

// 쿠폰을 이 주문(orderId)으로 예약. 성공하면 { userCoupon, discount }, 실패하면 { error }
// 사용 처리(usedAt)는 결제가 확인될 때 하고, 주문이 취소되면 예약이 풀림
const reserveCoupon = async (userId, userCouponId, orderId, shippingFee) => {
  if (!mongoose.isValidObjectId(userCouponId)) return { error: '유효하지 않은 쿠폰입니다.' };

  const userCoupon = await UserCoupon.findOne({ _id: userCouponId, user: userId }).populate('coupon');
  const coupon = userCoupon?.coupon;
  if (!coupon || !coupon.active) return { error: '사용할 수 없는 쿠폰입니다.' };
  if (userCoupon.usedAt) return { error: '이미 사용한 쿠폰입니다.' };
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return { error: '만료된 쿠폰입니다.' };
  if (shippingFee === 0) return { error: '배송비가 이미 무료라서 쿠폰을 사용할 수 없습니다.' };

  // 결제 창을 닫는 등으로 결제 대기 주문에 예약만 남아 있으면 그 주문을 취소하고 예약을 넘겨받음
  if (userCoupon.order) {
    // 단, 그 주문이 사실은 결제가 끝난 주문이면(확정이 늦어진 경우) 취소하지 않고 확정하고, 쿠폰은 사용한 것으로 처리
    const stale = await Order.findById(userCoupon.order);
    if (stale && (await reconcileOrder(stale))) return { error: '이미 사용한 쿠폰입니다.' };

    await Order.updateOne({ _id: userCoupon.order, status: 'pending' }, { $set: { status: 'cancelled' } });
    await UserCoupon.updateOne({ _id: userCoupon._id, usedAt: null }, { $set: { order: null } });
  }

  // 동시에 두 주문이 같은 쿠폰을 쓰지 못하도록 한 번에 하나의 주문만 예약
  const reserved = await UserCoupon.findOneAndUpdate({ _id: userCoupon._id, user: userId, usedAt: null, order: null }, { $set: { order: orderId } });
  if (!reserved) return { error: '다른 주문에서 사용 중인 쿠폰입니다.' };

  return { userCoupon, coupon, discount: shippingFee }; // free_shipping: 배송비만큼 할인
};

// 주문이 취소되면 쿠폰을 되돌려줌 (이 주문이 쓰던 쿠폰만)
const releaseCoupon = (order) =>
  order.coupon?.userCoupon
    ? UserCoupon.updateOne({ _id: order.coupon.userCoupon, order: order._id }, { $set: { order: null, usedAt: null } })
    : null;

// Create: 주문 생성 (가격은 항상 서버가 현재 상품 가격으로 계산, 결제 전이라 pending 상태)
exports.createOrder = async (req, res) => {
  try {
    const { source, fromCart, error } = await resolveSource(req);
    if (error) return fail(res, 400, error);

    const products = await Product.find({ _id: { $in: source.map((s) => s.productId) } });
    const byId = new Map(products.map((p) => [String(p._id), p]));

    const items = [];
    for (const { productId, quantity } of source) {
      const product = byId.get(productId);
      if (!product) return fail(res, 404, '판매가 종료되었거나 존재하지 않는 상품이 포함되어 있습니다.');
      items.push({
        product: product._id,
        sku: product.sku,
        name: product.name,
        image: product.image,
        price: product.price,
        quantity,
      });
    }

    const itemsTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const shippingFee = itemsTotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;

    const orderId = new mongoose.Types.ObjectId();
    let couponDiscount = 0;
    let coupon;
    if (req.body.userCouponId) {
      const reserved = await reserveCoupon(req.auth.id, req.body.userCouponId, orderId, shippingFee);
      if (reserved.error) return fail(res, 400, reserved.error);
      couponDiscount = reserved.discount;
      coupon = { userCoupon: reserved.userCoupon._id, name: reserved.coupon.name, type: reserved.coupon.type };
    }

    let order;
    try {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          order = await Order.create({
            _id: orderId,
            orderNumber: generateOrderNumber(),
            user: req.auth.id,
            items,
            shipping: pickShipping(req.body.shipping),
            itemsTotal,
            shippingFee,
            couponDiscount,
            coupon,
            totalPrice: itemsTotal + shippingFee - couponDiscount,
            fromCart,
          });
          break;
        } catch (err) {
          if (err.code !== 11000 || attempt === 2) throw err; // 주문번호 중복이면 다시 생성
        }
      }
    } catch (err) {
      // 주문을 만들지 못했으면 예약한 쿠폰을 풀어줌
      if (coupon) await UserCoupon.updateOne({ _id: coupon.userCoupon, order: orderId }, { $set: { order: null } });
      throw err;
    }

    // 결제 대기(pending) 상태로 생성. 장바구니는 결제가 확인된 뒤에 비움
    res.status(201).json(order);
  } catch (err) {
    handleError(err, res);
  }
};

// 결제 완료 처리: 포트원에서 결제를 직접 조회해 상태·금액·주문번호가 모두 맞을 때만 주문을 확정
exports.completePayment = async (req, res) => {
  try {
    const { imp_uid: impUid, merchant_uid: merchantUid } = req.body;
    if (!impUid || !merchantUid) return fail(res, 400, '결제 정보가 올바르지 않습니다.');

    const order = await Order.findOne({ orderNumber: String(merchantUid), user: req.auth.id });
    if (!order) return fail(res, 404, '주문을 찾을 수 없습니다.');

    // 이미 같은 결제로 처리된 주문이면 그대로 반환 (새로고침, 중복 호출 대비)
    if (order.status !== 'pending') {
      if (order.payment?.impUid === String(impUid)) return res.json(order);
      return fail(res, 400, '이미 처리된 주문입니다.');
    }

    // 결제 검증과 주문 확정은 services/orderPayment.js (자동 복구와 같은 로직)
    const result = await confirmWithPayment(order, impUid);
    if (result.error) return fail(res, 400, result.error);

    res.json(result.order);
  } catch (err) {
    handleError(err, res);
  }
};

// Read: 내 주문 목록
exports.getMyOrders = async (req, res) => {
  try {
    // 결제는 끝났는데 확정이 안 된 최근 주문(결제 직후 창을 닫은 경우 등)을 먼저 복구
    await reconcileRecentPending(req.auth.id);

    const orders = await Order.find({ user: req.auth.id, ...PAID_ORDERS }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    handleError(err, res);
  }
};

// Read: 주문 상세 (본인 주문 또는 어드민)
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');
    if (!order) return fail(res, 404, '주문을 찾을 수 없습니다.');

    const isOwner = String(order.user._id) === req.auth.id;
    if (!isOwner) {
      const me = await User.findById(req.auth.id).select('user_type');
      if (me?.user_type !== 'admin') return fail(res, 404, '주문을 찾을 수 없습니다.'); // 남의 주문은 존재 여부도 숨김
    }
    res.json(order);
  } catch (err) {
    handleError(err, res);
  }
};

// Update: 주문 취소 (본인, 상품 준비가 시작되기 전까지만 = 결제 대기/결제 완료/주문 확인. 결제된 주문은 환불됨)
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.auth.id });
    if (!order) return fail(res, 404, '주문을 찾을 수 없습니다.');

    // 결제 대기 주문을 취소하려는데 사실은 결제가 끝난 주문이면, 몰래 취소하지 않고 확정한 뒤 알려줌
    if (order.status === 'pending' && (await reconcileOrder(order))) {
      return fail(res, 409, '이미 결제가 완료된 주문입니다. 내 주문에서 확인해 주세요.');
    }

    if (!['pending', 'received', 'confirmed'].includes(order.status)) {
      return fail(res, 400, order.status === 'cancelled' ? '이미 취소된 주문입니다.' : '상품 준비가 시작된 주문은 취소할 수 없습니다.');
    }

    try {
      await refundIfPaid(order, '고객 요청 취소');
    } catch (err) {
      console.error('[payment] 환불 실패', err.message);
      return fail(res, 502, `환불에 실패해 주문을 취소하지 못했습니다. (${err.message})`);
    }

    order.status = 'cancelled';
    await order.save();
    await releaseCoupon(order);
    res.json(order);
  } catch (err) {
    handleError(err, res);
  }
};

// Admin Read: 전체 주문 목록 (?status=received&page=1&limit=20). 결제된 주문만 보여줌
exports.getAllOrders = async (req, res) => {
  try {
    const filter = { ...PAID_ORDERS };
    if (req.query.status) {
      // 상태 필터는 결제된 주문 조건과 함께 적용 (예: cancelled는 환불된 주문만)
      filter.$and = [{ status: String(req.query.status) }];
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('user', 'name email'),
      Order.countDocuments(filter),
    ]);

    res.json({ orders, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    handleError(err, res);
  }
};

// Admin Update: 주문 상태 변경
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!STATUSES.includes(status)) return fail(res, 400, `상태는 ${STATUSES.join(', ')} 중 하나여야 합니다.`);

    const order = await Order.findById(req.params.id);
    if (!order) return fail(res, 404, '주문을 찾을 수 없습니다.');

    // 결제 대기로 남아 있어도 실제로는 결제가 끝난 주문이면 먼저 확정 (그래야 환불/배송 처리가 맞게 됨)
    if (order.status === 'pending') await reconcileOrder(order);

    // 결제 전 주문은 배송 단계로 넘길 수 없고, 취소만 가능
    if (order.status === 'pending' && !['pending', 'cancelled'].includes(status)) {
      return fail(res, 400, '결제가 완료되지 않은 주문입니다.');
    }
    if (order.status === 'cancelled' && status !== 'cancelled') {
      return fail(res, 400, '취소된 주문은 상태를 되돌릴 수 없습니다.');
    }

    if (status === 'cancelled') {
      try {
        await refundIfPaid(order, '관리자 취소');
      } catch (err) {
        console.error('[payment] 환불 실패', err.message);
        return fail(res, 502, `환불에 실패해 주문을 취소하지 못했습니다. (${err.message})`);
      }
    }

    order.status = status;
    await order.save();
    if (status === 'cancelled') await releaseCoupon(order);
    res.json(order);
  } catch (err) {
    handleError(err, res);
  }
};
