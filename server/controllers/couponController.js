const UserCoupon = require('../models/UserCoupon');

// Read: 내가 사용할 수 있는 쿠폰 목록 (미사용, 활성, 만료 전)
exports.getMyCoupons = async (req, res) => {
  try {
    const userCoupons = await UserCoupon.find({ user: req.auth.id, usedAt: null }).populate('coupon').sort({ createdAt: -1 });
    const now = new Date();

    const coupons = userCoupons
      .filter(({ coupon }) => coupon && coupon.active && (!coupon.expiresAt || coupon.expiresAt > now))
      .map(({ _id, coupon }) => ({
        _id, // 주문할 때 이 값(userCouponId)을 보냄
        name: coupon.name,
        description: coupon.description,
        type: coupon.type,
        expiresAt: coupon.expiresAt || null,
      }));

    res.json(coupons);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};
