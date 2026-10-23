const Order = require('../models/Order');
const Cart = require('../models/Cart');
const UserCoupon = require('../models/UserCoupon');
const portone = require('../utils/portone');

// 결제를 포트원에서 직접 조회해 상태·금액·주문번호가 모두 맞으면 주문을 확정(결제 완료)함
// 반환: { order } 성공, { error } 실패(결제가 인정되지 않음)
// 결제 완료 화면(completePayment)과 자동 복구(reconcileOrder)가 같은 검증을 쓰도록 한 곳에 둠
exports.confirmWithPayment = async (order, impUid) => {
  const payment = await portone.getPayment(String(impUid)); // 테스트 결제는 PORTONE_INCLUDE_SANDBOX=true일 때만 조회됨
  if (!payment) return { error: '결제 내역을 확인할 수 없습니다.' };
  if (payment.merchant_uid !== order.orderNumber) return { error: '주문 정보가 결제 내역과 일치하지 않습니다.' };
  if (payment.status !== 'paid') return { error: payment.fail_reason || '결제가 완료되지 않았습니다.' };

  if (payment.amount !== order.totalPrice) {
    // 금액이 다르면 위변조로 보고 결제를 취소
    await portone.cancelPayment(payment.imp_uid, '결제 금액 불일치').catch((e) => console.error('[payment] 자동 취소 실패', e.message));
    return { error: '결제 금액이 주문 금액과 일치하지 않아 결제가 취소되었습니다.' };
  }

  order.status = 'received';
  order.payment = {
    impUid: payment.imp_uid,
    method: payment.pay_method,
    pgProvider: payment.pg_provider,
    receiptUrl: payment.receipt_url,
    paidAt: payment.paid_at ? new Date(payment.paid_at * 1000) : new Date(),
  };
  await order.save();

  // 결제가 확인되었으니 쿠폰을 사용 처리하고, 장바구니로 주문했다면 장바구니를 비움
  if (order.coupon?.userCoupon) {
    await UserCoupon.updateOne({ _id: order.coupon.userCoupon, order: order._id }, { $set: { usedAt: new Date() } });
  }
  if (order.fromCart) await Cart.updateOne({ user: order.user }, { $set: { items: [] } });

  return { order };
};

// 결제 대기(pending) 주문이 사실은 결제가 끝난 경우(결제 직후 브라우저를 닫았거나 서버 확인에 실패한 경우)를 찾아서 확정
// 결제된 주문이 취소되거나 쿠폰이 다른 주문으로 넘어가는 일을 막고, 웹훅이 없어도 스스로 복구되게 함. 확정했으면 true
exports.reconcileOrder = async (order) => {
  if (!order || order.status !== 'pending') return false;
  try {
    const impUid = await portone.findPaidImpUid(order.orderNumber);
    if (!impUid) return false;
    const result = await exports.confirmWithPayment(order, impUid);
    return !result.error;
  } catch (err) {
    console.error('[payment] 결제 상태 확인 실패', order.orderNumber, err.message);
    return false;
  }
};

// 내 결제 대기 주문 중 최근 것들을 확인해서 결제가 끝난 건 확정 (내 주문을 열 때 호출)
exports.reconcileRecentPending = async (userId) => {
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const pending = await Order.find({ user: userId, status: 'pending', createdAt: { $gte: since } }).sort({ createdAt: -1 }).limit(5);
  let confirmed = 0;
  for (const order of pending) {
    if (await exports.reconcileOrder(order)) confirmed += 1;
  }
  return confirmed;
};
