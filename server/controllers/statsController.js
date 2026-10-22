const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

const { ACTIVE_STATUSES, PAID_ORDERS } = Order;

const RECENT_LIMIT = 5;

// 주문 수와 매출 합계 (취소/환불·결제 대기 주문은 제외). since가 있으면 그 이후 결제된 주문만
const sumOrders = async (since) => {
  const match = { status: { $in: ACTIVE_STATUSES } };
  if (since) match['payment.paidAt'] = { $gte: since };

  const [row] = await Order.aggregate([{ $match: match }, { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$totalPrice' } } }]);
  return { count: row?.count ?? 0, revenue: row?.revenue ?? 0 };
};

// Admin Read: 대시보드 요약 (총 주문, 총 매출, 총 상품, 총 고객, 최근 주문)
exports.getDashboard = async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [total, today, products, customers, recent] = await Promise.all([
      sumOrders(),
      sumOrders(startOfToday),
      Product.countDocuments(),
      User.countDocuments({ user_type: 'customer' }),
      Order.find(PAID_ORDERS).sort({ createdAt: -1 }).limit(RECENT_LIMIT).populate('user', 'name'),
    ]);

    res.json({
      orders: { total: total.count, today: today.count },
      revenue: { total: total.revenue, today: today.revenue },
      products,
      customers,
      recentOrders: recent.map((o) => ({
        _id: o._id,
        orderNumber: o.orderNumber,
        customerName: o.user?.name || '(탈퇴)',
        totalPrice: o.totalPrice,
        status: o.status,
        createdAt: o.createdAt,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};
