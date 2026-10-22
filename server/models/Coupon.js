const mongoose = require('mongoose');

// 쿠폰 종류(템플릿). 회원에게 발급된 쿠폰은 UserCoupon에 저장
const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    // free_shipping: 배송비 무료 (주문의 배송비만큼 할인)
    type: { type: String, required: true, enum: ['free_shipping'] },
    active: { type: Boolean, default: true },
    expiresAt: { type: Date }, // 없으면 만료 없음
  },
  { timestamps: true }
);

module.exports = mongoose.model('Coupon', couponSchema);
