const jwt = require('jsonwebtoken');

// Authorization: Bearer <token> 검증 후 req.auth에 { id, user_type } 저장
module.exports = (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: '로그인이 필요합니다.' });
  }

  try {
    req.auth = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ message: '유효하지 않거나 만료된 토큰입니다.' });
  }
};
