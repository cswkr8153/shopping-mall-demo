const mongoose = require('mongoose');

// 진행 순서: 결제 대기 → 결제 완료 → 주문 확인 → 상품 준비중 → 배송시작 → 배송 중 → 배송 완료 (취소는 어느 단계에서든)
const STATUSES = ['pending', 'received', 'confirmed', 'preparing', 'dispatched', 'shipped', 'delivered', 'cancelled'];

// 주문 시점의 상품 정보를 복사해서 저장 (이후 상품 가격/정보가 바뀌거나 삭제되어도 주문은 그대로)
const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    sku: { type: String, required: true },
    name: { type: String, required: true },
    image: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, max: 99 },
  },
  { _id: false }
);

// 배송지도 복사해서 저장 (주소록을 고치거나 지워도 주문의 배송지는 그대로)
const shippingSchema = new mongoose.Schema(
  {
    recipient: { type: String, required: [true, '받는 사람은 필수입니다.'], trim: true },
    phone: { type: String, required: [true, '연락처는 필수입니다.'], trim: true },
    zip_code: { type: String, trim: true },
    address1: { type: String, required: [true, '주소는 필수입니다.'], trim: true },
    address2: { type: String, trim: true },
    memo: { type: String, trim: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: {
      type: [orderItemSchema],
      validate: { validator: (v) => v.length > 0, message: '주문 상품이 없습니다.' },
    },
    shipping: { type: shippingSchema, required: true },
    itemsTotal: { type: Number, required: true, min: 0 },
    shippingFee: { type: Number, required: true, min: 0 },
    // 쿠폰 할인 금액 (배송비 무료 쿠폰이면 배송비만큼). 최종 금액 = 상품 금액 + 배송비 - 쿠폰 할인
    couponDiscount: { type: Number, default: 0, min: 0 },
    coupon: {
      userCoupon: { type: mongoose.Schema.Types.ObjectId, ref: 'UserCoupon' },
      name: { type: String },
      type: { type: String },
    },
    totalPrice: { type: Number, required: true, min: 0 },
    // pending: 결제 대기, received: 결제 완료, confirmed: 주문 확인, preparing: 상품 준비중,
    // dispatched: 배송시작, shipped: 배송 중, delivered: 배송 완료, cancelled: 주문 취소(결제했다면 환불됨)
    status: { type: String, enum: STATUSES, default: 'pending' },
    // 장바구니로 주문한 경우 결제가 확인되면 장바구니를 비움
    fromCart: { type: Boolean, default: false },
    payment: {
      impUid: { type: String }, // 포트원 결제 번호
      method: { type: String }, // 결제 수단 (card 등)
      pgProvider: { type: String },
      receiptUrl: { type: String },
      paidAt: { type: Date },
    },
  },
  { timestamps: true } // createdAt, updatedAt 자동 생성
);

// 결제가 이루어져 진행 중이거나 끝난 주문의 상태 (결제 대기와 취소는 제외)
const ACTIVE_STATUSES = STATUSES.filter((s) => s !== 'pending' && s !== 'cancelled');

// 결제가 이루어진 주문 조회 조건: 진행 중/완료된 주문 + 결제 후 환불된 주문 (결제 대기나 결제 전 취소는 제외)
const PAID_ORDERS = {
  $or: [{ status: { $in: ACTIVE_STATUSES } }, { status: 'cancelled', 'payment.impUid': { $exists: true } }],
};

module.exports = mongoose.model('Order', orderSchema);
module.exports.STATUSES = STATUSES;
module.exports.ACTIVE_STATUSES = ACTIVE_STATUSES;
module.exports.PAID_ORDERS = PAID_ORDERS;
