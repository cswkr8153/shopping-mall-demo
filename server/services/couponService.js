const Coupon = require('../models/Coupon');
const UserCoupon = require('../models/UserCoupon');
const User = require('../models/User');

// 신규 가입 회원과 기존 회원에게 주는 배송비 무료 쿠폰
const FREE_SHIPPING = {
  code: 'FREE_SHIPPING',
  name: '배송비 무료 쿠폰',
  description: '주문 시 배송비가 무료가 됩니다.',
  type: 'free_shipping',
};

// 쿠폰 종류가 DB에 없으면 만들고, 있으면 그대로 사용
const ensureCoupon = (def = FREE_SHIPPING) =>
  Coupon.findOneAndUpdate({ code: def.code }, { $setOnInsert: { ...def, active: true } }, { upsert: true, returnDocument: 'after' });

// 회원 1명에게 발급 (이미 가지고 있으면 아무 일도 하지 않음). 새로 발급했으면 true
exports.issueToUser = async (userId, def = FREE_SHIPPING) => {
  const coupon = await ensureCoupon(def);
  const result = await UserCoupon.updateOne(
    { user: userId, coupon: coupon._id },
    { $setOnInsert: { user: userId, coupon: coupon._id } },
    { upsert: true }
  );
  return result.upsertedCount > 0;
};

// 현재 가입된 모든 회원에게 발급. { total, issued } 반환
exports.issueToAllUsers = async (def = FREE_SHIPPING) => {
  const coupon = await ensureCoupon(def);
  const users = await User.find({}, '_id');
  if (users.length === 0) return { total: 0, issued: 0 };

  const result = await UserCoupon.bulkWrite(
    users.map((u) => ({
      updateOne: {
        filter: { user: u._id, coupon: coupon._id },
        update: { $setOnInsert: { user: u._id, coupon: coupon._id } },
        upsert: true,
      },
    }))
  );
  return { total: users.length, issued: result.upsertedCount };
};
