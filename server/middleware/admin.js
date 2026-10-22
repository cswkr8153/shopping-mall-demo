const User = require('../models/User');

// requireAuth 다음에 사용. 토큰이 아니라 DB의 현재 권한으로 어드민 여부를 확인
module.exports = async (req, res, next) => {
  try {
    const user = await User.findById(req.auth.id).select('user_type');
    if (!user || user.user_type !== 'admin') {
      return res.status(403).json({ message: '어드민 권한이 필요합니다.' });
    }
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};
