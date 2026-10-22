const mongoose = require('mongoose');
require('./Coupon'); // populate('coupon')에 필요하므로 모델을 미리 등록

// 회원에게 발급된 쿠폰. 쿠폰 1종류당 회원 1장 (중복 발급 방지)
const userCouponSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', required: true },
    // 주문 생성 시 이 주문으로 예약됨. 결제가 확인되면 usedAt이 채워지고, 주문이 취소되면 비워짐
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    usedAt: { type: Date, default: null }, // 값이 있으면 사용 완료
  },
  { timestamps: true }
);

userCouponSchema.index({ user: 1, coupon: 1 }, { unique: true });

module.exports = mongoose.model('UserCoupon', userCouponSchema);
